const request = require('supertest');
const createApp = require('../src/app');
const Loan = require('../src/models/Loan');
const { LOAN_STATUS } = require('../src/constants');
const { createUser, createAccessToken } = require('./helpers');

describe('Loan API', () => {
    const app = createApp();

    const buildLoan = async (borrowerId) => {
        return Loan.create({
            borrowerId,
            capital: 10000000,
            term: 6,
            interestRate: 0.05,
            purpose: 'Vay kinh doanh cafe',
            status: LOAN_STATUS.APPROVED,
            totalNotes: 20,
            investedNotes: 0,
            disbursementDate: new Date(),
            maturityDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
            monthlyPayment: 2000000,
            totalInterest: 200000,
            totalRepayment: 10200000,
            creditScore: 650,
            bankAccountNumber: '123456789',
            walletAccountNumber: 'WALLET-001',
            bankAccountHolderName: 'Test User'
        });
    };

    it('hides sensitive fields for public loan detail', async () => {
        const borrower = await createUser({ phone: '0906666666', category: 'borrower' });
        const loan = await buildLoan(borrower._id);

        const res = await request(app)
            .get(`/api/loans/${loan._id}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.bankAccountNumber).toBeUndefined();
        expect(res.body.data.walletAccountNumber).toBeUndefined();
        expect(res.body.data.bankAccountHolderName).toBeUndefined();
        expect(res.body.data.borrowerId.phone).toContain('****');
    });

    it('returns full loan data for admin', async () => {
        const borrower = await createUser({ phone: '0907777777', category: 'borrower' });
        const admin = await createUser({ phone: '0908888888', category: 'admin' });
        const loan = await buildLoan(borrower._id);

        const token = createAccessToken(admin);
        const res = await request(app)
            .get(`/api/loans/${loan._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.bankAccountNumber).toBe('123456789');
        expect(res.body.data.borrowerId.phone).toBe(borrower.phone);
    });

    it('masks borrower phone in loan list', async () => {
        const borrower = await createUser({ phone: '0909999999', category: 'borrower' });
        await buildLoan(borrower._id);

        const res = await request(app)
            .get('/api/loans');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].borrowerId.phone).toContain('****');
        expect(res.body.data[0].bankAccountNumber).toBeUndefined();
    });
});
