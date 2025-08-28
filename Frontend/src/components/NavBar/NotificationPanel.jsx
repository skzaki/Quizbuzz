import { Bell, X } from "lucide-react";
import NotificationItem from "./NotificationItem";

// Later: fetch notifications from API
const mockNotifications = [
  {
    id: "1",
    type: "contest",
    title: "New Contest Available",
    message: "JavaScript Advanced Challenge is now open for registration",
    time: "2 hours ago",
    read: false,
    color: "text-purple-600 dark:text-purple-400"
  },
  {
    id: "2",
    type: "certificate",
    title: "Certificate Ready",
    message: "Your certificate for React Fundamentals is ready for download",
    time: "5 hours ago",
    read: false,
    color: "text-green-600 dark:text-green-400"
  }
];

const NotificationPanel = ({ closePanel }) => {
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    // TODO: API call -> PATCH /notifications/read-all
    console.log("Marking all as read");
  };

  return (
    <div className="fixed top-16 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={closePanel}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {mockNotifications.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {mockNotifications.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No notifications
            </h4>
            <p className="text-gray-600 dark:text-gray-400">
              You're all caught up! Check back later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
