# Payment Integration System Documentation

## Overview
The Payment Integration system provides secure payment processing for parking reservations using Stripe. It handles payment intents, confirmations, refunds, webhooks, and receipt generation.

## Features
- ✅ **Stripe Integration** - Secure payment processing
- ✅ **Payment Intents** - Modern payment flow with 3D Secure support
- ✅ **Automatic Receipts** - Generated for successful payments
- ✅ **Refund Processing** - Full and partial refunds with business rules
- ✅ **Webhook Handling** - Real-time payment status updates
- ✅ **Payment History** - Complete transaction tracking
- ✅ **Security** - PCI-compliant payment handling

## Database Schema

### Payments Table
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id),
    user_id UUID REFERENCES users(id),
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50) DEFAULT 'card',
    failure_reason TEXT,
    refund_amount DECIMAL(10,2) DEFAULT 0,
    refund_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE
);
```

### Payment Methods Table
```sql
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    stripe_payment_method_id VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'card',
    card_brand VARCHAR(20),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Payment Receipts Table
```sql
CREATE TABLE payment_receipts (
    id UUID PRIMARY KEY,
    payment_id UUID REFERENCES payments(id),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    receipt_url TEXT,
    receipt_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Bookings Table Updates
```sql
-- Added payment_status column
ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid' 
CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'failed'));
```

## API Endpoints

All payment endpoints require JWT authentication via the `Authorization: Bearer <token>` header.

### 1. Create Payment Intent
**POST** `/payments/create-payment-intent`

**Request Body:**
```json
{
  "booking_id": "booking-uuid",
  "payment_method_id": "pm_1234567890" // Optional
}
```

**Response:**
```json
{
  "payment_intent": {
    "id": "pi_1234567890",
    "client_secret": "pi_1234567890_secret_abcd",
    "status": "requires_payment_method"
  },
  "payment": {
    "id": "payment-uuid",
    "booking_id": "booking-uuid",
    "amount": 25.00,
    "status": "pending",
    "created_at": "2024-01-15T10:00:00Z"
  },
  "booking": {
    "id": "booking-uuid",
    "total_cost": 25.00,
    "parking_lots": {
      "name": "Downtown Parking",
      "location": "123 Main St"
    }
  }
}
```

### 2. Confirm Payment
**POST** `/payments/confirm-payment`

**Request Body:**
```json
{
  "payment_intent_id": "pi_1234567890"
}
```

**Response:**
```json
{
  "payment": {
    "id": "payment-uuid",
    "status": "succeeded",
    "paid_at": "2024-01-15T10:05:00Z",
    "stripe_charge_id": "ch_1234567890"
  },
  "stripe_status": "succeeded"
}
```

### 3. Get Payment History
**GET** `/payments/history?page=1&limit=10&status=succeeded`

**Query Parameters:**
- `page` (optional): Page number for pagination
- `limit` (optional): Number of payments per page
- `status` (optional): Filter by payment status

**Response:**
```json
{
  "payments": [
    {
      "id": "payment-uuid",
      "amount": 25.00,
      "status": "succeeded",
      "paid_at": "2024-01-15T10:05:00Z",
      "bookings": {
        "id": "booking-uuid",
        "start_time": "2024-01-15T14:00:00Z",
        "end_time": "2024-01-15T16:00:00Z",
        "parking_lots": {
          "name": "Downtown Parking",
          "location": "123 Main St"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### 4. Get Payment Details
**GET** `/payments/:payment_id`

**Response:**
```json
{
  "id": "payment-uuid",
  "amount": 25.00,
  "status": "succeeded",
  "paid_at": "2024-01-15T10:05:00Z",
  "stripe_payment_intent_id": "pi_1234567890",
  "bookings": {
    "id": "booking-uuid",
    "start_time": "2024-01-15T14:00:00Z",
    "end_time": "2024-01-15T16:00:00Z",
    "parking_lots": {
      "name": "Downtown Parking",
      "location": "123 Main St"
    }
  },
  "payment_receipts": [
    {
      "receipt_number": "RCP-1705320000-12345678",
      "receipt_url": "https://example.com/receipts/..."
    }
  ]
}
```

### 5. Process Refund
**POST** `/payments/:payment_id/refund`

**Request Body:**
```json
{
  "amount": 12.50, // Optional, defaults to full amount
  "reason": "Customer requested cancellation"
}
```

**Response:**
```json
{
  "payment": {
    "id": "payment-uuid",
    "status": "refunded",
    "refund_amount": 12.50,
    "refunded_at": "2024-01-15T11:00:00Z"
  },
  "refund": {
    "id": "re_1234567890",
    "amount": 12.50,
    "status": "succeeded",
    "reason": "requested_by_customer"
  }
}
```

### 6. Stripe Webhook
**POST** `/webhooks/stripe`

This endpoint handles Stripe webhooks for real-time payment updates. It's called automatically by Stripe and doesn't require authentication.

**Supported Events:**
- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed
- `refund.created` - Refund processed

## Payment Flow

### Standard Payment Flow
1. **User creates booking** - Booking created with `payment_status: 'unpaid'`
2. **Create payment intent** - Call `/payments/create-payment-intent`
3. **Frontend payment** - Use Stripe.js to collect payment details
4. **Confirm payment** - Call `/payments/confirm-payment` or handle via webhook
5. **Update booking** - Booking status updated to `payment_status: 'paid'`
6. **Generate receipt** - Automatic receipt generation

### Refund Flow
1. **User requests refund** - Within allowed timeframe (2+ hours before start)
2. **Process refund** - Call `/payments/:id/refund`
3. **Stripe processing** - Refund processed through Stripe
4. **Update records** - Payment and booking status updated
5. **Release space** - Parking space made available again

## Business Rules

### Payment Validation
- **Booking exists** and belongs to the user
- **Booking is active** (not cancelled or completed)
- **Not already paid** for the booking
- **Amount matches** booking total cost

### Refund Rules
- **Payment must be successful** before refunding
- **Minimum notice period** - 2 hours before booking start time
- **Full or partial refunds** supported
- **Automatic space release** when refunded

### Security Rules
- **User can only pay** for their own bookings
- **Stripe webhook validation** with signature verification
- **Idempotent operations** prevent duplicate payments
- **PCI compliance** through Stripe integration

## Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend URL for redirects
FRONTEND_URL=http://localhost:3000
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install stripe
```

### 2. Run Database Migration
Execute the SQL migration file in your Supabase database:
```sql
-- Run migrations/create_payments_table.sql
```

### 3. Configure Stripe
1. **Create Stripe account** at https://stripe.com
2. **Get API keys** from Stripe Dashboard
3. **Set up webhook endpoint** pointing to `/webhooks/stripe`
4. **Configure webhook events**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `refund.created`

### 4. Update Environment Variables
```env
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
FRONTEND_URL=http://localhost:3000
```

## Frontend Integration

### Basic Payment Flow (JavaScript)
```javascript
// 1. Create payment intent
const response = await fetch('/payments/create-payment-intent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    booking_id: 'booking-uuid'
  })
});

const { payment_intent } = await response.json();

// 2. Use Stripe.js to handle payment
const stripe = Stripe('pk_test_...');
const { error } = await stripe.confirmCardPayment(
  payment_intent.client_secret,
  {
    payment_method: {
      card: cardElement,
      billing_details: {
        name: 'Customer Name'
      }
    }
  }
);

// 3. Handle result
if (error) {
  console.error('Payment failed:', error);
} else {
  console.log('Payment succeeded!');
  // Redirect to success page
}
```

## Testing

### Test with Stripe Test Cards
```javascript
// Successful payment
const testCard = '4242424242424242';

// Declined payment
const declinedCard = '4000000000000002';

// 3D Secure required
const threeDSecureCard = '4000002500003155';
```

### Test Payment Flow
```bash
# 1. Create a booking first
curl -X POST http://localhost:4000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{
    "parking_lot_id": "lot-uuid",
    "start_time": "2024-01-15T14:00:00Z",
    "end_time": "2024-01-15T16:00:00Z"
  }'

# 2. Create payment intent
curl -X POST http://localhost:4000/payments/create-payment-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{
    "booking_id": "booking-uuid"
  }'

