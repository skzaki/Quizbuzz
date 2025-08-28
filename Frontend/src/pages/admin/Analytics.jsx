// Analytics.jsx
import {
    BarChart3,
    Download,
    Target,
    TrendingUp,
    Trophy,
    Users
} from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import ErrorBoundary from '../../components/ErrorBoundary';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import StatCard from '../../components/UI/StatCard';

// Lazy load chart components for better performance
const UserGrowthChart = lazy(() => import('../../components/Analytics/UserGrowthChart'));
const RevenueChart = lazy(() => import('../../components/Analytics/RevenueChart'));
const ContestEngagementChart = lazy(() => import('../../components/Analytics/ContestEngagementChart'));
const TopicPopularityChart = lazy(() => import('../../components/Analytics/TopicPopularityChart'));
const PerformanceAnalysis = lazy(() => import('../../components/Analytics/PerformanceAnalysis'));
const QuickInsights = lazy(() => import('../../components/Analytics/QuickInsights'));

const Analytics = () => {
  const [dateRange, setDateRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('users');
  const [loading, setLoading] = useState(true);
  const [keyMetrics, setKeyMetrics] = useState({});
  const [error, setError] = useState(null);

  // Mock data - will be replaced with actual API calls
  const mockKeyMetrics = {
    totalUsers: { value: '2,431', trend: { value: 12, isPositive: true } },
    totalContests: { value: '24', trend: { value: 8, isPositive: true } },
    avgCompletionRate: { value: '84%', trend: { value: 5, isPositive: true } },
    totalRevenue: { value: '$12,450', trend: { value: 15, isPositive: true } }
  };

  useEffect(() => {
    // TODO: Replace with actual API call
    // fetchKeyMetrics(dateRange);
    fetchMockKeyMetrics();
  }, [dateRange]);

  const fetchMockKeyMetrics = async () => {
    try {
      setLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/analytics/key-metrics?dateRange=${dateRange}`);
      // const data = await response.json();
      // setKeyMetrics(data);
      
      setKeyMetrics(mockKeyMetrics);
    } catch (err) {
      setError('Failed to fetch key metrics');
      console.error('Error fetching key metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/analytics/export', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ dateRange, metrics: selectedMetric })
      // });
      // const blob = await response.blob();
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `analytics-${dateRange}.csv`;
      // a.click();
      
      console.log('Exporting analytics data for range:', dateRange);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export data');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Insights</h1>
              <p className="text-gray-600 dark:text-gray-400">Comprehensive platform analytics and metrics</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button
              onClick={exportData}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <LoadingSpinner />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={keyMetrics.totalUsers?.value || '0'}
            icon={Users}
            color="blue"
            trend={keyMetrics.totalUsers?.trend}
            subtitle="Active this month"
          />
          <StatCard
            title="Total Contests"
            value={keyMetrics.totalContests?.value || '0'}
            icon={Trophy}
            color="purple"
            trend={keyMetrics.totalContests?.trend}
            subtitle="This month"
          />
          <StatCard
            title="Avg. Completion Rate"
            value={keyMetrics.avgCompletionRate?.value || '0%'}
            icon={Target}
            color="green"
            trend={keyMetrics.avgCompletionRate?.trend}
            subtitle="Across all contests"
          />
          <StatCard
            title="Total Revenue"
            value={keyMetrics.totalRevenue?.value || '$0'}
            icon={TrendingUp}
            color="orange"
            trend={keyMetrics.totalRevenue?.trend}
            subtitle="This month"
          />
        </div>
      )}

      {/* Charts Grid - Lazy loaded with error boundaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorBoundary>
          <Suspense fallback={<ChartLoadingFallback title="User Growth" />}>
            <UserGrowthChart dateRange={dateRange} />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<ChartLoadingFallback title="Revenue & Contests" />}>
            <RevenueChart dateRange={dateRange} />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<ChartLoadingFallback title="Contest Engagement" />}>
            <ContestEngagementChart dateRange={dateRange} />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<ChartLoadingFallback title="Topic Popularity" />}>
            <TopicPopularityChart dateRange={dateRange} />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Performance Analysis */}
      <ErrorBoundary>
        <Suspense fallback={<ChartLoadingFallback title="Performance Analysis" />}>
          <PerformanceAnalysis dateRange={dateRange} />
        </Suspense>
      </ErrorBoundary>


      {/* Quick Insights */}
      <ErrorBoundary>
        <Suspense fallback={<QuickInsightsLoadingFallback />}>
          <QuickInsights dateRange={dateRange} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

// Loading fallback components
const ChartLoadingFallback = ({ title }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{title}</h3>
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner />
    </div>
  </div>
);

const QuickInsightsLoadingFallback = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <LoadingSpinner />
      </div>
    ))}
  </div>
);

export default Analytics;