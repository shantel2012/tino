const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const http = require('http');
const { supabase } = require('./supabase');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const realtimeRoutes = require('./routes/realtimeRoutes');
const userProfileRoutes = require('./routes/userProfileRoutes');
const parkingOwnerRoutes = require('./routes/parkingOwnerRoutes');
const mapRoutes = require('./routes/mapRoutes');
const { addUserRole, requireAdmin } = require('./middleware/roleMiddleware');
const websocketService = require('./services/websocketService');

const app = express();
app.use(cors());

// Webhook routes need to be before bodyParser.json() to get raw body
app.use('/webhooks', webhookRoutes);

app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key"; // Replace with secure secret in production

// Root route for sanity check
app.get("/", (req, res) => {
  res.send("Backend API is running");
});

// SIGNUP
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    
    // Insert new user into Supabase with default 'user' role
    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email, password: hashed, role: 'user' }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: "Failed to create user" });
    }

    res.json({ message: "User registered successfully", user: { id: data.id, name: data.name, email: data.email } });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

    const accessToken = jwt.sign({ email: user.email, id: user.id }, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ email: user.email, id: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ 
      accessToken, 
      refreshToken, 
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Middleware to verify JWT token for protected routes
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; // Attach user payload to request object
    next();
  });
}

// PARKING LOTS (protected) - accessible to all authenticated users
app.get("/parking-lots", authenticateToken, addUserRole, async (req, res) => {
  try {
    const { data: parkingLots, error } = await supabase
      .from('parking_lots')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: "Failed to fetch parking lots" });
    }

    res.json(parkingLots);
  } catch (err) {
    console.error("Parking lots error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// CREATE PARKING LOT (protected) - admin only
app.post("/parking-lots", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, location, total_spaces, price_per_hour } = req.body;
    
    if (!name || !location || !total_spaces || !price_per_hour) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const { data, error } = await supabase
      .from('parking_lots')
      .insert([{ 
        name, 
        location, 
        total_spaces, 
        available_spaces: total_spaces, 
        price_per_hour 
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: "Failed to create parking lot" });
    }

    res.json(data);
  } catch (err) {
    console.error("Create parking lot error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE PARKING LOT SPACES (protected) - admin only
app.patch("/parking-lots/:id/spaces", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { available_spaces } = req.body;

    if (available_spaces === undefined) {
      return res.status(400).json({ error: "Available spaces is required" });
    }

    const { data, error } = await supabase
      .from('parking_lots')
      .update({ available_spaces })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: "Failed to update parking lot" });
    }

    res.json(data);
  } catch (err) {
    console.error("Update parking lot error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Booking routes (protected)
app.use('/bookings', authenticateToken, addUserRole, bookingRoutes);

// Admin routes (admin only)
app.use('/admin', authenticateToken, adminRoutes);

// Payment routes (protected)
app.use('/payments', authenticateToken, addUserRole, paymentRoutes);

// Notification routes (protected)
app.use('/notifications', authenticateToken, addUserRole, notificationRoutes);

// Real-time routes (protected)
app.use('/realtime', authenticateToken, addUserRole, realtimeRoutes);

// User profile routes (protected)
app.use('/profiles', authenticateToken, addUserRole, userProfileRoutes);

// Parking owner routes (admin only)
app.use('/owners', authenticateToken, addUserRole, parkingOwnerRoutes);

// GPS mapping routes (public and protected)
app.use('/map', mapRoutes);
app.use('/map/directions', authenticateToken, addUserRole, mapRoutes);

// Create HTTP server and initialize WebSocket
const server = http.createServer(app);
websocketService.initializeWebSocket(server);

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`WebSocket server initialized for real-time updates`);
});
