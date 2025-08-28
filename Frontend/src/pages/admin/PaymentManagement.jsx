import { CreditCard, Download } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';

import ErrorBoundary from '../../components/ErrorBoundary';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const PaymentTable = lazy(() => import('./../../components/PaymentManagement/PaymentTable'));
const PaymentFilters = lazy(() => import('../../components/PaymentManagement/PaymentFilters'));
const PaymentStats = lazy(() => import('../../components/PaymentManagement/PaymentStats'));
const PaymentSummary = lazy(() => import('../../components/PaymentManagement/PaymentSummary'));

const PaymentManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [contestFilter, setContestFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [payments, setPayments] = useState([]);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mock data - Replace with actual API calls
  const mockPayments = [
    {
      id: '1',
      userId: '1',
      userName: 'John Doe',
      userEmail: 'john@example.com',
      contestId: '1',
      contestTitle: 'JavaScript Fundamentals',
      amount: 25,
      status: 'completed',
      transactionId: 'txn_1234567890',
      paymentMethod: 'Credit Card',
      createdAt: '2024-01-20T10:30:00',
      completedAt: '2024-01-20T10:31:00'
    },
    {
      id: '2',
      userId: '2',
      userName: 'Jane Smith',
      userEmail: 'jane@example.com',
      contestId: '2',
      contestTitle: 'React Developer Challenge',
      amount: 50,
      status: 'completed',
      transactionId: 'txn_1234567891',
      paymentMethod: 'PayPal',
      createdAt: '2024-01-21T14:15:00',
      completedAt: '2024-01-21T14:16:00'
    },
    {
      id: '3',
      userId: '3',
      userName: 'Mike Johnson',
      userEmail: 'mike@example.com',
      contestId: '1',
      contestTitle: 'JavaScript Fundamentals',
      amount: 25,
      status: 'failed',
      transactionId: 'txn_1234567892',
      paymentMethod: 'Credit Card',
      createdAt: '2024-01-22T09:45:00',
      failureReason: 'Insufficient funds'
    },
    {
      id: '4',
      userId: '4',
      userName: 'Sarah Wilson',
      userEmail: 'sarah@example.com',
      contestId: '2',
      contestTitle: 'React Developer Challenge',
      amount: 50,
      status: 'pending',
      transactionId: 'txn_1234567893',
      paymentMethod: 'Bank Transfer',
      createdAt: '2024-01-23T16:20:00'
    },
    {
      id: '5',
      userId: '5',
      userName: 'David Brown',
      userEmail: 'david@example.com',
      contestId: '1',
      contestTitle: 'JavaScript Fundamentals',
      amount: 25,
      status: 'refunded',
      transactionId: 'txn_1234567894',
      paymentMethod: 'Credit Card',
      createdAt: '2024-01-19T11:00:00',
      completedAt: '2024-01-19T11:01:00'
    }
  ];

  const mockContests = [
    { id: '1', title: 'JavaScript Fundamentals' },
    { id: '2', title: 'React Developer Challenge' },
    { id: '3', title: 'CSS Masters' }
  ];

  // Simulate API loading with useEffect
  useEffect(() => {
    const fetchPaymentData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // TODO: Replace with actual API calls
        // API Call 1: Fetch all payments
        // const paymentsResponse = await fetch('/api/payments');
        // const paymentsData = await paymentsResponse.json();
        
        // API Call 2: Fetch contests for filtering
        // const contestsResponse = await fetch('/api/contests');
        // const contestsData = await contestsResponse.json();
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setPayments(mockPayments);
        setContests(mockContests);
      } catch (err) {
        setError('Failed to fetch payment data');
        console.error('Error fetching payment data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentData();
  }, []);

  // Filter payments based on search and filter criteria
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesContest = contestFilter === 'all' || payment.contestId === contestFilter;
    const matchesDate = dateFilter === 'all' || payment.createdAt.startsWith(dateFilter);
    return matchesSearch && matchesStatus && matchesContest && matchesDate;
  });

  // Export functionality
  const exportPayments = async () => {
    try {
      // TODO: Replace with actual API call for export
      // const response = await fetch('/api/payments/export', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ filters: { searchTerm, statusFilter, contestFilter, dateFilter } })
      // });
      // const blob = await response.blob();
      
      // Mock export functionality
      const csvContent = [
        ['Transaction ID', 'User', 'Contest', 'Amount', 'Status', 'Date'].join(','),
        ...filteredPayments.map(payment => [
          payment.transactionId,
          payment.userName,
          payment.contestTitle,
          payment.amount,
          payment.status,
          new Date(payment.createdAt).toLocaleDateString()
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'payments.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting payments:', err);
      setError('Failed to export payments');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-700">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
          Error Loading Payments
        </h2>
        <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
                <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Management</h1>
                <p className="text-gray-600 dark:text-gray-400">Monitor transactions and revenue</p>
              </div>
            </div>
            <button
              onClick={exportPayments}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Stats - Lazy loaded */}
        <Suspense fallback={<LoadingSpinner />}>
          <PaymentStats payments={payments} />
        </Suspense>

        {/* Filters - Lazy loaded */}
        <Suspense fallback={<LoadingSpinner />}>
          <PaymentFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            contestFilter={contestFilter}
            setContestFilter={setContestFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            contests={contests}
          />
        </Suspense>

        {/* Payments Table - Lazy loaded */}
        <Suspense fallback={<LoadingSpinner />}>
          <PaymentTable payments={filteredPayments} />
        </Suspense>

        {/* Summary Card - Lazy loaded */}
        <Suspense fallback={<LoadingSpinner />}>
          <PaymentSummary payments={payments} />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};


export default PaymentManagement;