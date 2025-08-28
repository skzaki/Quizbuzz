import { Send, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import ErrorBoundary from './ErrorBoundary';

const CertificateModal = ({ contest, participants, onClose, onIssue }) => {
  const [isIssuing, setIsIssuing] = useState(false);

  // Calculate certificate eligibility
  const certificateStats = useMemo(() => {
    const eligible = participants.filter(p => p.score && p.score >= contest.passingScore);
    const alreadyIssued = participants.filter(p => p.certificateIssued);
    const pending = eligible.filter(p => !p.certificateIssued);

    return {
      eligible: eligible.length,
      alreadyIssued: alreadyIssued.length,
      pending: pending.length,
      pendingParticipants: pending
    };
  }, [participants, contest.passingScore]);

  const handleIssueCertificates = async () => {
    setIsIssuing(true);
    
    try {
      // TODO: Replace with actual API call to issue certificates
      // await fetch(`/api/admin/contests/${contest.id}/certificates/issue`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     participantIds: certificateStats.pendingParticipants.map(p => p.id)
      //   })
      // });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onIssue();
    } catch (error) {
      console.error('Failed to issue certificates:', error);
      alert('Failed to issue certificates. Please try again.');
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <ErrorBoundary>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md relative">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isIssuing}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-full">
            <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Issue Certificates</h3>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Issue certificates to all participants who scored {contest.passingScore}% or above.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Eligible participants:</span>
                <span>{certificateStats.eligible}</span>
              </div>
              <div className="flex justify-between">
                <span>Already issued:</span>
                <span>{certificateStats.alreadyIssued}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Pending:</span>
                <span>{certificateStats.pending}</span>
              </div>
            </div>
          </div>

          {certificateStats.pending > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Participants receiving certificates:
              </h4>
              <div className="max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="space-y-1">
                  {certificateStats.pendingParticipants.map((participant) => (
                    <div key={participant.id} className="text-sm text-gray-700 dark:text-gray-300 flex justify-between">
                      <span>{participant.name}</span>
                      <span className="font-medium">{participant.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {certificateStats.pending === 0 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                No certificates are pending. All eligible participants already have certificates issued.
              </p>
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isIssuing}
            className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleIssueCertificates}
            disabled={isIssuing || certificateStats.pending === 0}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isIssuing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Issuing...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Issue {certificateStats.pending} Certificates</span>
              </>
            )}
          </button>
        </div>
      </div>

      </ErrorBoundary>
    </div>
  );
};

export default CertificateModal;