# 3. Get payment history
curl -X GET http://localhost:4000/payments/history \
  -H "Authorization: Bearer USER_TOKEN"
```

## Error Handling

### Common Error Responses
- `400 Bad Request` - Invalid request data or business rule violation
- `401 Unauthorized` - Missing or invalid JWT token
- `404 Not Found` - Booking or payment not found
- `409 Conflict` - Payment already exists or booking already paid
- `500 Internal Server Error` - Server or Stripe API error

### Example Error Response
```json
{
  "error": "Booking is already paid"
}
```

## Monitoring and Analytics

### Payment Metrics to Track
- **Payment success rate** - Percentage of successful payments
- **Average transaction value** - Mean payment amount
- **Refund rate** - Percentage of payments refunded
- **Payment method distribution** - Card types used
- **Failed payment reasons** - Common failure causes

### Admin Dashboard Queries
```sql
-- Payment success rate
SELECT 
  COUNT(CASE WHEN status = 'succeeded' THEN 1 END) * 100.0 / COUNT(*) as success_rate
FROM payments 
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Revenue by day
SELECT 
  DATE(paid_at) as date,
  SUM(amount) as daily_revenue
FROM payments 
WHERE status = 'succeeded' 
  AND paid_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(paid_at)
ORDER BY date;
```

## Security Best Practices

### PCI Compliance
- **Never store card data** - Use Stripe's secure vaults
- **Use HTTPS** for all payment-related endpoints
- **Validate webhook signatures** to prevent tampering
- **Log payment events** for audit trails

### Data Protection
- **Encrypt sensitive data** in database
- **Limit payment data access** to authorized users only
- **Regular security audits** of payment flows
- **Monitor for suspicious activity**

## Future Enhancements

### Planned Features
- **Saved payment methods** - Store customer cards securely
- **Subscription billing** - Monthly parking passes
- **Split payments** - Multiple payment methods
- **Apple Pay / Google Pay** - Mobile wallet integration
- **International payments** - Multi-currency support
- **Payment plans** - Installment payments

### Integration Points
- **Email receipts** - Automatic receipt delivery
- **SMS notifications** - Payment confirmations
- **Accounting integration** - Export to accounting systems
- **Loyalty programs** - Points and rewards
- **Dynamic pricing** - Peak hour pricing adjustments
