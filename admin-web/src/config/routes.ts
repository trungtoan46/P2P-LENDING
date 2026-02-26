// Route paths
export const ROUTES = {
    // Auth
    LOGIN: '/login',

    // Dashboard
    DASHBOARD: '/',

    // Customers
    CUSTOMERS: '/customers',
    BORROWERS: '/customers/borrowers',
    LENDERS: '/customers/lenders',
    KYC_APPROVAL: '/customers/kyc-approval',
    USER_DETAIL: '/customers/:id',

    // Loans
    LOANS: '/loans',
    LOAN_REQUESTS: '/loans/requests',
    ACTIVE_LOANS: '/loans/active',
    OVERDUE_LOANS: '/loans/overdue',
    LOAN_DETAIL: '/loans/:id',

    // Finance
    FINANCE: '/finance',
    TRANSACTIONS: '/finance/transactions',
    REPAYMENTS: '/finance/repayments',
    FEE_COLLECTION: '/finance/fees',


    // Settings
    SETTINGS: '/settings',
    PRODUCT_CONFIG: '/settings/products',
} as const;
