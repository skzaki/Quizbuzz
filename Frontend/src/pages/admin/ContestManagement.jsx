import { Calendar, Plus } from 'lucide-react';
import { Suspense, lazy, useEffect, useState } from 'react';
import ErrorBoundary from '../../components/ErrorBoundary';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const ContestTable = lazy(() => import('../../components/ContestManagement/ContestTable'));
const CreateContestModal = lazy(() => import('../../components/ContestManagement/CreateContestModal'));
const ContestFilters = lazy(() => import('../../components/ContestManagement/ContestFilters'));

const BASE_URL = `${import.meta.env.VITE_URL}/admin`;

const ContestManagement = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createError, setCreateError] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContests, setTotalContests] = useState(0);
  const [itemsPerPage] = useState(10);

  const token = localStorage.getItem("authToken");

  useEffect(() => {
    fetchContests();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchContests = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/contests?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}&status=${statusFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      setContests(json.data?.contests || []);
      setTotalContests(json.data?.pagination?.totalItems || 0);
      setTotalPages(json.data?.pagination?.totalPages || 1);
      setError(null);
    } catch (err) {
      setError('Failed to fetch contests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContest = async (formData) => {
    setCreateError('');
    try {
      // Build rules array
      const rulesRaw = formData.rules || '';
      const rulesArray = rulesRaw
        .split('\n')
        .map(r => r.trim())
        .filter(Boolean);
      if (rulesArray.length === 0) rulesArray.push('Follow all contest guidelines');

      // Build topics array
      const topicsRaw = Array.isArray(formData.topics)
        ? formData.topics
        : (formData.topics || '').split(',').map(t => t.trim()).filter(Boolean);
      if (topicsRaw.length === 0) topicsRaw.push('General');

      // Prize pool → prizes array
      const prizeAmount = parseFloat(formData.prizePool) || 0;

      const payload = {
        title: formData.title,
        description: formData.description,
        startDate: formData.startDate,          // YYYY-MM-DD
        startTime: formData.startTime,          // HH:MM
        duration: parseInt(formData.duration),
        registrationFee: parseFloat(formData.registrationFee) || 0,
        maxParticipants: parseInt(formData.maxParticipants) || 100,
        topics: topicsRaw,
        rules: rulesArray,
        prizes: [{
          rankFrom: 1,
          rankTo: 1,
          amount: prizeAmount,
          currency: 'INR',
          benefits: []
        }],
        status: formData.status || 'draft',
      };

      console.log('Sending payload:', payload);

      const res = await fetch(`${BASE_URL}/contests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      console.log('Response:', json);

      if (!res.ok) {
        // Show validation errors if any
        if (json?.error?.details?.length > 0) {
          const msgs = json.error.details.map(d => `${d.field}: ${d.message}`).join('\n');
          setCreateError(msgs);
        } else {
          setCreateError(json?.error?.message || json?.message || 'Failed to create contest');
        }
        return;
      }

      setShowCreateForm(false);
      fetchContests();
    } catch (err) {
      console.error('Create contest error:', err);
      setCreateError('Network error. Please try again.');
    }
  };

  const handleEditContest = async (contestId, updates) => {
    try {
      await fetch(`${BASE_URL}/contests/${contestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates)
      });
      fetchContests();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteContest = async (contestId) => {
    if (!window.confirm("Delete this contest?")) return;
    try {
      await fetch(`${BASE_URL}/contests/${contestId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchContests();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (contestId, newStatus) => {
    try {
      await fetch(`${BASE_URL}/contests/${contestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      fetchContests();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contest Management</h1>
                <p className="text-gray-600 dark:text-gray-400">Create and manage quiz contests</p>
              </div>
            </div>
            <button
              onClick={() => { setCreateError(''); setShowCreateForm(true); }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Contest</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <ContestFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
            />
          </Suspense>
        </ErrorBoundary>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <ContestTable
              contests={contests}
              loading={loading}
              onEdit={handleEditContest}
              onDelete={handleDeleteContest}
              onStatusChange={handleStatusChange}
              currentPage={currentPage}
              totalPages={totalPages}
              totalContests={totalContests}
              onPageChange={setCurrentPage}
            />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          {showCreateForm && (
            <Suspense fallback={<LoadingSpinner />}>
              <CreateContestModal
                isOpen={showCreateForm}
                onClose={() => setShowCreateForm(false)}
                onSubmit={handleCreateContest}
                serverError={createError}
              />
            </Suspense>
          )}
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
};

export default ContestManagement;
