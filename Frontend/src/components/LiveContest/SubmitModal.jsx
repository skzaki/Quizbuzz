const SubmitModal = ({ answered, total, timeLeft, onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 w-full max-w-md">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Submit Contest?
      </h3>
      <div className="space-y-3 mb-6">
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          Are you sure you want to submit your contest? This action cannot be undone.
        </p>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-sm space-y-1">
            <div className="flex justify-between text-white">
              <span>Answered:</span>
              <span className="font-medium">
                {answered}/{total}
              </span>
            </div>
            <div className="flex justify-between text-white">
              <span>Time Remaining:</span>
              <span className="font-medium">{timeLeft}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-3 rounded-lg"
        >
          Continue Contest
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg"
        >
          Submit Contest
        </button>
      </div>
    </div>
  </div>
);

export default SubmitModal;
