// components/ContestEngagementChart.jsx
import { Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import LoadingSpinner from '../UI/LoadingSpinner';

const ContestEngagementChart = ({ dateRange }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContestEngagementData();
  }, [dateRange]);

  const fetchContestEngagementData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/analytics/contest-engagement?dateRange=${dateRange}`);
      // const data = await response.json();
      // setData(data);
      
      await new Promise(resolve => setTimeout(resolve, 700));
      const mockData = [
        { contest: 'JS Fundamentals', participants: 234, completion: 89 },
        { contest: 'React Challenge', participants: 156, completion: 76 },
        { contest: 'CSS Masters', participants: 198, completion: 92 },
        { contest: 'Node.js Basics', participants: 145, completion: 81 },
        { contest: 'Python Intro', participants: 167, completion: 85 }
      ];
      setData(mockData);
    } catch (error) {
      console.error('Error fetching contest engagement data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contest Engagement</h3>
          <Trophy className="h-5 w-5 text-gray-400" />
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contest Engagement</h3>
        <Trophy className="h-5 w-5 text-gray-400" />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="contest" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="participants" fill="#8B5CF6" />
          <Bar dataKey="completion" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ContestEngagementChart;