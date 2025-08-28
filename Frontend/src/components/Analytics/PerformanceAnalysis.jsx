// components/PerformanceAnalysis.jsx
import { Award, Clock, Target, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Badge from '../UI/Badge';
import LoadingSpinner from '../UI/LoadingSpinner';

const PerformanceAnalysis = ({ dateRange }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedView, setSelectedView] = useState('overview'); // overview, trends, detailed
  const [performanceTrends, setPerformanceTrends] = useState([]);
  const [insights, setInsights] = useState({});

  useEffect(() => {
    fetchPerformanceData();
  }, [dateRange, selectedView]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with actual API calls
      // const [overviewRes, trendsRes, insightsRes] = await Promise.all([
      //   fetch(`/api/analytics/performance?dateRange=${dateRange}&view=overview`),
      //   fetch(`/api/analytics/performance-trends?dateRange=${dateRange}`),
      //   fetch(`/api/analytics/performance-insights?dateRange=${dateRange}`)
      // ]);
      // 
      // const [overviewData, trendsData, insightsData] = await Promise.all([
      //   overviewRes.json(),
      //   trendsRes.json(),
      //   insightsRes.json()
      // ]);
      // 
      // setData(overviewData.data);
      // setPerformanceTrends(trendsData.data);
      // setInsights(insightsData.data);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Extended mock data for performance analysis
      const mockOverviewData = [
        { 
          difficulty: 'Easy', 
          avgScore: 87, 
          attempts: 1250,
          successRate: 94,
          avgTimeToComplete: 25,
          popularTopics: ['HTML', 'CSS Basics', 'JavaScript Intro'],
          improvementRate: 12,
          dropOffRate: 6,
          retryRate: 18
        },
        { 
          difficulty: 'Medium', 
          avgScore: 72, 
          attempts: 890,
          successRate: 78,
          avgTimeToComplete: 45,
          popularTopics: ['React', 'Node.js', 'Database Design'],
          improvementRate: 8,
          dropOffRate: 22,
          retryRate: 35
        },
        { 
          difficulty: 'Hard', 
          avgScore: 58, 
          attempts: 456,
          successRate: 61,
          avgTimeToComplete: 72,
          popularTopics: ['System Design', 'Advanced Algorithms', 'Cloud Architecture'],
          improvementRate: 15,
          dropOffRate: 39,
          retryRate: 58
        }
      ];

      const mockTrendsData = [
        { period: 'Week 1', easy: 85, medium: 68, hard: 52 },
        { period: 'Week 2', easy: 87, medium: 70, hard: 55 },
        { period: 'Week 3', easy: 86, medium: 72, hard: 58 },
        { period: 'Week 4', easy: 89, medium: 75, hard: 61 },
      ];

      const mockInsights = {
        topPerformingCategory: 'Easy',
        mostImprovedCategory: 'Hard',
        biggestChallenge: 'System Design',
        overallTrend: 'improving',
        keyInsights: [
          'Hard difficulty contests show 15% improvement rate',
          'Medium difficulty has the highest retry rate at 35%',
          'Easy contests maintain consistent 94% success rate',
          'Average completion time decreasing across all levels'
        ]
      };
      
      setData(mockOverviewData);
      setPerformanceTrends(mockTrendsData);
      setInsights(mockInsights);
    } catch (err) {
      console.error('Error fetching performance data:', err);
      setError('Failed to load performance analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty?.toLowerCase()) {
      case 'easy': return { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' };
      case 'medium': return { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' };
      case 'hard': return { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' };
      default: return { bg: 'bg-gray-100 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-800' };
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getTrendIcon = (trend) => {
    return trend === 'improving' ? 
      <TrendingUp className="h-4 w-4 text-green-500" /> : 
      <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Performance Analysis</h3>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Performance Analysis</h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button 
              onClick={fetchPerformanceData}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with View Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Performance Analysis</h3>
          </div>
          
          {/* View Selector */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {['overview', 'trends', 'detailed'].map((view) => (
              <button
                key={view}
                onClick={() => setSelectedView(view)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedView === view
                    ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Key Insights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Top Category</p>
                <p className="text-lg font-bold text-purple-800 dark:text-purple-200">{insights.topPerformingCategory}</p>
              </div>
              <Award className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Most Improved</p>
                <p className="text-lg font-bold text-green-800 dark:text-green-200">{insights.mostImprovedCategory}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Challenge</p>
                <p className="text-lg font-bold text-orange-800 dark:text-orange-200">{insights.biggestChallenge}</p>
              </div>
              <Target className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Overall Trend</p>
                <p className="text-lg font-bold text-blue-800 dark:text-blue-200 capitalize">{insights.overallTrend}</p>
              </div>
              {getTrendIcon(insights.overallTrend)}
            </div>
          </div>
        </div>

        {/* Main Content Based on Selected View */}
        {selectedView === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.map((item, index) => {
              const colors = getDifficultyColor(item.difficulty);
              return (
                <div key={index} className={`p-6 rounded-lg border ${colors.border} ${colors.bg}`}>
                  {/* Difficulty Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h4 className={`font-bold text-xl ${colors.text}`}>{item.difficulty}</h4>
                    <Badge color={item.difficulty.toLowerCase() === 'easy' ? 'green' : item.difficulty.toLowerCase() === 'medium' ? 'yellow' : 'red'}>
                      {item.attempts} attempts
                    </Badge>
                  </div>

                  {/* Key Metrics */}
                  <div className="space-y-4">
                    {/* Average Score */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Score</span>
                      <span className={`text-2xl font-bold ${getScoreColor(item.avgScore)}`}>
                        {item.avgScore}%
                      </span>
                    </div>

                    {/* Success Rate */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          {item.successRate}%
                        </span>
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              item.successRate >= 80 ? 'bg-green-500' : 
                              item.successRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${item.successRate}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Average Time */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Time</span>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          {item.avgTimeToComplete}m
                        </span>
                      </div>
                    </div>

                    {/* Additional Stats */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <div className="text-center">
                        <div className="text-sm font-bold text-green-600 dark:text-green-400">
                          +{item.improvementRate}%
                        </div>
                        <div className="text-xs text-gray-500">Improvement</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-red-600 dark:text-red-400">
                          {item.dropOffRate}%
                        </div>
                        <div className="text-xs text-gray-500">Drop-off</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {item.retryRate}%
                        </div>
                        <div className="text-xs text-gray-500">Retry</div>
                      </div>
                    </div>

                    {/* Popular Topics */}
                    <div className="pt-2">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Popular Topics:</p>
                      <div className="flex flex-wrap gap-1">
                        {item.popularTopics?.map((topic, topicIndex) => (
                          <span 
                            key={topicIndex}
                            className="text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded border"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedView === 'trends' && (
          <div className="space-y-6">
            {/* Performance Trends Chart */}
            <div className="h-80">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Performance Trends Over Time</h4>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value, name) => [`${value}%`, name.charAt(0).toUpperCase() + name.slice(1)]}
                  />
                  <Line type="monotone" dataKey="easy" stroke="#10B981" strokeWidth={3} name="Easy" />
                  <Line type="monotone" dataKey="medium" stroke="#F59E0B" strokeWidth={3} name="Medium" />
                  <Line type="monotone" dataKey="hard" stroke="#EF4444" strokeWidth={3} name="Hard" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Trend Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h5 className="font-semibold text-green-800 dark:text-green-200 mb-2">Easy Contests</h5>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Consistent performance with steady 87-89% average scores. Low variance indicates stable difficulty calibration.
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h5 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Medium Contests</h5>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Showing upward trend from 68% to 75%. Indicates improving user skills or better contest design.
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <h5 className="font-semibold text-red-800 dark:text-red-200 mb-2">Hard Contests</h5>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Significant improvement from 52% to 61%. Users are adapting well to challenging content.
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'detailed' && (
          <div className="space-y-6">
            {/* Detailed Performance Bar Chart */}
            <div className="h-80">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Detailed Performance Metrics</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="difficulty" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgScore" fill="#8B5CF6" name="Avg Score (%)" />
                  <Bar dataKey="successRate" fill="#10B981" name="Success Rate (%)" />
                  <Bar dataKey="improvementRate" fill="#F59E0B" name="Improvement Rate (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Stats Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Difficulty</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Attempts</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Avg Score</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Success Rate</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Avg Time</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Drop-off</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Retry Rate</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Improvement</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => {
                    const colors = getDifficultyColor(item.difficulty);
                    return (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 px-4">
                          <Badge color={item.difficulty.toLowerCase() === 'easy' ? 'green' : item.difficulty.toLowerCase() === 'medium' ? 'yellow' : 'red'}>
                            {item.difficulty}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-900 dark:text-white font-medium">
                            {item.attempts.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-semibold ${getScoreColor(item.avgScore)}`}>
                            {item.avgScore}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-900 dark:text-white">
                              {item.successRate}%
                            </span>
                            <div className="w-12 h-2 bg-gray-200 dark:bg-gray-600 rounded-full">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  item.successRate >= 80 ? 'bg-green-500' : 
                                  item.successRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${item.successRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-900 dark:text-white">
                              {item.avgTimeToComplete}m
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {item.dropOffRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {item.retryRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            +{item.improvementRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Key Insights Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
          Key Performance Insights
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.keyInsights?.map((insight, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                  {index + 1}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {insight}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
        <h4 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-4 flex items-center">
          <Target className="h-5 w-5 mr-2" />
          Recommendations
        </h4>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              <strong>Easy Contests:</strong> Maintain current difficulty level. Consider adding more variety in topics to keep engagement high.
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              <strong>Medium Contests:</strong> The improving trend is positive. Focus on reducing the 35% retry rate with better problem clarity.
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              <strong>Hard Contests:</strong> Great improvement rate! Consider providing more learning resources to reduce the 39% drop-off rate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalysis;