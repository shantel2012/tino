import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Connect to Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.get('/', (req, res) => res.send('Backend running!'));

// API to fetch parking lots
app.get('/parking-lots', async (req, res) => {
  const { data, error } = await supabase.from('parking_lots').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));
