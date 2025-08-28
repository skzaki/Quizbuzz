import {
    AlertCircle,
    CheckCircle,
    Eye,
    MoreVertical,
    Search,
    Star,
    XCircle
} from 'lucide-react';
import { useMemo, useState } from 'react';
import ErrorBoundary from '../ErrorBoundary';
import Badge from '../UI/Badge';

const ParticipantsTab = ({ contest, participants, setParticipants }) => {
  const [participantFilter, setParticipantFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Memoized filtered participants for performance with large datasets
  const filteredParticipants = useMemo(() => {
    return participants.filter(participant => {
      const matchesSearch = participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           participant.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = participantFilter === 'all' ||
                           (participantFilter === 'paid' && participant.paymentStatus === 'paid') ||
                           (participantFilter === 'unpaid' && participant.paymentStatus === 'unpaid') ||
                           (participantFilter === 'completed' && participant.score !== undefined) ||
                           (participantFilter === 'certified' && participant.certificateIssued);
      return matchesSearch && matchesFilter;
    });
  }, [participants, searchTerm, participantFilter]);

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'unpaid': return 'error';
      case 'refunded': return 'warning';
      default: return 'default';
    }
  };

  const handleViewSubmission = async (submissionId) => {
    try {
      // TODO: Replace with actual API call to fetch submission details
      // const response = await fetch(`/api/admin/submissions/${submissionId}`);
      // const submissionData = await response.json();
      // Navigate to submission detail page or open modal
      console.log('Viewing submission:', submissionId);
    } catch (error) {
      console.error('Failed to fetch submission:', error);
    }
  };

  const handleParticipantAction = async (participantId, action) => {
    try {
      // TODO: Replace with actual API call for participant actions
      // await fetch(`/api/admin/participants/${participantId}/${action}`, {
      //   method: 'POST'
      // });
      console.log(`Performing ${action} on participant:`, participantId);
      
      // Update local state based on action
      if (action === 'issue-certificate') {
        setParticipants(prev => 
          prev.map(p => 
            p.id === participantId 
              ? { ...p, certificateIssued: true }
              : p
          )
        );
      }
    } catch (error) {
      console.error(`Failed to ${action} participant:`, error);
    }
  };

  return (
    <ErrorBoundary>
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search participants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={participantFilter}
            onChange={(e) => setParticipantFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Participants</option>
            <option value="paid">Paid Only</option>
            <option value="unpaid">Unpaid Only</option>
            <option value="completed">Completed Test</option>
            <option value="certified">Certified</option>
          </select>
        </div>
        
        {/* Results count */}
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredParticipants.length} of {participants.length} participants
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredParticipants.map((participant) => (
                <tr key={participant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {participant.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {participant.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={getPaymentStatusColor(participant.paymentStatus)}>
                      {participant.paymentStatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(participant.registrationDate).toLocaleDateString()}
                    </div>
                  </td>
                  {contest.status === 'completed' && (
                    <>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {participant.score ? `${participant.score}%` : 'N/A'}
                        </div>
                        {participant.timeTaken && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {participant.timeTaken} min
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {participant.rank && (
                          <div className="flex items-center space-x-1">
                            {participant.rank <= 3 && <Star className="h-4 w-4 text-yellow-500" />}
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              #{participant.rank}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {participant.certificateIssued ? (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600 dark:text-green-400">Issued</span>
                          </div>
                        ) : participant.score && participant.score >= contest.passingScore ? (
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm text-orange-600 dark:text-orange-400">Pending</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <XCircle className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">N/A</span>
                          </div>
                        )}
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      {participant.submissionId && (
                        <button 
                          onClick={() => handleViewSubmission(participant.submissionId)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View Submission"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <ParticipantActionsDropdown
                        participant={participant}
                        contest={contest}
                        onAction={handleParticipantAction}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredParticipants.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No participants found matching your criteria.
            </div>
          )}
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default ParticipantsTab;



// Separate component for participant actions dropdown
const ParticipantActionsDropdown = ({ participant, contest, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      label: 'View Details',
      action: 'view-details',
      condition: true
    },
    {
      label: 'Send Email',
      action: 'send-email',
      condition: true
    },
    {
      label: 'Issue Certificate',
      action: 'issue-certificate',
      condition: contest.status === 'completed' && 
                participant.score >= contest.passingScore && 
                !participant.certificateIssued
    },
    {
      label: 'Refund Payment',
      action: 'refund-payment',
      condition: participant.paymentStatus === 'paid'
    }
  ].filter(action => action.condition);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <>
          {/* Overlay to close dropdown */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="absolute right-0 top-0 z-20 mt-6 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="py-1">
              {actions.map((action) => (
                <button
                  key={action.action}
                  onClick={() => {
                    onAction(participant.id, action.action);
                    setIsOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};