import {
    Activity,
    Award,
    Calendar,
    Clock,
    DollarSign,
    FileText, Plus,
    Target,
    TrendingUp,
    Trophy,
    Users
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis, YAxis
} from 'recharts';
import StatCard from '../../components/UI/StatCard';

const AdminDashboard = () => {
  const participationData = [
    { month: 'Jan', participants: 120 },
    { month: 'Feb', participants: 150 },
    { month: 'Mar', participants: 180 },
    { month: 'Apr', participants: 220 },
    { month: 'May', participants: 280 },
    { month: 'Jun', participants: 320 }
  ];

  const revenueData = [
    { month: 'Jan', revenue: 2400 },
    { month: 'Feb', revenue: 3200 },
    { month: 'Mar', revenue: 2800 },
    { month: 'Apr', revenue: 4100 },
    { month: 'May', revenue: 3900 },
    { month: 'Jun', revenue: 5200 }
  ];

  const topicData = [
    { name: 'JavaScript', value: 35, color: '#8B5CF6' },
    { name: 'React', value: 25, color: '#3B82F6' },
    { name: 'CSS', value: 20, color: '#10B981' },
    { name: 'Node.js', value: 15, color: '#F59E0B' },
    { name: 'Python', value: 5, color: '#EF4444' }
  ];

  const recentActivities = [
    { id: 1, type: 'contest', message: 'New contest "React Advanced" created', time: '2 hours ago' },
    { id: 2, type: 'user', message: '50 new users registered today', time: '4 hours ago' },
    { id: 3, type: 'payment', message: 'Contest "JavaScript Basics" payment processed', time: '6 hours ago' },
    { id: 4, type: 'certificate', message: '25 certificates issued for "CSS Masters"', time: '1 day ago' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-lg">
              <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage and monitor your quiz platform</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Contest</span>
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Questions</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Schedule Contest</span>
          </button>
          <button className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Bulk Add Questions</span>
          </button>
          <button className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <Award className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Issue Certificates</span>
          </button>
          <button className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">View Analytics</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Contests"
          value={24}
          icon={Trophy}
          color="purple"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Total Participants"
          value="2,431"
          icon={Users}
          color="blue"
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Total Revenue"
          value="$12,450"
          icon={DollarSign}
          color="green"
          trend={{ value: 15, isPositive: true }}
        />
        <StatCard
          title="Certificates Issued"
          value="1,284"
          icon={Award}
          color="orange"
          trend={{ value: 5, isPositive: true }}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Participation Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Participation Trends</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={participationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="participants" stroke="#8B5CF6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Trends</h3>
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Popular Topics</h3>
            <Target className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={topicData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {topicData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activities */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activities</h3>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${
                  activity.type === 'contest' ? 'bg-purple-100 dark:bg-purple-900/20' :
                  activity.type === 'user' ? 'bg-blue-100 dark:bg-blue-900/20' :
                  activity.type === 'payment' ? 'bg-green-100 dark:bg-green-900/20' :
                  'bg-orange-100 dark:bg-orange-900/20'
                }`}>
                  {activity.type === 'contest' && <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                  {activity.type === 'user' && <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                  {activity.type === 'payment' && <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />}
                  {activity.type === 'certificate' && <Award className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;