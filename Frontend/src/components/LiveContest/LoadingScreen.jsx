//  components/liveContest/LoadingScreen.jsx
const LoadingScreen = ({ text = "Loading..." }) => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="text-center w-full max-w-md">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{text}</h2>
    </div>
  </div>
);

export default LoadingScreen;
