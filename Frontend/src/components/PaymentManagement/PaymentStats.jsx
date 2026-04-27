// File: components/PaymentStats.jsx
import { Calendar, CreditCard, DollarSign, TrendingUp } from 'lucide-react';
import StatCard from '../UI/StatCard';

const PaymentStats = ({ payments }) => {
  const totalRevenue = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalTransactions = payments.length;
  const paidTransactions = payments.filter(p => p.status === 'paid').length;
  const pendingTransactions = payments.filter(p => p.status === 'pending').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Revenue"
        value={`$${totalRevenue.toLocaleString()}`}
        icon={DollarSign}
        color="green"
        trend={{ value: 15, isPositive: true }}
      />
      <StatCard
        title="Total Transactions"
        value={totalTransactions}
        icon={CreditCard}
        color="blue"
        trend={{ value: 8, isPositive: true }}
      />
      <StatCard
        title="paid"
        value={paidTransactions}
        icon={TrendingUp}
        color="purple"
        subtitle={`${Math.round((paidTransactions / totalTransactions) * 100)}% success rate`}
      />
      <StatCard
        title="Pending"
        value={pendingTransactions}
        icon={Calendar}
        color="orange"
        subtitle="Awaiting processing"
      />
    </div>
  );
};

export default PaymentStats;