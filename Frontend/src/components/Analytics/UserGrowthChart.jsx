// components/UserGrowthChart.jsx
import { Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import LoadingSpinner from '../UI/LoadingSpinner';

const UserGrowthChart = ({ dateRange }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserGrowthData();
  }, [dateRange]);

  const fetchUserGrowthData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/analytics/user-growth?dateRange=${dateRange}`);
      // const data = await response.json();
      // setData(data);
      
      // Mock data
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockData = [
        { month: 'Jan', users: 120, active: 95 },
        { month: 'Feb', users: 180, active: 142 },
        { month: 'Mar', users: 250, active: 198 },
        { month: 'Apr', users: 320, active: 256 },
        { month: 'May', users: 420, active: 336 },
        { month: 'Jun', users: 580, active: 464 }
      ];
      setData(mockData);
    } catch (error) {
      console.error('Error fetching user growth data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Growth</h3>
          <Users className="h-5 w-5 text-gray-400" />
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Growth</h3>
        <Users className="h-5 w-5 text-gray-400" />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="users" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
          <Area type="monotone" dataKey="active" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UserGrowthChart;