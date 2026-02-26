import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TransactionDetail from './pages/TransactionDetail';
import BlockDetail from './pages/BlockDetail';
import AssetHistory from './pages/AssetHistory';
import BlocksPage from './pages/BlocksPage';
import TransactionsPage from './pages/TransactionsPage';
import LoansPage from './pages/LoansPage';
import LoanDetail from './pages/LoanDetail';
import SearchResultsPage from './pages/SearchResultsPage';
import Footer from './components/layout/Footer';

function App() {
  return (
    <div className="min-h-screen bg-dark-900 flex flex-col font-sans">
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/blocks" element={<BlocksPage />} />
          <Route path="/blocks/:blockNumber" element={<BlockDetail />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/transactions/:txId" element={<TransactionDetail />} />
          <Route path="/history/:key" element={<AssetHistory />} />
          <Route path="/loans" element={<LoansPage />} />
          <Route path="/loans/:id" element={<LoanDetail />} />
        </Routes>
        <Footer />
      </Router>
    </div>
  );
}

export default App;
