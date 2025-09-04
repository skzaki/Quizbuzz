// src/components/Layout/Navbar.jsx
import { Bell, Moon, Sun, Trophy } from 'lucide-react';
import React, { lazy, Suspense } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ErrorBoundary from '../ErrorBoundary';
import LoadingSpinner from '../UI/LoadingSpinner';

// Lazy load Notifications panel
const NotificationsPanel = lazy(() => import('../NavBar/NotificationPanel'));

const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = React.useState(false);

  const unreadCount = 3; // Mock count, replace with API call

  return (
    <ErrorBoundary>
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        {/* Sidebar toggle for mobile */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Trophy className="h-5 w-5" />
        </button>

        {/* Branding */}
        <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Quiz Buzz
        </div>

        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isDark ? <Sun className="h-5 w-5 text-amber-300" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 relative"
            >
              <Bell className="h-5 w-5 dark:text-gray-100" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <Suspense fallback={<LoadingSpinner />}>
                <NotificationsPanel
                  onClose={() => setShowNotifications(false)}
                  user={user}
                />
              </Suspense>
            )}
          </div>

          {/* User Avatar */}
          <div className="flex items-center space-x-2">
            <img
              src={user?.avatar}
              alt={user?.name}
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {user?.name}
            </span>
            <button
              onClick={logout}
              className="text-red-600 hover:text-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
    </ErrorBoundary>
  );
};

export default Navbar;
