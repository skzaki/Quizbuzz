import { Clock, Crown, Loader2, Medal, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

const LeaderBoard = ({ contestId, currentUserId }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  console.log(`Leader: ${contestId}`);
  const fetchLeaderboard = async () => {
    if (!contestId) return;

    try {
      setLoading(true);
      setError(null);
      
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_URL}/contests/${contestId}/leaderboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('API request was not successful');
      }

      // Sort by score (desc), then by createdAt (asc) for same scores
      const sortedData = data.submissions?.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return new Date(a.createdAt) - new Date(b.createdAt);
      }) || [];
      
      setLeaderboardData(sortedData);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [contestId]);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Trophy className="h-5 w-5 text-orange-600" />;
      default:
        return null;
    }
  };

  const getRankBadgeColor = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 3:
        return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const calculateRank = (submissions, currentIndex) => {
    if (currentIndex === 0) return 1;
    
    const currentSubmission = submissions[currentIndex];
    const previousSubmission = submissions[currentIndex - 1];
    
    // If same score and same submission time, same rank
    if (currentSubmission.score === previousSubmission.score &&
        new Date(currentSubmission.createdAt).getTime() === new Date(previousSubmission.createdAt).getTime()) {
      return calculateRank(submissions, currentIndex - 1);
    }
    
    // If same score but different submission time, different rank
    if (currentSubmission.score === previousSubmission.score) {
      return currentIndex + 1;
    }
    
    // Different score, different rank
    return currentIndex + 1;
  };

  const calculateTimeTaken = (submittedAt, contestStartTime) => {
    if (!submittedAt || !contestStartTime) return 'N/A';
    
    const startTime = new Date(contestStartTime);
    const endTime = new Date(submittedAt);
    const timeDiff = endTime - startTime;
    
    if (timeDiff < 0) return 'N/A';
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    const milliseconds = timeDiff % 1000;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s ${milliseconds}ms`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s ${milliseconds}ms`;
    } else {
      return `${seconds}s ${milliseconds}ms`;
    }
  };

  const calculatePercentage = (score, totalQuestions) => {
    return totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Contest Leaderboard
          </h2>
        </div>
        <div className="p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Contest Leaderboard
          </h2>
        </div>
        <div className="p-8 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (leaderboardData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Contest Leaderboard
          </h2>
        </div>
        <div className="p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No submissions found for this contest.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          QuizBuzz-3
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {leaderboardData.length} participants
        </p>
      </div>
      
      <div className="overflow-y-auto h-[65vh]">
        <table className="w-full text-sm md:text-base border-collapse">
          <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 z-10">
            <tr>
              <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Rank</th>
              <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Participant</th>
              <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Score</th>
              <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Time Taken</th>
              <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">College</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((submission, idx) => {
              const rank = calculateRank(leaderboardData, idx);
              const isCurrentUser = submission.userId._id === currentUserId;
              const percentage = calculatePercentage(submission.score, submission.totalQuestions);
              const timeTaken = calculateTimeTaken(submission.createdAt, submission.contestId.startTime);
              
              return (
                <tr
                  key={submission._id}
                  className={`border-b border-gray-200 dark:border-gray-700 transition-colors ${
                    isCurrentUser 
                      ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700" 
                      : idx % 2 === 0 
                        ? "bg-gray-50 dark:bg-gray-900/20" 
                        : "hover:bg-gray-50 dark:hover:bg-gray-900/10"
                  }`}
                >
                  {/* Rank */}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getRankBadgeColor(rank)}`}>
                        {rank}
                      </span>
                      {getRankIcon(rank)}
                    </div>
                  </td>
                  
                  {/* Participant */}
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className={`font-medium ${isCurrentUser ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-white'}`}>
                        {submission.userId.firstName} {submission.userId.lastName}
                        {isCurrentUser && (
                          <span className="ml-2 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-full">
                            You
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {submission.userId.registrationId || 'N/A'}
                      </span>
                    </div>
                  </td>
                  
                  {/* Score */}
                  <td className="p-3 text-gray-800 dark:text-gray-200 font-semibold">
                    {submission.score} 
                  </td>
                  
                  {/* Time Taken */}
                  <td className="p-3 text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-8" />
                      <span className="text-sm font-medium">
                        {timeTaken}
                      </span>
                    </div>
                  </td>

                  {/* College */}
                  <td className="p-3">
                    <span className="text-gray-700 dark:text-gray-300 text-sm">
                      {submission.userId.college || 'N/A'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaderBoard;