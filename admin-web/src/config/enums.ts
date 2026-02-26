// Loan Status
export enum LoanStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    ACTIVE = 'active',
    WAITING_SIGNATURE = 'waiting_signature',
    WAITING = 'waiting',
    SUCCESS = 'success',
    COMPLETED = 'completed',
    DEFAULTED = 'defaulted',
    CLEAN = 'clean',
    FAIL = 'fail',
}

// Investment Status
export enum InvestmentStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    WAITING_OTHER = 'waiting_other',
    WAITING_TRANSFER = 'waiting_transfer',
    FAIL_TRANSFER = 'fail_transfer',
    SUCCESS = 'success',
    COMPLETED = 'completed',
    CLEAN = 'clean',
    FAIL = 'fail',
}

// User Category
export enum UserCategory {
    BORROWER = 'borrower',
    LENDER = 'lender',
    ADMIN = 'admin',
    BOTH = 'both',
}

// KYC Status
export enum KycStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

// Transaction Types
export enum TransactionType {
    DEPOSIT = 'deposit',
    WITHDRAW = 'withdraw',
    LOAN_DISBURSEMENT = 'loan_disbursement',
    INVESTMENT = 'investment',
    REPAYMENT = 'repayment',
    SETTLEMENT = 'settlement',
    FEE = 'fee',
    REFUND = 'refund',
}

// Payment Status
export enum PaymentStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}
