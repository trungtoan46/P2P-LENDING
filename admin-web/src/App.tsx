import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { MainLayout } from './layouts';
import { ROUTES } from './config/routes';

// Features
import { DashboardPage } from './features/dashboard';
import { UsersListPage, KycApprovalPage, CustomerDetailPage } from './features/users';
import { LoansListPage, LoanDetailPage } from './features/loans';
import { TransactionsPage, FeeCollectionPage, RepaymentsPage } from './features/finance';
import { LoginPage } from './features/auth';
import { UserCategory, LoanStatus } from './config/enums';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* Login route - không cần auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes - cần auth */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route index element={<DashboardPage />} />

            {/* Customers */}
            <Route
              path={ROUTES.BORROWERS}
              element={<UsersListPage category={UserCategory.BORROWER} title="Người vay" />}
            />
            <Route
              path={ROUTES.LENDERS}
              element={<UsersListPage category={UserCategory.LENDER} title="Nhà đầu tư" />}
            />
            <Route path={ROUTES.KYC_APPROVAL} element={<KycApprovalPage />} />
            <Route path={ROUTES.USER_DETAIL} element={<CustomerDetailPage />} />

            {/* Loans */}
            <Route
              path={ROUTES.LOAN_REQUESTS}
              element={
                <LoansListPage
                  initialStatus={LoanStatus.PENDING}
                  title="Yêu cầu vay"
                  showApprovalActions
                />
              }
            />
            <Route path={ROUTES.LOAN_DETAIL} element={<LoanDetailPage />} />
            <Route
              path={ROUTES.ACTIVE_LOANS}
              element={<LoansListPage initialStatus={`${LoanStatus.APPROVED},${LoanStatus.WAITING},${LoanStatus.ACTIVE}` as any} title="Khoản vay đang hoạt động" />}
            />
            <Route
              path={ROUTES.OVERDUE_LOANS}
              element={<LoansListPage initialStatus={LoanStatus.DEFAULTED} title="Khoản vay quá hạn" />}
            />

            {/* Finance */}
            <Route path={ROUTES.TRANSACTIONS} element={<TransactionsPage />} />
            <Route path={ROUTES.REPAYMENTS} element={<RepaymentsPage />} />
            <Route path={ROUTES.FEE_COLLECTION} element={<FeeCollectionPage />} />

            {/* Settings */}
            <Route
              path={ROUTES.PRODUCT_CONFIG}
              element={<div style={{ padding: 24 }}>Trang cấu hình sản phẩm đang phát triển...</div>}
            />
          </Route>

          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
