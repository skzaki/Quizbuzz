import { Clock, Star, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

const ThankYouScreen = () => {
  const [progress, setProgress] = useState(0);
  const [showThankYou, setShowThankYou] = useState(true);

  useEffect(() => {
    const progressStages = [0, 25, 50, 75, 100];
    let currentStage = 0;

    const interval = setInterval(() => {
      if (currentStage < progressStages.length - 1) {
        currentStage++;
        setProgress(progressStages[currentStage]);
      } else {
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const navigate = (path) => {
    console.log('Navigating to:', path);
  };

  if (showThankYou) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-12 shadow-xl border border-gray-200 dark:border-gray-700">
            {/* Success Animation */}
            <div className="mb-6 md:mb-8 text-center">
              <div className="bg-green-100 dark:bg-green-900/20 rounded-full p-4 md:p-6 w-16 h-16 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 animate-bounce">
                <Trophy className="h-8 w-8 md:h-12 md:w-12 text-green-600 dark:text-green-400 mx-auto" />
              </div>
              <div className="flex justify-center space-x-2 mb-4">
                <Star className="h-5 w-5 md:h-6 md:w-6 text-yellow-500 animate-pulse" />
                <Star className="h-5 w-5 md:h-6 md:w-6 text-yellow-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <Star className="h-5 w-5 md:h-6 md:w-6 text-yellow-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>

            {/* Thank You Message */}
            <div className="text-center mb-6 md:mb-8">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 md:mb-4">
                Thank You!
              </h1>
              <h2 className="text-lg md:text-2xl font-semibold text-purple-600 dark:text-purple-400 mb-4 md:mb-6">
                Contest Submitted Successfully
              </h2>
              
              <div className="space-y-3 md:space-y-4">
                <p className="text-base md:text-lg text-gray-700 dark:text-gray-300">
                  Your answers have been recorded and your submission is complete.
                </p>
              </div>
            </div>

            {/* Result Evaluation Loading */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 md:p-6 mb-6 md:mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="relative">
                  <div className="w-8 h-8 border-4 border-orange-200 dark:border-orange-800 rounded-full animate-spin">
                    <div className="absolute top-0 left-0 w-8 h-8 border-4 border-transparent border-t-orange-600 dark:border-t-orange-400 rounded-full animate-spin"></div>
                  </div>
                </div>
                <h4 className="font-semibold text-orange-900 dark:text-orange-100 text-base md:text-lg">
                  Evaluating Your Results
                </h4>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm md:text-base">
                  <span className="text-orange-800 dark:text-orange-300">Processing answers...</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
                
                {/* Animated Progress Bar */}
                <div className="w-full bg-orange-200 dark:bg-orange-900/30 rounded-full h-2">
                  <div 
                    className="bg-orange-600 dark:bg-orange-400 h-2 rounded-full transition-all duration-700 ease-in-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between text-xs md:text-sm">
                  <p className="text-orange-700 dark:text-orange-400">
                    Our AI is carefully analyzing your responses and calculating your score...
                  </p>
                  <span className="text-orange-600 dark:text-orange-400 font-semibold">
                    {progress}%
                  </span>
                </div>
              </div>
            </div>

            {/* Results Information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 md:p-6 mb-6 md:mb-8">
              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                  <Clock className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm md:text-base">Results Declaration</h4>
              </div>
              <p className="text-blue-800 dark:text-blue-300 text-xs md:text-sm">
                Contest results will be declared within <strong>24 hours</strong>. You'll receive an email notification 
                and can check your results in the dashboard. Rankings and certificates will be available once all 
                participants have completed the contest.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 md:gap-4">
              <button
                onClick={() => navigate('/contest/result')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-medium text-sm md:text-base"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => navigate('/contest/result')}
                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 px-6 py-3 rounded-lg transition-colors font-medium text-sm md:text-base"
              >
                View Other Contests
              </button>
            </div>

            {/* Auto Redirect Notice */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 md:mt-6 text-center">
              You'll be automatically redirected to the dashboard in a few seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }
};

export default ThankYouScreen;