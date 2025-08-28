const NotificationItem = ({ notification }) => {
  const markAsRead = (id) => {
    // TODO: API call -> PATCH /notifications/:id/read
    console.log("Marking notification as read:", id);
  };

  return (
    <div
      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
        !notification.read ? "bg-blue-50 dark:bg-blue-900/10" : ""
      }`}
      onClick={() => markAsRead(notification.id)}
    >
      <div className="flex items-start space-x-3">
        <div
          className={`p-2 rounded-full bg-gray-100 dark:bg-gray-700 ${notification.color}`}
        >
          {/* Use icon from backend in real case */}
          <span className="font-bold">🔔</span>
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${
              !notification.read
                ? "text-gray-900 dark:text-white"
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            {notification.title}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            {notification.time}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
