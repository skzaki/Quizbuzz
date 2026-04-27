import { Plus } from 'lucide-react';
import { Suspense, lazy, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ErrorBoundary from '../../components/ErrorBoundary';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { useAdminContests } from '../../hooks/useAdminContests';
import { useAdminDomains } from '../../hooks/useAdminDomains';
import { DEFAULT_CONTEST_RULES } from '../../utils/defaultContestRules';
import { normalizeDomainDistribution } from '../../utils/domainDistribution';

const ContestTable = lazy(() => import('../../components/ContestManagement/ContestTable'));
const CreateContestModal = lazy(() => import('../../components/ContestManagement/CreateContestModal'));
const ContestFilters = lazy(() => import('../../components/ContestManagement/ContestFilters'));

const BASE_URL = `${import.meta.env.VITE_URL}/admin`;

const ContestManagement = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingContest, setEditingContest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createError, setCreateError] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchParams, setSearchParams] = useSearchParams();

  const token = localStorage.getItem("authToken");

  const { domains: domainOptions } = useAdminDomains({
    baseUrl: BASE_URL,
    token
  });

  const {
    contests,
    totalPages,
    totalItems: totalContests,
    overview,
    loading,
    error,
    refetchAll
  } = useAdminContests({
    baseUrl: BASE_URL,
    token,
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm,
    status: statusFilter
  });

  useEffect(() => {
    if (searchParams.get('openCreate') === 'true') {
      setShowCreateForm(true);
      // Clean up the URL to prevent reopening on refresh
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('openCreate');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const buildContestPayload = (formData) => {
    const rulesRaw = formData.rules || '';
    const rulesArray = rulesRaw
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    if (rulesArray.length === 0) {
      rulesArray.push(...DEFAULT_CONTEST_RULES);
    }

    const topicsRaw = Array.isArray(formData.topics)
      ? formData.topics
      : (formData.topics || '').split(',').map((t) => t.trim()).filter(Boolean);

    const prizeAmount = parseFloat(formData.prizePool) || 0;
    const parsedMaxParticipants = Number(formData.maxParticipants);
    const domainDistribution = normalizeDomainDistribution(
      topicsRaw,
      Array.isArray(formData.domainDistribution) ? formData.domainDistribution : []
    );

    return {
      title: formData.title,
      description: formData.description,
      startDate: formData.startDate,
      startTime: formData.startTime,
      duration: parseInt(formData.duration),
      registrationFee: parseFloat(formData.registrationFee) || 0,
      maxParticipants: Number.isFinite(parsedMaxParticipants)
        ? Math.max(0, Math.trunc(parsedMaxParticipants))
        : 100,
      topics: topicsRaw,
      domainDistribution,
      rules: rulesArray,
      prizes: [
        {
          rankFrom: 1,
          rankTo: 1,
          amount: prizeAmount,
          currency: 'INR',
          benefits: []
        }
      ],
      status: formData.status || 'draft',
    };
  };

  const handleOpenCreate = () => {
    setCreateError('');
    setEditingContest(null);
    setShowCreateForm(true);
  };

  const handleOpenEdit = async (contest) => {
    setCreateError('');
    setEditingContest(contest);
    setShowCreateForm(true);

    try {
      const contestId = contest.id || contest._id;
      const res = await fetch(`${BASE_URL}/contests/${contestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error?.message || json?.message || 'Failed to fetch contest details');
      }

      if (json?.data) {
        setEditingContest(json.data);
      }
    } catch (err) {
      console.error('Fetch contest details error:', err);
      setCreateError(err.message);
    }
  };

  const handleModalClose = () => {
    setShowCreateForm(false);
    setEditingContest(null);
    setCreateError('');
  };

  const handleCreateContest = async (formData) => {
    setCreateError('');
    try {
      const payload = buildContestPayload(formData);

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
      setEditingContest(null);
      await refetchAll();
    } catch (err) {
      console.error('Create contest error:', err);
      // Re-throw so the modal's catch block can display it inside the modal
      setCreateError(err.message);
      throw err;
    }
  };

  const handleUpdateContest = async (contestId, formData) => {
    setCreateError('');
    try {
      const payload = buildContestPayload(formData);

      const res = await fetch(`${BASE_URL}/contests/${contestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (!res.ok) {
        if (json?.error?.details?.length > 0) {
          const msgs = json.error.details.map((d) => `${d.field}: ${d.message}`).join('\n');
          throw new Error(msgs);
        }
        throw new Error(json?.error?.message || json?.message || 'Failed to update contest');
      }

      setShowCreateForm(false);
      setEditingContest(null);
      await refetchAll();
    } catch (err) {
      console.error('Update contest error:', err);
      setCreateError(err.message);
      throw err;
    }
  };

  const handleSubmitContest = async (formData) => {
    if (editingContest) {
      const contestId = editingContest.id || editingContest._id;
      return handleUpdateContest(contestId, formData);
    }
    return handleCreateContest(formData);
  };

  const handleCheckContestReadiness = async (formData) => {
    const payload = {
      topics: Array.isArray(formData.topics)
        ? formData.topics
        : (formData.topics || '').split(',').map((topic) => topic.trim()).filter(Boolean),
      domainDistribution: Array.isArray(formData.domainDistribution) ? formData.domainDistribution : [],
      requiredQuestionCount: Number(formData.requiredQuestionCount) > 0
        ? Number(formData.requiredQuestionCount)
        : undefined
    };

    const res = await fetch(`${BASE_URL}/contests/readiness`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!res.ok) {
      if (json?.error?.details?.length > 0) {
        const msgs = json.error.details.map((d) => `${d.field}: ${d.message}`).join('\n');
        throw new Error(msgs);
      }

      throw new Error(json?.error?.message || json?.message || 'Failed to check readiness');
    }

    return json?.data;
  };

  const handleDeleteContest = async (contestId) => {
    if (!window.confirm("Delete this contest?")) return;
    try {
      const res = await fetch(`${BASE_URL}/contests/${contestId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error?.message || 'Failed to delete contest');
      }

      await refetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (contestId, newStatus) => {
    try {
      const res = await fetch(`${BASE_URL}/contests/${contestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error?.message || 'Failed to update status');
      }

      await refetchAll();
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
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg"
            >
              <Plus className="w-4 h-4" /> <span>Create Contest</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: overview.totalContests },
            { label: 'Draft', value: overview.statusSummary?.draft || 0 },
            { label: 'Upcoming', value: overview.statusSummary?.upcoming || 0 },
            { label: 'Ongoing', value: overview.statusSummary?.ongoing || 0 },
            { label: 'Completed', value: overview.statusSummary?.completed || 0 },
            { label: 'Participants', value: overview.totalParticipants || 0 }
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3"
            >
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{item.value}</p>
            </div>
          ))}
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
              onEdit={handleOpenEdit}
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
                onClose={handleModalClose}
                onSubmit={handleSubmitContest}
                onCheckReadiness={handleCheckContestReadiness}
                editData={editingContest}
                serverError={createError}
                domainOptions={domainOptions.map((domain) => domain.value)}
              />
            </Suspense>
          )}
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
};

export default ContestManagement;
