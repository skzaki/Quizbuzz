import { Calendar, Plus } from 'lucide-react';
import { Suspense, lazy, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();

  const token = localStorage.getItem("authToken");

  useEffect(() => {
    fetchContests();
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    if (searchParams.get('openCreate') === 'true') {
      setShowCreateForm(true);
      // Clean up the URL to prevent reopening on refresh
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('openCreate');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
      // Build rules array from newline-separated string
      const rulesRaw = formData.rules || '';
      const rulesArray = rulesRaw
        .split('\n')
        .map(r => r.trim())
        .filter(Boolean);
      if (rulesArray.length === 0) rulesArray.push('Follow all contest guidelines');

      // Build topics array from comma-separated string
      const topicsRaw = Array.isArray(formData.topics)
        ? formData.topics
        : (formData.topics || '').split(',').map(t => t.trim()).filter(Boolean);
      if (topicsRaw.length === 0) topicsRaw.push('General');

      const prizeAmount = parseFloat(formData.prizePool) || 0;


      const payload = {
        title: formData.title,
        description: formData.description,
        startDate: formData.startDate,           // YYYY-MM-DD (Zod expects this)
        startTime: formData.startTime,           // HH:MM     (Zod expects this)
        duration: parseInt(formData.duration),
        registrationFee: parseFloat(formData.registrationFee) || 0,  // exact Zod field name
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
        // Build a human-readable error message from Zod validation details if present
        if (json?.error?.details?.length > 0) {
          const msgs = json.error.details.map(d => `${d.field}: ${d.message}`).join('\n');
          throw new Error(msgs);
        }
        throw new Error(json?.error?.message || json?.message || 'Failed to create contest');
      }

      setShowCreateForm(false);
      fetchContests();
    } catch (err) {
      console.error('Create contest error:', err);
      // Re-throw so the modal's catch block can display it inside the modal
      setCreateError(err.message);
      throw err;
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Contest Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Create and manage quiz contests</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setCreateError(''); setShowCreateForm(true); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg"
            >
              <Plus className="w-4 h-4" /> <span>Create Contest</span>
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
