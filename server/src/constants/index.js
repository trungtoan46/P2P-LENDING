/**
 * @description Business Constants and Configuration Values
 */

// Regular Expressions for Validation
const genderRegex = ['male', 'female'];
const phoneRegex = /^(\+84|0)(3|5|7|8|9)[0-9]{8}$/;
const ssnRegex = /^(\d{9}|\d{12})$/;
const userCategoryRegex = ['lender', 'borrower', 'admin', 'both'];

// User Categories
const BORROWER = 'borrower';
const LENDER = 'lender';
const ADMIN = 'admin';
const BOTH = 'both';

// HTTP Response Status Codes
const SUCCESS_CODE = 200;
const CREATED_CODE = 201;
const BAD_REQUEST_CODE = 400;
const UNAUTHORIZED_CODE = 401;
const FORBIDDEN_CODE = 403;
const NOT_FOUND_CODE = 404;
const SERVER_ERROR_CODE = 500;
const SERVICE_UNAVAILABLE_CODE = 503;

// Financial Business Logic Constants
const BASE_UNIT_PRICE = 50 * Math.pow(10, 4);        // 500,000 VND
const CAPITAL_COEFFICIENT = 2 * Math.pow(10, -8);    // Tăng nhẹ lại trọng số Khoản vay
const DEFAULT_CREDIT_SCORE = 580;
const FACTOR_CONSTANT = 35;                          // Mở rộng mẫu số để làm mượt dải phân phối lãi suất
const FICO_COEFFICIENT = 0.012;                      // Giảm nhẹ sức nặng của FICO
const MONTH_COEFFICIENT = 1 / 12;
const MAX_CAPITAL = 50 * Math.pow(10, 6);            // 50,000,000 VND
const MIN_CAPITAL = 1 * Math.pow(10, 6);             // 1,000,000 VND
const MAX_PERIOD_MONTHS = 18;
const MIN_PERIOD_MONTHS = 1;
const INVESTING_STAGE_DAYS = 10;
const SERVICE_FEE = 0.01;                              // 1%
const SETTLEMENT_DAY_GAP = 5;
const MAX_ACTIVE_LOAN_COUNT = 5;
const PENALTY_PRINCIPAL_FACTOR = 1.5;                  // 150% lãi suất trong hạn
const PENALTY_INTEREST_RATE = 0.1;                     // 10%/năm cho lãi chậm trả

// Loan Status
const LOAN_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    ACTIVE: 'active',
    WAITING_SIGNATURE: 'waiting_signature',
    WAITING: 'waiting',
    SUCCESS: 'success',
    COMPLETED: 'completed',
    DEFAULTED: 'defaulted',
    CLEAN: 'clean',
    FAIL: 'fail',
    CURRENT: 'current',
    ALL: 'all'
};

// Investment Status
const INVESTMENT_STATUS = {
    PENDING: 'pending',
    ACTIVE: 'active',
    WAITING_OTHER: 'waiting_other',
    WAITING_TRANSFER: 'waiting_transfer',
    FAIL_TRANSFER: 'fail_transfer',
    SUCCESS: 'success',
    COMPLETED: 'completed',
    CLEAN: 'clean',
    FAIL: 'fail',
    ALL: 'all'
};

// Settlement Status
const SETTLEMENT_STATUS = {
    UNDUE: 'undue',
    DUE: 'due',
    SETTLED: 'settled',
    OVERDUE: 'overdue',
    ALL: 'all'
};

// Escrow Status
const ESCROW_STATUS = {
    WAITING: 'waiting',
    SUCCESS: 'success',
    CLEAN: 'clean',
    FAIL: 'fail',
    CANCELLED: 'cancelled'
};

// Payment Status
const PAYMENT_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

// Transaction Types
const TRANSACTION_TYPES = {
    DEPOSIT: 'deposit',
    WITHDRAW: 'withdraw',
    LOAN_DISBURSEMENT: 'loan_disbursement',
    INVESTMENT: 'investment',
    REPAYMENT: 'repayment',
    SETTLEMENT: 'settlement',
    FEE: 'fee',
    REFUND: 'refund'
};

// KYC Status
const KYC_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
};

// Image Configuration
const IMAGE_EXTENSIONS = ['image/jpeg', 'image/png', 'image/jpg'];
const REQUIRED_IMAGE_FILES = 3;

// Time Constants
const ONE_DAY_MILLISECONDS = 1000 * 60 * 60 * 24;
const VERIFY_CODE_LENGTH = 6;

// Auth Token
const AUTH_TOKEN_HEADER = 'x-auth';
const DEFAULT_RESPONSE_DATA = 'ok';

module.exports = {
    // Regex
    genderRegex,
    phoneRegex,
    ssnRegex,
    userCategoryRegex,

    // User Categories
    BORROWER,
    LENDER,
    ADMIN,
    BOTH,

    // HTTP Codes
    SUCCESS_CODE,
    CREATED_CODE,
    BAD_REQUEST_CODE,
    UNAUTHORIZED_CODE,
    FORBIDDEN_CODE,
    NOT_FOUND_CODE,
    SERVER_ERROR_CODE,
    SERVICE_UNAVAILABLE_CODE,

    // Financial Constants
    BASE_UNIT_PRICE,
    CAPITAL_COEFFICIENT,
    DEFAULT_CREDIT_SCORE,
    FACTOR_CONSTANT,
    FICO_COEFFICIENT,
    MONTH_COEFFICIENT,
    MAX_CAPITAL,
    MIN_CAPITAL,
    MAX_PERIOD_MONTHS,
    MIN_PERIOD_MONTHS,
    INVESTING_STAGE_DAYS,
    SERVICE_FEE,
    SETTLEMENT_DAY_GAP,
    MAX_ACTIVE_LOAN_COUNT,
    PENALTY_PRINCIPAL_FACTOR,
    PENALTY_INTEREST_RATE,

    // Status Objects
    LOAN_STATUS,
    INVESTMENT_STATUS,
    SETTLEMENT_STATUS,
    ESCROW_STATUS,
    PAYMENT_STATUS,
    TRANSACTION_TYPES,
    KYC_STATUS,

    // Image Config
    IMAGE_EXTENSIONS,
    REQUIRED_IMAGE_FILES,

    // Time Constants
    ONE_DAY_MILLISECONDS,
    VERIFY_CODE_LENGTH,

    // Auth
    AUTH_TOKEN_HEADER,
    DEFAULT_RESPONSE_DATA
};
