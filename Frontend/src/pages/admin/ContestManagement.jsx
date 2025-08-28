// ContestManagement.jsx
import {
    Calendar,
    Plus
} from 'lucide-react';
import { Suspense, lazy, useEffect, useState } from 'react';
import ErrorBoundary from '../../components/ErrorBoundary';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

// Lazy load components
const ContestTable = lazy(() => import('../../components/ContestManagement/ContestTable'));
const CreateContestModal = lazy(() => import('../../components/ContestManagement/CreateContestModal'));
const ContestFilters = lazy(() => import('../../components/ContestManagement/ContestFilters'));



const ContestManagement = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContests, setTotalContests] = useState(0);
  const [itemsPerPage] = useState(10);

  // Mock data - Replace with actual API call
  const mockContests = [
    {
      id: '1',
      title: 'JavaScript Fundamentals',
      description: 'Test your JavaScript knowledge with this comprehensive quiz',
      date: '2024-01-25',
      time: '14:00',
      duration: 120,
      registrationCount: 45,
      registrationFee: 25,
      prizePool: 500,
      status: 'upcoming',
      topics: ['JavaScript', 'ES6', 'Async/Await']
    },
    {
      id: '2',
      title: 'React Developer Challenge',
      description: 'Advanced React concepts and best practices',
      date: '2024-01-28',
      time: '16:00',
      duration: 180,
      registrationCount: 32,
      registrationFee: 50,
      prizePool: 1000,
      status: 'draft',
      topics: ['React', 'Hooks', 'Context API']
    },
    {
      id: '3',
      title: 'CSS Masters',
      description: 'Master modern CSS techniques and layouts',
      date: '2024-01-20',
      time: '10:00',
      duration: 90,
      registrationCount: 78,
      registrationFee: 0,
      prizePool: 300,
      status: 'completed',
      topics: ['CSS', 'Flexbox', 'Grid']
    }
  ];

  // Fetch contests with pagination and filters
  useEffect(() => {
    fetchContests();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchContests = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/contests?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}&status=${statusFilter}`);
      // const data = await response.json();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock filtered data
      const filtered = mockContests.filter(contest => {
        const matchesSearch = contest.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || contest.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
      
      setContests(filtered);
      setTotalContests(filtered.length);
      setTotalPages(Math.ceil(filtered.length / itemsPerPage));
      setError(null);
    } catch (err) {
      setError('Failed to fetch contests');
      console.error('Error fetching contests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContest = async (contestData) => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/contests', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(contestData)
      // });
      // const newContest = await response.json();
      
      console.log('Creating contest:', contestData);
      setShowCreateForm(false);
      fetchContests(); // Refresh the list
    } catch (err) {
      console.error('Error creating contest:', err);
    }
  };

  const handleEditContest = async (contestId, updates) => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/contests/${contestId}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(updates)
      // });
      // const updatedContest = await response.json();
      
      console.log('Updating contest:', contestId, updates);
      fetchContests(); // Refresh the list
    } catch (err) {
      console.error('Error updating contest:', err);
    }
  };

  const handleDeleteContest = async (contestId) => {
    if (!window.confirm('Are you sure you want to delete this contest?')) return;
    
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/contests/${contestId}`, { method: 'DELETE' });
      
      console.log('Deleting contest:', contestId);
      fetchContests(); // Refresh the list
    } catch (err) {
      console.error('Error deleting contest:', err);
    }
  };

  const handleStatusChange = async (contestId, newStatus) => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/contests/${contestId}/status`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ status: newStatus })
      // });
      
      console.log('Changing status:', contestId, newStatus);
      fetchContests(); // Refresh the list
    } catch (err) {
      console.error('Error changing status:', err);
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
            onClick={() => setShowCreateForm(true)}
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

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Contest Table */}
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

      {/* Create Contest Modal */}
      <ErrorBoundary>
        {showCreateForm && (
            <Suspense fallback={<LoadingSpinner />}>
            <CreateContestModal
                isOpen={showCreateForm}
                onClose={() => setShowCreateForm(false)}
                onSubmit={handleCreateContest}
            />
            </Suspense>
        )}
        </ErrorBoundary>
    </div>
    </ErrorBoundary>
  );
};

export default ContestManagement;