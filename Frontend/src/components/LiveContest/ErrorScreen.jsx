const ErrorScreen = ({ message, onRetry }) => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="text-center w-full max-w-md">
      <h2 className="text-xl font-bold text-red-600 mb-3">Error</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg"
        >
          Try Again
        </button>
      )}
    </div>
  </div>
);

export default ErrorScreen;
