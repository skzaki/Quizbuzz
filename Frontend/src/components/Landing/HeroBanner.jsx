import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HeroBanner = ({ contest }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const navigate = useNavigate();

  const targetDate = useMemo(() => {
    if (contest?.startTime) return new Date(contest.startTime).getTime();
    return new Date('2026-12-31T17:00:00.000+05:30').getTime();
  }, [contest]);

  const calculateTimeLeft = useCallback(() => {
    const distance = targetDate - Date.now();
    if (distance <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(distance / 86400000),
      hours: Math.floor((distance % 86400000) / 3600000),
      minutes: Math.floor((distance % 3600000) / 60000),
      seconds: Math.floor((distance % 60000) / 1000)
    };
  }, [targetDate]);

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  const formatTime = (time) => time.toString().padStart(2, '0');

  const TimerBlock = ({ value, label }) => (
    <div className="bg-white bg-opacity-90 backdrop-blur-sm shadow-xl border border-blue-200 p-4 rounded-xl text-center min-w-20 hover:shadow-2xl transition-all duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-2xl md:text-3xl font-bold">
        {formatTime(value)}
      </div>
      <div className="text-gray-600 text-sm font-medium">{label}</div>
    </div>
  );

  const handleJoin = () => {
    if (contest?.slug) {
      navigate(`/contest/join?slug=${contest.slug}`);
    } else {
      navigate('/contest/join');
    }
  };

  const isLive = contest && new Date(contest.startTime) <= new Date() && new Date(contest.deadline) >= new Date();
  const isUpcoming = contest && new Date(contest.startTime) > new Date();
  const isCompleted = contest && new Date(contest.deadline) < new Date();

  return (
    <div className="relative py-4 px-4 text-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto">
        <img src="/ysm-logo.avif" alt="YSM Logo" className="mx-auto w-28 h-14 object-contain" />
        <img src="/quizBuzz-logo.png" alt="Quiz Buzz Logo" className="mx-auto w-72 h-69 object-contain" />

        <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-2xl md:text-4xl font-bold mb-2">
          {contest?.title || 'Technical Quiz Competition'}
        </h1>

        {contest ? (
          <p className="text-gray-800 text-lg md:text-xl mb-4 font-medium">
            {isLive && 'Live Now'}
            {isUpcoming && `Starts: ${new Date(contest.startTime).toLocaleString('en-IN')}`}
            {isCompleted && 'Contest Completed'}
          </p>
        ) : (
          <p className="text-gray-800 text-lg md:text-xl mb-4 font-medium">Coming Soon...</p>
        )}

        {isUpcoming && (
          <div className="flex justify-center gap-4 mb-8">
            <TimerBlock value={timeLeft.days} label="Days" />
            <TimerBlock value={timeLeft.hours} label="Hours" />
            <TimerBlock value={timeLeft.minutes} label="Minutes" />
            <TimerBlock value={timeLeft.seconds} label="Seconds" />
          </div>
        )}

        <div className="flex flex-col items-center gap-3 mb-4">
          {(isLive || isUpcoming) && (
            <button
              onClick={handleJoin}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-10 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {isLive ? 'Join Contest Now' : 'Join Contest'}
            </button>
          )}
          <button
            onClick={handleJoin}
            className="text-purple-600 hover:text-purple-800 font-medium underline text-sm"
          >
            View Result / Merit List
          </button>
        </div>

        {contest && (
          <div className="flex justify-center gap-6 text-sm text-gray-600 mt-2">
            <span>{contest.duration} mins</span>
            <span>{contest.registerFee === 0 ? 'Free' : `Rs.${contest.registerFee}`}</span>
            {contest.totalQuestions > 0 && <span>{contest.totalQuestions} questions</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroBanner;