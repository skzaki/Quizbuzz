import { CheckCircle, XCircle } from "lucide-react";

const ResultTable = ({ resultData }) => {
  if (!resultData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Results Summary
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Your submission has been evaluated successfully. Detailed question-wise results are not available.
        </p>
      </div>
    );
  }

  // Handle detailed question results
  if (resultData.questions && resultData.questions.length > 0) {
    return (
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
                  {/* Question Number */}
                  <td className="p-3 text-gray-800 dark:text-gray-200 font-medium">
                    {question.questionNo}
                  </td>
                  
                  {/* Question Text */}
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
                  
                  {/* User Answer */}
                  <td className="p-3 text-gray-800 dark:text-gray-200">
                    <span className={`${question.isCorrect ? 'text-gray-800 dark:text-gray-200' : 'text-red-600 dark:text-red-400'}`}>
                      {question.userAnswer || 'No answer'}
                    </span>
                  </td>
                  
                  {/* Correct Answer */}
                  <td className="p-3 text-green-600 dark:text-green-400 font-medium">
                    {question.correctAnswer}
                  </td>
                  
                  {/* Result Status */}
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
                  
                  {/* Points */}
                  <td className="p-3 text-gray-800 dark:text-gray-200">
                    <span className="font-medium">
                      {question.points || (question.isCorrect ? 1 : 0)}/{question.maxPoints || 1}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Handle basic answer results (fallback)
  if (resultData.answers && resultData.answers.length > 0) {
    return (
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
    );
  }

  // Fallback when no detailed data is available
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Results Summary
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        Your submission has been evaluated successfully. Detailed question-wise results are not available.
      </p>
    </div>
  );
};

export default ResultTable;