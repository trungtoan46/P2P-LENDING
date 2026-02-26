import { LoanStatus, InvestmentStatus, UserCategory, KycStatus, TransactionType, PaymentStatus } from '../config/enums';

// User
export interface User {
    _id: string;
    phone: string;
    category: UserCategory;
    isActive: boolean;
    isVerified: boolean;
    lastLogin: string | null;
    createdAt: string;
    updatedAt: string;
}

// User Details
export interface UserDetails {
    _id: string;
    userId: string;
    name: string;
    birth: string;
    sex: 'male' | 'female';
    email: string;
    address: string;
    city: string;
    ssn: string;
    job: string;
    income: number;
    score: number;
    imageURLs: {
        frontID: string | null;
        backID: string | null;
        selfie: string | null;
    };
    kycStatus: KycStatus;
    kycRejectionReason: string | null;
    kycApprovedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

// Loan
export interface Loan {
    _id: string;
    borrowerId: string;
    capital: number;
    term: number;
    interestRate: number;
    purpose: string;
    status: LoanStatus;
    totalNotes: number;
    investedNotes: number;
    disbursementDate: string;
    maturityDate: string;
    monthlyPayment: number;
    totalInterest: number;
    totalRepayment: number;
    creditScore: number;
    approvedBy: string | null;
    approvedAt: string | null;
    rejectionReason: string | null;
    isDisbursed: boolean;
    disbursedAt: string | null;
    createdAt: string;
    updatedAt: string;
    // Virtuals & Admin only
    completionPercentage?: number;
    remainingAmount?: number;
    borrowerDetails?: UserDetails;
    investors?: Array<Investment & { investorDetails?: UserDetails }>;
}

// Investment
export interface Investment {
    _id: string;
    investorId: string;
    loanId: string;
    amount: number;
    notes: number;
    status: InvestmentStatus;
    monthlyReturn: number;
    totalReturn: number;
    grossProfit: number;
    netProfit: number;
    serviceFee: number;
    matchedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

// Transaction
export interface Transaction {
    _id: string;
    userId: string;
    type: TransactionType;
    amount: number;
    status: PaymentStatus;
    description: string;
    loanId: string | null;
    investmentId: string | null;
    referenceId: string | null;
    createdAt: string;
    updatedAt: string;
}

// Wallet
export interface Wallet {
    _id: string;
    userId: string;
    balance: number;
    frozenBalance: number;
    createdAt: string;
    updatedAt: string;
}

// API Response
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

// Pagination
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// Dashboard Stats
export interface DashboardStats {
    totalUsers: number;
    totalBorrowers: number;
    totalLenders: number;
    totalLoans: number;
    totalActiveLoans: number;
    totalInvestments: number;
    totalOutstanding: number;
    pendingKyc: number;
    pendingLoans: number;
}
