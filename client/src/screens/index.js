/**
 * Screens Index - Export tất cả screens
 */

// Auth
export { LoginScreen, RegisterScreen, OTPScreen } from './auth';

// Home
export { HomeScreen, BorrowerDashboard, LenderDashboard } from './home';

// Loans
export { LoansListScreen, CreateLoanScreen, LoanPreviewScreen, LoanDetailScreen, DisbursementMethodScreen } from './loans';

// Investments
export { InvestmentsScreen, RepaymentScheduleScreen, AutoInvestScreen, CreateAutoInvestScreen, WaitingRoomScreen } from './investments';

// Wallet
export { default as WalletScreen } from './wallet/WalletScreen';

// Payments
export { PaymentsScreen } from './payments';

// Profile
export { ProfileScreen, EkycScreen } from './profile';

// Others
export { default as ReminderScreen } from './reminders/ReminderScreen';
export { default as NotificationsScreen } from './notifications/NotificationsScreen';
