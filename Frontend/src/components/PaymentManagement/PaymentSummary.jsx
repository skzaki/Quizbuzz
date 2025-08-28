//  components/PaymentSummary.jsx


const PaymentSummary = ({ payments }) => {
  const completedPayments = payments.filter(p => p.status === 'completed');
  const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const averageTransaction = completedPayments.length > 0 ? 
    (totalRevenue / completedPayments.length).toFixed(2) : '0.00';
  const successRate = payments.length > 0 ? 
    Math.round((completedPayments.length / payments.length) * 100) : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            ${totalRevenue}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ${averageTransaction}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Average Transaction</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {successRate}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummary;