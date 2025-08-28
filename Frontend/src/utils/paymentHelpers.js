// File: utils/paymentHelpers.js
/**
 * Utility functions for payment management
 */

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

/**
 * Get status badge color
 * @param {string} status - Payment status
 * @returns {string} Badge variant
 */
export const getStatusColor = (status) => {
  switch (status) {
    case 'completed': return 'success';
    case 'pending': return 'warning';
    case 'failed': return 'error';
    case 'refunded': return 'info';
    default: return 'default';
  }
};

/**
 * Calculate payment statistics
 * @param {Array} payments - Array of payment objects
 * @returns {Object} Payment statistics
 */
export const calculatePaymentStats = (payments) => {
  const completed = payments.filter(p => p.status === 'completed');
  const pending = payments.filter(p => p.status === 'pending');
  const failed = payments.filter(p => p.status === 'failed');
  const refunded = payments.filter(p => p.status === 'refunded');

  const totalRevenue = completed.reduce((sum, p) => sum + p.amount, 0);
  const averageTransaction = completed.length > 0 ? totalRevenue / completed.length : 0;
  const successRate = payments.length > 0 ? (completed.length / payments.length) * 100 : 0;

  return {
    total: payments.length,
    completed: completed.length,
    pending: pending.length,
    failed: failed.length,
    refunded: refunded.length,
    totalRevenue,
    averageTransaction,
    successRate
  };
};

/**
 * Export payments to CSV
 * @param {Array} payments - Array of payment objects
 * @param {string} filename - CSV filename
 */
export const exportPaymentsToCSV = (payments, filename = 'payments.csv') => {
  const headers = [
    'Transaction ID',
    'User Name',
    'User Email',
    'Contest',
    'Amount',
    'Status',
    'Payment Method',
    'Created Date',
    'Completed Date'
  ];

  const csvContent = [
    headers.join(','),
    ...payments.map(payment => [
      payment.transactionId,
      payment.userName,
      payment.userEmail,
      payment.contestTitle,
      payment.amount,
      payment.status,
      payment.paymentMethod,
      new Date(payment.createdAt).toISOString(),
      payment.completedAt ? new Date(payment.completedAt).toISOString() : ''
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Filter payments based on criteria
 * @param {Array} payments - Array of payment objects
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered payments
 */
export const filterPayments = (payments, filters) => {
  const { searchTerm, statusFilter, contestFilter, dateFilter } = filters;

  return payments.filter(payment => {
    const matchesSearch = !searchTerm || 
      payment.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesContest = contestFilter === 'all' || payment.contestId === contestFilter;
    const matchesDate = dateFilter === 'all' || payment.createdAt.startsWith(dateFilter);
    
    return matchesSearch && matchesStatus && matchesContest && matchesDate;
  });
};

// Mock data (would be removed when using real API)
export const mockPayments = [
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
  // ... other mock data
];

export const mockContests = [
  { id: '1', title: 'JavaScript Fundamentals' },
  { id: '2', title: 'React Developer Challenge' },
  { id: '3', title: 'CSS Masters' }
];