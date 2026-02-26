const request = require('supertest');
const createApp = require('../src/app');
const OTP = require('../src/models/OTP');

describe('Auth API', () => {
    const app = createApp();

    it('registers, verifies OTP, and logs in', async () => {
        const phone = '0901234567';
        const password = 'Password123';

        const registerRes = await request(app)
            .post('/api/auth/register')
            .send({ phone });

        expect(registerRes.status).toBe(200);
        expect(registerRes.body.success).toBe(true);

        const otp = await OTP.findOne({ phone });
        expect(otp).toBeTruthy();

        const verifyRes = await request(app)
            .post('/api/auth/verify-otp')
            .send({
                phone,
                code: otp.code,
                password,
                category: 'borrower'
            });

        expect(verifyRes.status).toBe(201);
        expect(verifyRes.body.success).toBe(true);
        expect(verifyRes.body.data.user.phone).toBe(phone);
        expect(verifyRes.body.data.token).toBeTruthy();
        expect(verifyRes.body.data.refreshToken).toBeTruthy();

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ phone, password });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body.success).toBe(true);
        expect(loginRes.body.data.token).toBeTruthy();
        expect(loginRes.body.data.refreshToken).toBeTruthy();
    });

    it('refreshes token with valid refresh token', async () => {
        const phone = '0902234567';
        const password = 'Password123';

        await request(app)
            .post('/api/auth/register')
            .send({ phone });

        const otp = await OTP.findOne({ phone });

        await request(app)
            .post('/api/auth/verify-otp')
            .send({
                phone,
                code: otp.code,
                password,
                category: 'borrower'
            });

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ phone, password });

        const refreshRes = await request(app)
            .post('/api/auth/refresh-token')
            .send({ refreshToken: loginRes.body.data.refreshToken });

        expect(refreshRes.status).toBe(200);
        expect(refreshRes.body.success).toBe(true);
        expect(refreshRes.body.data.token).toBeTruthy();
        expect(refreshRes.body.data.refreshToken).toBeTruthy();
    });

    it('requires auth for change password', async () => {
        const res = await request(app)
            .post('/api/auth/change-password')
            .send({ oldPassword: 'old', newPassword: 'new' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });
});
