// components/TopicPopularityChart.jsx
import { Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import LoadingSpinner from '../UI/LoadingSpinner';

const TopicPopularityChart = ({ dateRange }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopicPopularityData();
  }, [dateRange]);

  const fetchTopicPopularityData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/analytics/topic-popularity?dateRange=${dateRange}`);
      // const data = await response.json();
      // setData(data);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      const mockData = [
        { name: 'JavaScript', value: 35, color: '#8B5CF6' },
        { name: 'React', value: 25, color: '#3B82F6' },
        { name: 'CSS', value: 20, color: '#10B981' },
        { name: 'Node.js', value: 12, color: '#F59E0B' },
        { name: 'Python', value: 8, color: '#EF4444' }
      ];
      setData(mockData);
    } catch (error) {
      console.error('Error fetching topic popularity data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Topic Popularity</h3>
          <Target className="h-5 w-5 text-gray-400" />
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Topic Popularity</h3>
        <Target className="h-5 w-5 text-gray-400" />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopicPopularityChart;