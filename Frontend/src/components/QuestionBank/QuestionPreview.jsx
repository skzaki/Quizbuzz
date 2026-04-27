// Question Preview Modal Component

import {
    X
} from 'lucide-react';


const QuestionPreview = ({ question, isOpen, onClose }) => {
  if (!isOpen || !question) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <ErrorBoundary>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Question Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Question</h3>
            <p className="text-blue-800 dark:text-blue-300">{question.text}</p>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Options:</h4>
            {question.options.map((option, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg border-2 ${
                  index === question.correctAnswer 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                    index === question.correctAnswer
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className={index === question.correctAnswer ? 'text-green-800 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}>
                    {option}
                  </span>
                  {index === question.correctAnswer && (
                    <span className="text-green-600 dark:text-green-400 text-sm font-medium ml-auto">
                      ✓ Correct Answer
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {question.explanation && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">Explanation</h4>
              <p className="text-yellow-800 dark:text-yellow-300">{question.explanation}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Topic:</span>
              <Badge variant="info">{question.topic}</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Difficulty:</span>
              <Badge variant={question.difficulty === 'easy' ? 'success' : question.difficulty === 'medium' ? 'warning' : 'error'}>
                {question.difficulty}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">XP Reward:</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">{question.xpReward} XP</span>
            </div>
          </div>
        </div>
      </div>
      </ErrorBoundary>
    </div>
  );
};

export default QuestionPreview;