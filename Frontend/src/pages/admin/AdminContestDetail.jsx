import {
    ArrowLeft, BarChart3, Edit, Play, Trophy, Users,
} from 'lucide-react';
import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const OverviewTab = lazy(() => import('../../components/AdminContestDetail/OverviewTab'));
const ParticipantsTab = lazy(() => import('../../components/AdminContestDetail/ParticipantsTab'));
const AnalyticsTab = lazy(() => import('../../components/AdminContestDetail/AnalyticsTab'));
const CertificateModal = lazy(() => import('../../components/CertificateModal'));
const EditModal = lazy(() => import('../../components/EditModal'));

const BASE_URL = `${import.meta.env.VITE_URL}/admin`;

const AdminContestDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [contest, setContest] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const token = localStorage.getItem("authToken"); // Assuming JWT stored here

  useEffect(() => {
    const fetchContestData = async () => {
      try {
        setLoading(true);

        // Get contest details
        const contestRes = await fetch(`${BASE_URL}/contests/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const contestJson = await contestRes.json();
        setContest(contestJson.data);

        // Participants come inside contest JSON ("participants")
        setParticipants(contestJson.data.participants || []);
        console.table(participants)

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContestData();
  }, [id, token]);

  const handlePublishContest = async () => {
    try {
      await fetch(`${BASE_URL}/contests/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: "upcoming" })
      });
      alert("Contest published successfully!");
      setContest({ ...contest, status: "upcoming" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartContest = async () => {
    try {
      await fetch(`${BASE_URL}/contests/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: "ongoing" })
      });
      alert("Contest started!");
      setContest({ ...contest, status: "ongoing" });
    } catch (err) {
      console.error(err);
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