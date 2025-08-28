import {
    ArrowLeft,
    BarChart3,
    Edit,
    Play,
    Trophy,
    Users,
} from 'lucide-react';
import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

// Lazy load tab components
const OverviewTab = lazy(() => import('../../components/AdminContestDetail/OverviewTab'));
const ParticipantsTab = lazy(() => import('../../components/AdminContestDetail/ParticipantsTab'));
const AnalyticsTab = lazy(() => import('../../components/AdminContestDetail/AnalyticsTab'));

// Lazy load modals
const CertificateModal = lazy(() => import('../../components/CertificateModal'));
const EditModal = lazy(() => import('../../components/EditModal'));

const AdminContestDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [contest, setContest] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Mock data - Replace with actual API calls
  useEffect(() => {
    const fetchContestData = async () => {
      try {
        setLoading(true);
        
        // TODO: Replace with actual API call
        // const contestResponse = await fetch(`/api/admin/contests/${id}`);
        // const contestData = await contestResponse.json();
        // setContest(contestData);

        // Mock contest data
        const mockContest = {
          id: '1',
          title: 'JavaScript Fundamentals Championship',
          description: 'Test your JavaScript knowledge with advanced concepts including ES6+, async programming, closures, and modern JavaScript patterns.',
          status: 'completed',
          topics: ['JavaScript', 'ES6+', 'Async/Await', 'Closures'],
          startDate: '2024-01-20T14:00:00',
          endDate: '2024-01-20T16:00:00',
          duration: 120,
          difficulty: 'medium',
          maxParticipants: 500,
          registrationFee: 25,
          prizePool: 1000,
          createdBy: 'Admin User',
          createdAt: '2024-01-15',
          questionCount: 50,
          passingScore: 70,
          certificateTemplate: 'default'
        };
        setContest(mockContest);

        // TODO: Replace with actual API call
        // const participantsResponse = await fetch(`/api/admin/contests/${id}/participants`);
        // const participantsData = await participantsResponse.json();
        // setParticipants(participantsData);

        // Mock participants data
        const mockParticipants = [
          {
            id: '1',
            name: 'Sarah Chen',
            email: 'sarah@example.com',
            registrationDate: '2024-01-18',
            paymentStatus: 'paid',
            score: 94,
            rank: 1,
            timeTaken: 98,
            certificateIssued: true,
            submissionId: 'sub_001'
          },
          {
            id: '2',
            name: 'Alex Johnson',
            email: 'alex@example.com',
            registrationDate: '2024-01-19',
            paymentStatus: 'paid',
            score: 87,
            rank: 2,
            timeTaken: 105,
            certificateIssued: true,
            submissionId: 'sub_002'
          },
          {
            id: '3',
            name: 'Mike Rodriguez',
            email: 'mike@example.com',
            registrationDate: '2024-01-17',
            paymentStatus: 'paid',
            score: 82,
            rank: 3,
            timeTaken: 110,
            certificateIssued: false,
            submissionId: 'sub_003'
          },
          {
            id: '4',
            name: 'Emma Wilson',
            email: 'emma@example.com',
            registrationDate: '2024-01-19',
            paymentStatus: 'unpaid',
            submissionId: undefined
          },
          {
            id: '5',
            name: 'David Kim',
            email: 'david@example.com',
            registrationDate: '2024-01-16',
            paymentStatus: 'paid',
            score: 76,
            rank: 4,
            timeTaken: 115,
            certificateIssued: false,
            submissionId: 'sub_005'
          }
        ];
        setParticipants(mockParticipants);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContestData();
  }, [id]);

  const handlePublishContest = async () => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/admin/contests/${id}/publish`, { method: 'POST' });
      console.log('Publishing contest');
      alert('Contest published successfully!');
    } catch (err) {
      console.error('Failed to publish contest:', err);
    }
  };

  const handleStartContest = async () => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/admin/contests/${id}/start`, { method: 'POST' });
      console.log('Starting contest manually');
      alert('Contest started!');
    } catch (err) {
      console.error('Failed to start contest:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400 text-lg">
          Error loading contest: {error}
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 dark:text-gray-400 text-lg">
          Contest not found
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Trophy },
    { key: 'participants', label: 'Participants', icon: Users },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/contests"
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Contests</span>
            </Link>
          </div>
          <div className="flex space-x-3">
            {contest.status === 'draft' && (
              <button
                onClick={handlePublishContest}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Publish Contest</span>
              </button>
            )}
            {contest.status === 'upcoming' && (
              <button
                onClick={handleStartContest}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Start Now</span>
              </button>
            )}
            <button
              onClick={() => setShowEditModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Contest</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content with Suspense for lazy loading */}
      <Suspense fallback={<LoadingSpinner />}>
        {activeTab === 'overview' && (
          <OverviewTab contest={contest} participants={participants} />
        )}
        {activeTab === 'participants' && (
          <ParticipantsTab 
            contest={contest} 
            participants={participants}
            setParticipants={setParticipants}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab contest={contest} participants={participants} />
        )}
      </Suspense>

      {/* Modals with Suspense for lazy loading */}
      <Suspense fallback={null}>
        {showCertificateModal && (
          <CertificateModal
            contest={contest}
            participants={participants}
            onClose={() => setShowCertificateModal(false)}
            onIssue={() => {
              // TODO: Add actual certificate issuing logic
              setShowCertificateModal(false);
              alert('Certificates issued successfully!');
            }}
          />
        )}
        {showEditModal && (
          <EditModal
            contest={contest}
            onClose={() => setShowEditModal(false)}
            onSave={(updatedContest) => {
              // TODO: Add actual contest update logic
              setContest(updatedContest);
              setShowEditModal(false);
            }}
          />
        )}
      </Suspense>
    </div>
  );
};

export default AdminContestDetail;