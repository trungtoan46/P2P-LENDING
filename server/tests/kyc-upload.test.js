const request = require('supertest');
const createApp = require('../src/app');
const { createUser, createUserDetails, createAccessToken } = require('./helpers');

describe('KYC upload', () => {
    const app = createApp();

    it('uploads KYC images successfully', async () => {
        const user = await createUser({ phone: '0910000000', category: 'borrower' });
        await createUserDetails(user._id, { ssn: '123456780' });
        const token = createAccessToken(user);

        const fileBuffer = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
        ]);

        const res = await request(app)
            .post('/api/users/kyc/upload')
            .set('Authorization', `Bearer ${token}`)
            .attach('frontID', fileBuffer, { filename: 'front.png', contentType: 'image/png' })
            .attach('backID', fileBuffer, { filename: 'back.png', contentType: 'image/png' })
            .attach('selfie', fileBuffer, { filename: 'selfie.png', contentType: 'image/png' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.imageURLs.frontID).toBeTruthy();
        expect(res.body.data.imageURLs.backID).toBeTruthy();
        expect(res.body.data.imageURLs.selfie).toBeTruthy();
    });
});
