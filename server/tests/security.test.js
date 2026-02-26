const request = require('supertest');
const createApp = require('../src/app');

describe('Security & Middleware Tests', () => {
    const app = createApp();

    describe('Rate Limiting', () => {
        it('should have rate limit headers present on API routes', async () => {
            const res = await request(app).get('/api/loans');
            expect(res.headers).toHaveProperty('ratelimit-limit');
        });
    });

    describe('Input Validation (Joi)', () => {
        it('should return 400 for invalid registration details', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ phone: '123' }); // Invalid regex

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Validation failed');
        });
    });

    describe('Unauthorized & Forbidden Access', () => {
        it('should return 401 for protected routes without token', async () => {
            const res = await request(app).get('/api/wallet/balance');
            expect(res.status).toBe(401);
            expect(res.body.message).toBe('No authentication token provided');
        });

        it('should return 403 for insufficient permissions', async () => {
            const { createUser, createAccessToken } = require('./helpers');
            // Use 'lender' instead of 'investor' to match system categories
            const lender = await createUser({ phone: '0905554443', category: 'lender' });
            const token = createAccessToken(lender);

            const res = await request(app)
                .get('/api/wallet/revenue') // Admin only route
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Access restricted to administrators only');
        });
    });

    describe('XSS Protection', () => {
        it('should return 400 when input fails Joi validation due to XSS chars in phone', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ phone: '<script>alert(1)</script>' });

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Validation failed');
        });
    });
});
