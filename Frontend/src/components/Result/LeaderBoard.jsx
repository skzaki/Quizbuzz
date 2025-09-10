import { Crown, Loader2, Medal, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

const LeaderBoard = ({ contestId, currentUserId }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sample leaderboard data - replace with actual API call
  const sampleLeaderboardData = [
    {
      _id: "1",
      userId: {
        _id: "user1",
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com"
      },
      score: 95,
      totalQuestions: 100,
      percentage: 95,
      createdAt: "2024-01-15T10:30:00Z",
      updatedAt: "2024-01-15T10:45:00Z"
    },
    {
      _id: "2",
      userId: {
        _id: "user2",
        firstName: "Bob",
        lastName: "Smith",
        email: "bob@example.com"
      },
      score: 92,
      totalQuestions: 100,
      percentage: 92,
      createdAt: "2024-01-15T10:25:00Z",
      updatedAt: "2024-01-15T10:40:00Z"
    },
    {
      _id: "3",
      userId: {
        _id: "user3",
        firstName: "Charlie",
        lastName: "Brown",
        email: "charlie@example.com"
      },
      score: 88,
      totalQuestions: 100,
      percentage: 88,
      createdAt: "2024-01-15T10:35:00Z",
      updatedAt: "2024-01-15T10:50:00Z"
    },
    {
      _id: "4",
      userId: {
        _id: "user4",
        firstName: "Diana",
        lastName: "Prince",
        email: "diana@example.com"
      },
      score: 88,
      totalQuestions: 100,
      percentage: 88,
      createdAt: "2024-01-15T10:32:00Z", // Same score as Charlie but submitted earlier
      updatedAt: "2024-01-15T10:47:00Z"
    },
    {
      _id: "5",
      userId: {
        _id: "user5",
        firstName: "Edward",
        lastName: "Wilson",
        email: "edward@example.com"
      },
      score: 85,
      totalQuestions: 100,
      percentage: 85,
      createdAt: "2024-01-15T10:40:00Z",
      updatedAt: "2024-01-15T10:55:00Z"
    },
    {
      _id: "6",
      userId: {
        _id: "user6",
        firstName: "Frank",
        lastName: "Miller",
        email: "frank@example.com"
      },
      score: 82,
      totalQuestions: 100,
      percentage: 82,
      createdAt: "2024-01-15T10:45:00Z",
      updatedAt: "2024-01-15T11:00:00Z"
    }
  ];

  const fetchLeaderboard = async () => {
    // if (!contestId) return;

    /* 
    // Actual API call - uncomment and modify as needed
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
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      
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
    */

    // Using sample data for now
    setLoading(true);
    setError(null);
    
    setTimeout(() => {
      try {
        // Sort by score (desc), then by createdAt (asc) for same scores
        const sortedData = [...sampleLeaderboardData].sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return new Date(a.createdAt) - new Date(b.createdAt);
        });
        setLeaderboardData(sortedData);
      } catch (err) {
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    }, 1000);
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
          Contest Leaderboard
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
              <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Percentage</th>
              <th className="p-3 text-left text-gray-900 dark:text-white font-semibold">Submitted At</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((submission, idx) => {
              const rank = calculateRank(leaderboardData, idx);
              const isCurrentUser = submission.userId._id === currentUserId;
              
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
                        {submission.userId.email}
                      </span>
                    </div>
                  </td>
                  
                  {/* Score */}
                  <td className="p-3 text-gray-800 dark:text-gray-200 font-semibold">
                    {submission.score}/{submission.totalQuestions}
                  </td>
                  
                  {/* Percentage */}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${
                        submission.percentage >= 80 
                          ? 'text-green-600 dark:text-green-400'
                          : submission.percentage >= 60 
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                      }`}>
                        {submission.percentage}%
                      </span>
                      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-600 rounded-full">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            submission.percentage >= 80 ? 'bg-green-400' : 
                            submission.percentage >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${submission.percentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  
                  {/* Submitted At */}
                  <td className="p-3 text-gray-600 dark:text-gray-400">
                    <div className="flex flex-col text-sm">
                      <span>{new Date(submission.createdAt).toLocaleDateString()}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {new Date(submission.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
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
