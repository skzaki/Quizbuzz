import { useMemo } from 'react';
import ErrorBoundary from '../ErrorBoundary';

const AnalyticsTab = ({ contest, participants }) => {
  // Memoized analytics calculations for performance
  const analytics = useMemo(() => {
    const totalRegistered = participants.length;
    const totalParticipated = participants.filter(p => p.score !== undefined).length;
    const averageScore = participants.filter(p => p.score).reduce((sum, p) => sum + (p.score || 0), 0) / participants.filter(p => p.score).length || 0;
    const completionRate = totalRegistered > 0 ? (totalParticipated / totalRegistered) * 100 : 0;
    const totalRevenue = participants.filter(p => p.paymentStatus === 'paid').length * contest.registrationFee;
    const certificatesIssued = participants.filter(p => p.certificateIssued).length;
    
    return {
      totalRegistered,
      totalParticipated,
      averageScore,
      completionRate,
      totalRevenue,
      certificatesIssued
    };
  }, [participants, contest.registrationFee]);

  // Memoized score distribution for performance
  const scoreDistribution = useMemo(() => {
    const participantsWithScores = participants.filter(p => p.score !== undefined);
    
    return [
      { 
        range: '90-100%', 
        count: participantsWithScores.filter(p => p.score >= 90).length,
        color: 'bg-green-500'
      },
      { 
        range: '80-89%', 
        count: participantsWithScores.filter(p => p.score >= 80 && p.score < 90).length,
        color: 'bg-blue-500'
      },
      { 
        range: '70-79%', 
        count: participantsWithScores.filter(p => p.score >= 70 && p.score < 80).length,
        color: 'bg-yellow-500'
      },
      { 
        range: '60-69%', 
        count: participantsWithScores.filter(p => p.score >= 60 && p.score < 70).length,
        color: 'bg-orange-500'
      },
      { 
        range: 'Below 60%', 
        count: participantsWithScores.filter(p => p.score < 60).length,
        color: 'bg-red-500'
      }
    ];
  }, [participants]);

  // Memoized time analysis
  const timeAnalysis = useMemo(() => {
    const participantsWithTime = participants.filter(p => p.timeTaken !== undefined);
    
    if (participantsWithTime.length === 0) {
      return {
        averageTime: 0,
        fastestTime: 0,
        slowestTime: 0
      };
    }

    const times = participantsWithTime.map(p => p.timeTaken);
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const fastestTime = Math.min(...times);
    const slowestTime = Math.max(...times);

    return {
      averageTime: Math.round(averageTime),
      fastestTime,
      slowestTime
    };
  }, [participants]);

  // Payment status breakdown
  const paymentBreakdown = useMemo(() => {
    return {
      paid: participants.filter(p => p.paymentStatus === 'paid').length,
      unpaid: participants.filter(p => p.paymentStatus === 'unpaid').length,
      refunded: participants.filter(p => p.paymentStatus === 'refunded').length
    };
  }, [participants]);

  return (
    <div className="space-y-6">
        <ErrorBoundary>

        
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contest Performance</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Registered</span>
                <span className="font-bold text-gray-900 dark:text-white">{analytics.totalRegistered}</span>
                </div>
                <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Participated</span>
                <span className="font-bold text-gray-900 dark:text-white">{analytics.totalParticipated}</span>
                </div>
                <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Completion Rate</span>
                <span className="font-bold text-gray-900 dark:text-white">{Math.round(analytics.completionRate)}%</span>
                </div>
                <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Average Score</span>
                <span className="font-bold text-gray-900 dark:text-white">{Math.round(analytics.averageScore)}%</span>
                </div>
                <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Revenue</span>
                <span className="font-bold text-green-600 dark:text-green-400">${analytics.totalRevenue}</span>
                </div>
                <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Certificates Issued</span>
                <span className="font-bold text-gray-900 dark:text-white">{analytics.certificatesIssued}</span>
                </div>
            </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Time Analysis</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Average Time</span>
                <span className="font-bold text-gray-900 dark:text-white">{timeAnalysis.averageTime} min</span>
                </div>
                <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Fastest Time</span>
                <span className="font-bold text-green-600 dark:text-green-400">{timeAnalysis.fastestTime} min</span>
                </div>
                <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Slowest Time</span>
                <span className="font-bold text-red-600 dark:text-red-400">{timeAnalysis.slowestTime} min</span>
                </div>
                <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Duration Limit</span>
                <span className="font-bold text-gray-900 dark:text-white">{contest.duration} min</span>
                </div>
            </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Breakdown</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">Paid</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{paymentBreakdown.paid}</span>
                </div>
                <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">Unpaid</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{paymentBreakdown.unpaid}</span>
                </div>
                <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">Refunded</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{paymentBreakdown.refunded}</span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Revenue Rate</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                    {analytics.totalRegistered > 0 ? Math.round((paymentBreakdown.paid / analytics.totalRegistered) * 100) : 0}%
                    </span>
                </div>
                </div>
            </div>
            </div>
        </div>

        {/* Score Distribution and Pass/Fail Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Score Distribution</h3>
            <div className="space-y-3">
                {scoreDistribution.map((item, index) => (
                <div key={index} className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded ${item.color}`}></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">{item.range}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item.count}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12">
                    {analytics.totalParticipated > 0 ? Math.round((item.count / analytics.totalParticipated) * 100) : 0}%
                    </span>
                </div>
                ))}
            </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pass/Fail Analysis</h3>
            <div className="space-y-4">
                {(() => {
                const passedCount = participants.filter(p => p.score && p.score >= contest.passingScore).length;
                const failedCount = participants.filter(p => p.score && p.score < contest.passingScore).length;
                const totalWithScores = passedCount + failedCount;
                
                return (
                    <>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600 dark:text-gray-400">Passed ({contest.passingScore}%+)</span>
                        </div>
                        <div className="text-right">
                        <div className="font-bold text-gray-900 dark:text-white">{passedCount}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {totalWithScores > 0 ? Math.round((passedCount / totalWithScores) * 100) : 0}%
                        </div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-gray-600 dark:text-gray-400">Failed</span>
                        </div>
                        <div className="text-right">
                        <div className="font-bold text-gray-900 dark:text-white">{failedCount}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {totalWithScores > 0 ? Math.round((failedCount / totalWithScores) * 100) : 0}%
                        </div>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Pass Rate</span>
                        <span className="font-bold text-green-600 dark:text-green-400">
                            {totalWithScores > 0 ? Math.round((passedCount / totalWithScores) * 100) : 0}%
                        </span>
                        </div>
                    </div>
                    </>
                );
                })()}
            </div>
            </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Performers</h3>
            <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rank</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Participant</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Score</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Certificate</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {participants
                    .filter(p => p.score !== undefined)
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .slice(0, 10)
                    .map((participant, index) => (
                    <tr key={participant.id}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                        #{index + 1}
                        </td>
                        <td className="px-4 py-2">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {participant.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {participant.email}
                        </div>
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                        {participant.score}%
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                        {participant.timeTaken} min
                        </td>
                        <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            participant.certificateIssued 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
                        }`}>
                            {participant.certificateIssued ? 'Issued' : 'Pending'}
                        </span>
                        </td>
                    </tr>
                    ))}
                </tbody>
            </table>
            
            {participants.filter(p => p.score !== undefined).length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No completed submissions to display.
                </div>
            )}
            </div>
        </div>
        </ErrorBoundary>
        </div>
  );
};

export default AnalyticsTab;