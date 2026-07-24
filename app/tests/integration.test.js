    const request = require('supertest');
    const { app, redisClient, server } = require('../index');

    beforeAll(async () => {
      // Wait a moment for Redis to attempt connection
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    afterAll(async () => {
      // Close connections cleanly so test runner exits
      try {
        if (redisClient.isOpen) {
          await redisClient.quit();
        }
      } catch (err) {
        console.error('Error closing Redis connection during test cleanup', err);
      }
      await new Promise((resolve) => server.close(resolve));
    });

    describe('Integration Tests', () => {
      it('should return homepage message', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toContain('Welcome');
      });

      it('should store and fetch keys from Redis', async () => {
        if (!redisClient.isOpen) {
          console.warn('Skipping Redis integration test: Redis connection not open.');
          return;
        }
        
        const storeRes = await request(app).get('/store?key=testkey&value=testvalue');
        expect(storeRes.statusCode).toEqual(200);
        
        const fetchRes = await request(app).get('/fetch?key=testkey');
        expect(fetchRes.statusCode).toEqual(200);
        expect(fetchRes.body.value).toEqual('testvalue');
      });

      it('should successfully make an external API call', async () => {
        const res = await request(app).get('/external');
        expect(res.statusCode).toEqual(200);
      });
    });
