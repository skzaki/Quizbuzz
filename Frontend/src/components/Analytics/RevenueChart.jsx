// components/RevenueChart.jsx
import { TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import LoadingSpinner from '../UI/LoadingSpinner';

const RevenueChart = ({ dateRange }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();
  }, [dateRange]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/analytics/revenue?dateRange=${dateRange}`);
      // const data = await response.json();
      // setData(data);
      
      await new Promise(resolve => setTimeout(resolve, 900));
      const mockData = [
        { month: 'Jan', revenue: 2400, contests: 8 },
        { month: 'Feb', revenue: 3200, contests: 12 },
        { month: 'Mar', revenue: 2800, contests: 10 },
        { month: 'Apr', revenue: 4100, contests: 15 },
        { month: 'May', revenue: 3900, contests: 14 },
        { month: 'Jun', revenue: 5200, contests: 18 }
      ];
      setData(mockData);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue & Contests</h3>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue & Contests</h3>
        <TrendingUp className="h-5 w-5 text-gray-400" />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Bar yAxisId="right" dataKey="contests" fill="#10B981" />
          <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;