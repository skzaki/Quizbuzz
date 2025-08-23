import { Award, CheckCircle, Clock, Loader2, TrendingUp, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const ContestResult = () => {
  const { submissionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [resultData, setResultData] = useState(null);
  const [error, setError] = useState(null);
  const [pollCount, setPollCount] = useState(0);

  const fetchSubmissionResults = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_URL}/api/contests/${submissionId}/results`, {
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
      console.log(`message: ${data.message}: submissionId: ${data.submissionId}`);
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

  const handleDownloadCertificate = async () => {
    try {
      const authToken = localStorage.getItem('authauthToken');
      const response = await fetch(`${import.meta.env.VITE_URL}/api/contests/${submissionId}/certificate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download certificate');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${submissionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Certificate download error:', err);
      alert('Failed to download certificate. Please try again.');
    }
  };

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
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!resultData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">No result data available.</p>
      </div>
    );
  }

  const percentage = resultData.percentage || Math.round((resultData.correctAnswers / resultData.totalQuestions) * 100);
  const getScoreColor = () => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Score Card */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl p-6 md:p-10 text-white shadow-lg mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{resultData.userName}</h1>
              <div className="mt-2 space-y-1">
                <p className="text-lg">
                  Score:{" "}
                  <span className="font-bold">{resultData.correctAnswers}</span> /{" "}
                  {resultData.totalQuestions} Correct
                </p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-xl font-bold">{percentage}%</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {percentage >= 70 && (
                <button
                  onClick={handleDownloadCertificate}
                  className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black px-5 py-3 rounded-lg font-semibold shadow-md transition-colors"
                >
                  <Award className="h-5 w-5" />
                  Download Certificate
                </button>
              )}
              <div className="text-right text-sm opacity-90">
                <p>Submitted: {new Date(resultData.createdAt).toLocaleDateString()}</p>
                <p>Evaluated: {new Date(resultData.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          
          {/* Score Bar */}
          <div className="mt-6">
            <div className="bg-white/20 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-1000 ${
                  percentage >= 80 ? 'bg-green-400' : 
                  percentage >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Results Table */}
        {resultData.questions && resultData.questions.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Question-wise Results
              </h2>
            </div>
            <div className="overflow-y-auto h-[65vh]">
              <table className="w-full text-sm md:text-base border-collapse">
                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 z-10">
                  <tr>
                    <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Q#</th>
                    <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Question</th>
                    <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Your Answer</th>
                    <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Correct Answer</th>
                    <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Result</th>
                    <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {resultData.questions.map((question, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-gray-200 dark:border-gray-700 ${
                        idx % 2 === 0 ? "bg-gray-50 dark:bg-gray-900/20" : ""
                      }`}
                    >
                      <td className="p-3 text-gray-800 dark:text-gray-200 font-medium">
                        {question.questionNo}
                      </td>
                      <td className="p-3 text-gray-800 dark:text-gray-200 max-w-xs">
                        <div className="truncate" title={question.questionText}>
                          {question.questionText}
                        </div>
                        {question.difficulty && (
                          <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                            question.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {question.difficulty}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-gray-800 dark:text-gray-200">
                        <span className={`${question.isCorrect ? 'text-gray-800 dark:text-gray-200' : 'text-red-600 dark:text-red-400'}`}>
                          {question.userAnswer || 'No answer'}
                        </span>
                      </td>
                      <td className="p-3 text-green-600 dark:text-green-400 font-medium">
                        {question.correctAnswer}
                      </td>
                      <td className="p-3">
                        {question.isCorrect ? (
                          <div className="flex items-center text-green-600 dark:text-green-400">
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Correct
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600 dark:text-red-400">
                            <XCircle className="h-5 w-5 mr-2" />
                            Incorrect
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-gray-800 dark:text-gray-200">
                        <span className="font-medium">
                          {question.points}/{question.maxPoints}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : resultData.answers && resultData.answers.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Question-wise Results (Basic)
              </h2>
            </div>
            <div className="overflow-y-auto h-[65vh]">
              <table className="w-full text-sm md:text-base border-collapse">
                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 z-10">
                  <tr>
                    <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Question No</th>
                    <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Result</th>
                    <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {resultData.answers.map((ans, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-gray-200 dark:border-gray-700 ${
                        idx % 2 === 0 ? "bg-gray-50 dark:bg-gray-900/20" : ""
                      }`}
                    >
                      <td className="p-3 text-gray-800 dark:text-gray-200">
                        {ans.questionNo || idx + 1}
                      </td>
                      <td className="p-3">
                        {ans.correct || ans.isCorrect ? (
                          <div className="flex items-center text-green-600 dark:text-green-400">
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Correct
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600 dark:text-red-400">
                            <XCircle className="h-5 w-5 mr-2" />
                            Incorrect
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-gray-800 dark:text-gray-200">
                        {ans.points || (ans.correct || ans.isCorrect ? 1 : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Results Summary
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Your submission has been evaluated successfully. Detailed question-wise results are not available.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ContestResult;