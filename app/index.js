const express = require('express');
const axios = require('axios');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8080;

// PostgreSQL connection config
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/checkout'
});

let isDbConnected = false;
async function initializeDatabase() {
  const maxRetries = 10;
  let retries = 0;
  while (retries < maxRetries) {
    try {
      // Attempt connection and verify structure
      const client = await dbPool.connect();
      isDbConnected = true;
      console.log('Connected to PostgreSQL database');
      
      // Create schema table if not exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          item VARCHAR(255) NOT NULL,
          price NUMERIC(10, 2) NOT NULL,
          payment_status VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      client.release();
      break;
    } catch (err) {
      retries++;
      console.error(`Database connection attempt ${retries}/${maxRetries} failed. Retrying in 2 seconds...`, err.message);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  if (!isDbConnected) {
    console.error('Database connection permanently failed. Standalone mock mode active.');
  }
}
initializeDatabase();


app.get('/', (req, res) => {
  res.json({ message: 'E-commerce Checkout Service Active' });
});

// Endpoint that processes order, saves to DB, and calls external payment gateway
app.get('/order', async (req, res) => {
  const { item, price } = req.query;
  if (!item || !price) {
    return res.status(400).json({ error: 'Missing item or price parameters' });
  }

  let paymentStatus = 'failed';
  
  try {
    // 1. Contact external Payment gateway (httpbin mock)
    console.log('Calling Payment Gateway...');
    const paymentResponse = await axios.post('https://httpbin.org/post', {
      amount: price,
      currency: 'usd',
      gateway: 'stripe-mock'
    });

    if (paymentResponse.status === 200) {
      paymentStatus = 'paid';
    }
  } catch (err) {
    console.error('Payment gateway call failed:', err.message);
    return res.status(502).json({ error: 'Payment gateway connection refused' });
  }

  // 2. Save order details to PostgreSQL
  if (isDbConnected) {
    try {
      const result = await dbPool.query(
        'INSERT INTO orders (item, price, payment_status) VALUES ($1, $2, $3) RETURNING *',
        [item, parseFloat(price), paymentStatus]
      );
      return res.json({ status: 'Order Processed', order: result.rows[0] });
    } catch (dbErr) {
      console.error('DB Insert failed:', dbErr.message);
      return res.status(500).json({ error: 'Failed to write order data' });
    }
  }

  res.json({ status: 'Processed (Mock mode)', order: { item, price, paymentStatus } });
});

// Read order history from DB
app.get('/history', async (req, res) => {
  if (!isDbConnected) {
    return res.status(500).json({ error: 'Database service unavailable' });
  }

  try {
    const result = await dbPool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10');
    res.json({ count: result.rowCount, orders: result.rows });
  } catch (err) {
    console.error('DB Query failed:', err.message);
    res.status(500).json({ error: 'Failed to read order history' });
  }
});

// Clean Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing DB Pool...');
  await dbPool.end();
  process.exit(0);
});

const server = app.listen(PORT, () => {
  console.log(`Checkout Service running on port ${PORT}`);
});

module.exports = { app, dbPool, server };
