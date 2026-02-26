const {
    calculateInterestRate,
    calculateMonthlyPayment,
    calculateTotalInterest,
    calculateInvestmentReturns,
    calculateNotes,
    sanitizeUser
} = require('../src/utils/helpers');

describe('P2P Lending Core Financial Logic Tests', () => {

    describe('1. calculateInterestRate()', () => {
        it('should calculate correct interest rate for GOOD credit score', () => {
            const rate = calculateInterestRate(800, 10000000, 12);
            expect(rate).toBeGreaterThanOrEqual(0.08);
            expect(rate).toBeLessThanOrEqual(0.18);
        });

        it('should floor/cap interest rates correctly', () => {
            // Excellent score should floor to 8%
            expect(calculateInterestRate(850, 1000000, 1)).toBe(0.08);
            // Poor score with large amount should cap to 18%
            expect(calculateInterestRate(300, 50000000, 36)).toBe(0.18);
        });
    });

    describe('2. calculateMonthlyPayment()', () => {
        it('should calculate correct monthly payment', () => {
            const monthlyPayment = calculateMonthlyPayment(10000000, 0.12, 12);
            expect(monthlyPayment).toBeGreaterThan(833333);
            expect(monthlyPayment).toBeLessThan(1000000);
        });

        it('should handle zero interest rate', () => {
            expect(calculateMonthlyPayment(12000000, 0, 12)).toBe(1000000);
        });
    });

    describe('3. calculateInvestmentReturns()', () => {
        it('should calculate correct returns and fees', () => {
            const returns = calculateInvestmentReturns(10000000, 0.12, 12);
            expect(returns.totalReturn).toBeGreaterThan(10000000);
            const diff = Math.abs(returns.netProfit + returns.serviceFee - returns.grossProfit);
            expect(diff).toBeLessThanOrEqual(1);
        });
    });

    describe('4. Utility Functions', () => {
        it('should calculate notes correctly', () => {
            expect(calculateNotes(1000000)).toBe(2);
            expect(calculateNotes(700000)).toBe(2);
        });

        it('should sanitize user object', () => {
            const raw = { phone: '123', password: 'pw', refreshToken: 'rt', __v: 0, ok: true };
            const clean = sanitizeUser(raw);
            expect(clean.password).toBeUndefined();
            expect(clean.refreshToken).toBeUndefined();
            expect(clean.ok).toBe(true);
        });
    });
});
