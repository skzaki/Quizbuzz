// components/ContestTable.jsx
import {
    ChevronLeft, ChevronRight,
    DollarSign,
    Edit,
    Eye, Play, Square,
    Trash2,
    Trophy,
    Users
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import ErrorBoundary from '../ErrorBoundary';

// Lazy load Badge component
const Badge = lazy(() => import('../UI/Badge'));

const LoadingRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
    </td>
    <td className="px-6 py-4">
      <div className="flex space-x-2">
        <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </td>
  </tr>
);

const ContestTable = ({ 
  contests, 
  loading, 
  onEdit, 
  onDelete, 
  onStatusChange,
  currentPage,
  totalPages,
  totalContests,
  onPageChange
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'info';
      case 'ongoing': return 'warning';
      case 'completed': return 'success';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const handleStatusAction = (contestId, currentStatus) => {
    let newStatus;
    if (currentStatus === 'draft') {
      newStatus = 'upcoming';
    } else if (currentStatus === 'ongoing') {
      newStatus = 'completed';
    }
    
    if (newStatus) {
      onStatusChange(contestId, newStatus);
    }
  };

  const Pagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-700">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing {Math.min((currentPage - 1) * 10 + 1, totalContests)} to{' '}
          {Math.min(currentPage * 10, totalContests)} of {totalContests} contests
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          {pages.map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 text-sm rounded ${
                page === currentPage
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <ErrorBoundary>
          
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contest
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Participants
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Fee/Prize
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              // Show loading skeletons
              Array(5).fill(0).map((_, index) => <LoadingRow key={index} />)
            ) : contests.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  No contests found
                </td>
              </tr>
            ) : (
              contests.map((contest) => (
                <tr key={contest.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div>
                      <Link
                        to={`/admin/contests/${contest.id}`}
                        className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                      >
                        {contest.title}
                      </Link>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {contest.description}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {contest.topics.map((topic, index) => (
                          <Suspense key={index} fallback={<span className="text-xs bg-gray-200 dark:bg-gray-700 rounded px-2 py-1">{topic}</span>}>
                            <Badge variant="default" size="sm">
                              {topic}
                            </Badge>
                          </Suspense>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <div>{contest.date}</div>
                    <div className="text-gray-500 dark:text-gray-400">{contest.time}</div>
                    <div className="text-gray-500 dark:text-gray-400">{contest.duration} min</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1 text-sm text-gray-900 dark:text-white">
                      <Users className="h-4 w-4" />
                      <span>{contest.registrationCount}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4" />
                      <span>${contest.registrationFee}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                      <Trophy className="h-4 w-4" />
                      <span>${contest.prizePool}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Suspense fallback={<span className="inline-block w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>}>
                      <Badge variant={getStatusColor(contest.status)}>
                        {contest.status}
                      </Badge>
                    </Suspense>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <Link
                        to={`/admin/contests/${contest.id}`}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button 
                        className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        title="Edit Contest"
                        onClick={() => onEdit(contest.id, contest)}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {contest.status === 'draft' && (
                        <button 
                          className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                          title="Publish Contest"
                          onClick={() => handleStatusAction(contest.id, contest.status)}
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      {contest.status === 'ongoing' && (
                        <button 
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="End Contest"
                          onClick={() => handleStatusAction(contest.id, contest.status)}
                        >
                          <Square className="h-4 w-4" />
                        </button>
                      )}
                      <button 
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete Contest"
                        onClick={() => onDelete(contest.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </ErrorBoundary>
      {/* Pagination */}
      <Pagination />
    </div>
  );
};

export default ContestTable;