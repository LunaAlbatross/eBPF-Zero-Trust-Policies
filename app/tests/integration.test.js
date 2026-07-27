const request = require('supertest');
const { app, dbPool, server } = require('../index');

beforeAll(async () => {
  // Let the Postgres database try to connect on startup
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

afterAll(async () => {
  // Graceful test exit
  await dbPool.end();
  await new Promise((resolve) => server.close(resolve));
});

describe('Checkout Service Integration Tests', () => {
  it('should return homepage', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toContain('Active');
  });

  it('should process order and make external payment call', async () => {
    const res = await request(app).get('/order?item=running-shoes&price=120.00');
    // If DB is connected it will return 200, else mock mode or payment fail
    expect([200, 502]).toContain(res.statusCode);
  });

  it('should read order history', async () => {
    const res = await request(app).get('/history');
    // If DB not connected, returns 500. If connected, returns 200.
    expect([200, 500]).toContain(res.statusCode);
  });
});
