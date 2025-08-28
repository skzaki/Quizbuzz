import {
    Award,
    BarChart3,
    Calendar,
    Clock,
    DollarSign,
    Download,
    Send,
    Target,
    Trophy,
    Users
} from 'lucide-react';
import ErrorBoundary from '../ErrorBoundary';
import Badge from '../UI/Badge';
import StatCard from '../UI/StatCard';

const OverviewTab = ({ contest, participants }) => {
  // Calculate analytics
  const analytics = {
    totalRegistered: participants.length,
    totalParticipated: participants.filter(p => p.score !== undefined).length,
    averageScore: participants.filter(p => p.score).reduce((sum, p) => sum + (p.score || 0), 0) / participants.filter(p => p.score).length || 0,
    completionRate: (participants.filter(p => p.score !== undefined).length / participants.length) * 100,
    totalRevenue: participants.filter(p => p.paymentStatus === 'paid').length * contest.registrationFee,
    certificatesIssued: participants.filter(p => p.certificateIssued).length
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'default';
      case 'upcoming': return 'info';
      case 'ongoing': return 'warning';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  const exportParticipants = async () => {
    try {
      // TODO: Replace with actual API call to export participants
      // const response = await fetch(`/api/admin/contests/${contest.id}/participants/export`, {
      //   method: 'GET',
      //   headers: {
      //     'Content-Type': 'application/csv'
      //   }
      // });
      // const blob = await response.blob();
      
      // For now, use client-side CSV generation
      const csvContent = [
        ['Name', 'Email', 'Registration Date', 'Payment Status', 'Score', 'Rank', 'Certificate Issued'].join(','),
        ...participants.map(p => [
          p.name,
          p.email,
          p.registrationDate,
          p.paymentStatus,
          p.score || 'N/A',
          p.rank || 'N/A',
          p.certificateIssued ? 'Yes' : 'No'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contest.title}_participants.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export participants:', error);
      alert('Failed to export participants. Please try again.');
    }
  };

  return (
    <ErrorBoundary>

    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Contest Details */}
      <ErrorBoundary>

      
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{contest.title}</h1>
                <Badge variant={getStatusColor(contest.status)}>
                  {contest.status}
                </Badge>
              </div>
              <p className="text-gray-600 dark:text-gray-400">{contest.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Start Date</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(contest.startDate).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Duration</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{contest.duration} minutes</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Difficulty</div>
                  <Badge variant={getDifficultyColor(contest.difficulty)} size="sm">
                    {contest.difficulty}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Max Participants</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{contest.maxParticipants}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Registration Fee</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">${contest.registrationFee}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Prize Pool</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">${contest.prizePool}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex flex-wrap gap-2">
              {contest.topics.map((topic, index) => (
                <Badge key={index} variant="default">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Registered"
            value={analytics.totalRegistered}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Participated"
            value={analytics.totalParticipated}
            icon={Trophy}
            color="purple"
          />
          <StatCard
            title="Avg Score"
            value={`${Math.round(analytics.averageScore)}%`}
            icon={Target}
            color="green"
          />
          <StatCard
            title="Revenue"
            value={`$${analytics.totalRevenue}`}
            icon={DollarSign}
            color="orange"
          />
        </div>
      </div>
       </ErrorBoundary>
      
      {/* Actions Panel */}
      <ErrorBoundary>
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={exportParticipants}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Participants</span>
            </button>
            {contest.status === 'completed' && (
              <button
                onClick={() => {
                  // This will be handled by parent component
                  console.log('Issue certificates clicked');
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>Issue Certificates</span>
              </button>
            )}
            <button
              onClick={() => {
                // Navigate to analytics tab
                console.log('View analytics clicked');
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>View Analytics</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contest Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Created by</span>
              <span className="font-medium text-gray-900 dark:text-white">{contest.createdBy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Created on</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {new Date(contest.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Questions</span>
              <span className="font-medium text-gray-900 dark:text-white">{contest.questionCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Passing Score</span>
              <span className="font-medium text-gray-900 dark:text-white">{contest.passingScore}%</span>
            </div>
          </div>
        </div>
      </div>
      </ErrorBoundary>
    </div>
    </ErrorBoundary>
  );
};

export default OverviewTab;