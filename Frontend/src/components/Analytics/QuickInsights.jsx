// components/QuickInsights.jsx
import { useEffect, useState } from 'react';
import LoadingSpinner from '../UI/LoadingSpinner';

const QuickInsights = ({ dateRange }) => {
  const [insights, setInsights] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuickInsights();
  }, [dateRange]);

  const fetchQuickInsights = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/analytics/quick-insights?dateRange=${dateRange}`);
      // const data = await response.json();
      // setInsights(data);
      
      await new Promise(resolve => setTimeout(resolve, 400));
      const mockData = {
        peakActivity: [
          { time: '2:00 PM - 4:00 PM', level: 'Peak' },
          { time: '7:00 PM - 9:00 PM', level: 'High' },
          { time: '10:00 AM - 12:00 PM', level: 'Medium' }
        ],
        userRetention: [
          { day: 'Day 1', percentage: '89%' },
          { day: 'Day 7', percentage: '67%' },
          { day: 'Day 30', percentage: '42%' }
        ],
        contestMetrics: [
          { metric: 'Avg. Duration', value: '98 min' },
          { metric: 'Drop-off Rate', value: '16%' },
          { metric: 'Avg. Score', value: '74%' }
        ]
      };
      setInsights(mockData);
    } catch (error) {
      console.error('Error fetching quick insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Peak Activity Hours */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Peak Activity Hours</h4>
        <div className="space-y-2">
          {insights.peakActivity?.map((activity, index) => (
            <div key={index} className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{activity.time}</span>
              <span className="font-medium text-gray-900 dark:text-white">{activity.level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* User Retention */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">User Retention</h4>
        <div className="space-y-2">
          {insights.userRetention?.map((retention, index) => (
            <div key={index} className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{retention.day}</span>
              <span className="font-medium text-gray-900 dark:text-white">{retention.percentage}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Contest Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Contest Metrics</h4>
        <div className="space-y-2">
          {insights.contestMetrics?.map((metric, index) => (
            <div key={index} className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{metric.metric}</span>
              <span className="font-medium text-gray-900 dark:text-white">{metric.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickInsights;