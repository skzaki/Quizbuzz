import request from 'supertest';
import app from '../app.js';
import mongoose from 'mongoose';
import redisClient from '../redis.js';

describe('Health Check API', () => {
    // Basic stub test for CI/CD pipeline
    it('should return 200 for health check', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'healthy');
    });

    it('should return 404 for non-existent routes', async () => {
        const res = await request(app).get('/api/non-existent-route');
        expect(res.statusCode).toEqual(404);
        expect(res.body.success).toBe(false);
    });
});

// Cleanup after all tests
afterAll(async () => {
    // Close MongoDB connection
    await mongoose.connection.close();
    // Close Redis connection
    if (redisClient.isOpen) {
        await redisClient.quit();
    }
});
