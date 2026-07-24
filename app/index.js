    const express = require('express');
    const axios = require('axios');
    const { createClient } = require('redis');
    
    const app = express();
    const PORT = process.env.PORT || 8080;
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Initialize Redis Client
    const redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    
    let isRedisConnected = false;
    async function connectRedis() {
      try {
        await redisClient.connect();
        isRedisConnected = true;
        console.log('Connected to Redis');
      } catch (err) {
        console.log('Note: Redis not available. Running in standalone mode.');
      }
    }
    connectRedis();
    
    app.get('/', (req, res) => {
      res.json({ message: 'Welcome to the eBPF Profiling App!' });
    });
    
    // Endpoint connecting to internal Redis DB
    app.get('/store', async (req, res) => {
      if (!isRedisConnected) {
        return res.status(500).json({ error: 'Redis client not connected' });
      }
      const { key, value } = req.query;
      if (!key || !value) {
        return res.status(400).json({ error: 'Missing key or value query parameter' });
      }
      await redisClient.set(key, value);
      res.json({ status: 'stored', key, value });
    });
    
    app.get('/fetch', async (req, res) => {
      if (!isRedisConnected) {
        return res.status(500).json({ error: 'Redis client not connected' });
      }
      const { key } = req.query;
      if (!key) {
        return res.status(400).json({ error: 'Missing key query parameter' });
      }
      const value = await redisClient.get(key);
      res.json({ key, value });
    });
    
    // Endpoint making an external API call
    app.get('/external', async (req, res) => {
      try {
        const response = await axios.get('https://httpbin.org/get');
        res.json({ data: response.data.url });
      } catch (err) {
        res.status(500).json({ error: 'Failed to contact external API', details: err.message });
      }
    });
    
    // Graceful Shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Cleaning up...');
      if (isRedisConnected) {
        await redisClient.quit();
      }
      process.exit(0);
    });
    
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
    module.exports = { app, redisClient, server };
