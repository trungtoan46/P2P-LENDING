const request = require('supertest');
const createApp = require('../src/app');
const { createUser, createAccessToken } = require('./helpers');

describe('Access control', () => {
    const app = createApp();

    it('blocks non-admin from accessing other user profile', async () => {
        const user = await createUser({ phone: '0903333333', category: 'borrower' });
        const token = createAccessToken(user);

        const res = await request(app)
            .get(`/api/users/${user._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });

    it('allows admin to access user profile', async () => {
        const admin = await createUser({ phone: '0904444444', category: 'admin' });
        const user = await createUser({ phone: '0905555555', category: 'borrower' });

        const token = createAccessToken(admin);
        const res = await request(app)
            .get(`/api/users/${user._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.phone).toBe(user.phone);
        expect(res.body.data.refreshToken).toBeUndefined();
    });
});
