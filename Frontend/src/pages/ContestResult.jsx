import { Award, Clock, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LeaderBoard from "../components/Result/LeaderBoard";
import ResultTable from "../components/Result/ResultTable";
import downloadCertificate from "../utils/downloadCertificate";

const ContestResult = () => {
  const { submissionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [resultData, setResultData] = useState(null);
  const [error, setError] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const [activeTab, setActiveTab] = useState("your-result");

  const formatDuration = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = ms % 1000;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

  const navigate = useNavigate();

  const fetchSubmissionResults = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_URL}/contests/${submissionId}/results`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Submission not found');
        } else if (response.status === 403) {
          throw new Error('Unauthorized to view this submission');
        } else if (response.status === 400) {
          throw new Error('Invalid submission ID');
        } else {
          throw new Error('Failed to fetch submission results');
        }
      }

      const data = await response.json();
      console.log(`message: ${data.message}: submissionId: ${data.submissionId}: contestID: ${data.contestId}`);
      return data;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  };

  useEffect(() => {
    let pollInterval;
    
    const pollSubmissionResults = async () => {
      try {
        const data = await fetchSubmissionResults();
        
        if (data.status === 'evaluated') {
          // Submission is evaluated, set complete results
          setResultData({
            ...data,
            correctAnswers: data.correctAnswers || data.score,
            answers: data.questions || [] // Map questions array to answers for backward compatibility
          });
          
          

          setLoading(false);
          
          if (pollInterval) {
            clearInterval(pollInterval);
          }
        } else if (data.status === 'processing' || data.status === 'pending') {
          // Still processing, continue polling
          setPollCount(prev => prev + 1);
          if (pollCount >= 60) { // Stop polling after 5 minutes (60 * 5s intervals)
            setError('Evaluation is taking longer than expected. Please check back later.');
            setLoading(false);
            if (pollInterval) {
              clearInterval(pollInterval);
            }
          }
        } else if (data.status === 'failed') {
          setError('Submission evaluation failed. Please contact support.');
          setLoading(false);
          if (pollInterval) {
            clearInterval(pollInterval);
          }
        }
        
      } catch (err) {
        setError(err.message);
        setLoading(false);
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      }
    };

    // Initial fetch
    pollSubmissionResults();

    // Set up polling interval for processing submissions
    pollInterval = setInterval(pollSubmissionResults, 5000); // Poll every 5 seconds

    // Cleanup on unmount
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        
      }
    };
  }, [submissionId, pollCount]);
 

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            {pollCount > 0 ? 'Evaluating your submission...' : 'Loading result...'}
          </p>
          {pollCount > 0 && (
            <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4 mr-1" />
              <span>This may take a few minutes</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/contest/join')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!resultData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">No result data available.</p>
      </div>
    );
  }

  const percentage = resultData.percentage || Math.round((resultData.correctAnswers / resultData.totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Score Card */}
<div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl p-6 md:p-10 text-white shadow-lg mb-6">
    <div className="flex flex-col gap-4">
        {/* Header */}
        <h1 className="text-xl md:text-3xl font-bold">{resultData.userName || 'Your Result'}</h1>
        
        {/* Score and Submitted Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-md">
                 <span className="font-bold"> Score: {resultData.score}</span> / {resultData.totalQuestions} 
            </p>
            <p className="text-sm opacity-90">
                Submitted: {
                    new Date(resultData.createdAt).toLocaleTimeString('en-US', { 
                        hour12: true, 
                        hour: '2-digit',
                        minute: '2-digit', 
                        second: '2-digit'
                    }).replace(/(\d{2}:\d{2}:\d{2})(\s[AP]M)/, `$1.${new Date(resultData.createdAt).getMilliseconds().toString().padStart(3, '0')}$2`)
                }
            </p>
            <p className="text-sm opacity-90">
                Time taken: {
                    (() => {
                        const startTime = new Date(resultData.contestStartTime).getTime();
                        const endTime = new Date(resultData.createdAt).getTime();
                        
                        const timeTaken = endTime - startTime; // This will be 344979 ms (5 min 44.979 sec)
                        
                        const totalSeconds = Math.floor(timeTaken / 1000);
                        const minutes = Math.floor(totalSeconds / 60);
                        const seconds = totalSeconds % 60;
                        const milliseconds = timeTaken % 1000;
                        
                        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
                    })()
                }
            </p>
        </div>
        
        {/* Percentage and Evaluated Row */}
        {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <span className="text-md font-bold">{percentage}%</span>
            </div>
            
        </div> */}
        
        {/* Download Certificate Button */}
        <div className="mt-2">
            <button
                onClick={() => downloadCertificate(resultData.userName, 'pdf')}
                className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black px-5 py-3 rounded-lg font-semibold shadow-md transition-colors"
            >
                <Award className="h-5 w-5" />
                Download Certificate
            </button>
        </div>
    </div>
</div>

        {/* Tabs Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("your-result")}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "your-result"
                    ? "border-purple-500 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Your Result
              </button>
              {/* <button
                onClick={() => setActiveTab("leaderboard")}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "leaderboard"
                    ? "border-purple-500 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Leader Board
              </button> */}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "your-result" && (
          <ResultTable resultData={resultData} />
        )}

        {activeTab === "leaderboard" && (
            
          <LeaderBoard 
            contestId={resultData.contestId} 
            currentUserId={resultData.userId} 
          />
        )}

      </div>
    </div>
  );
};

export default ContestResult;

