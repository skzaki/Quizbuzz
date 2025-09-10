import { ArrowRight } from "lucide-react";

const QuestionCard = ({
  question,
  index,
  total,
  selectedAnswer,
  onAnswer,
  onNext,
  onSkip,
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Question Text */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-8 shadow-sm border mb-6">
        <p className="text-base md:text-lg text-gray-900 dark:text-white leading-relaxed">
          {question
            ? `${index + 1}. ${
                question.questionText || question.question || "Question text not available"
              }`
            : "Loading question..."}
        </p>
      </div>

      {/* Answer Options */}
      <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
        {question?.options?.map((option, i) => (
          <button
            key={i}
            onClick={() => onAnswer(i)}
            className={`w-full p-4 md:p-6 text-left border-2 rounded-xl transition-all ${
              selectedAnswer === i
                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-600 text-gray-900 dark:text-white"
            }`}
          >
            <div className="flex items-center space-x-3 md:space-x-4">
              <div
                className={`w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm md:text-base ${
                  selectedAnswer === i
                    ? "border-purple-500 bg-purple-500 text-white"
                    : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                }`}
              >
                {String.fromCharCode(65 + i)}
              </div>
              <span className="text-sm md:text-lg">{option}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-4">
        <div className="flex w-full sm:w-auto space-x-3">
          <button
            onClick={onSkip}
            className="flex-1 sm:flex-none px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg"
          >
            Skip
          </button>
          <button
            onClick={onNext}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            <span>{index === total - 1 ? "Submit" : "Next"}</span>
            {index < total - 1 && <ArrowRight className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
