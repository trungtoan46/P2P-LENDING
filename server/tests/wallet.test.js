const request = require('supertest');
const createApp = require('../src/app');
const Wallet = require('../src/models/Wallet');
const { createUser, createAccessToken } = require('./helpers');

describe('Wallet API Integration Tests', () => {
    const app = createApp();

    it('should return initial balance of 0 for a new user', async () => {
        const user = await createUser({ phone: '0901112223', category: 'borrower' });
        await Wallet.create({ userId: user._id, balance: 0, lockedBalance: 0 });
        const token = createAccessToken(user);

        const res = await request(app)
            .get('/api/wallet/balance')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.balance).toBe(0);
    });
});
