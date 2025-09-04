import { X } from "lucide-react";
import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import ErrorBoundary from "../../components/ErrorBoundary";
import LoadingSpinner from "../../components/UI/LoadingSpinner";
import { useAuth } from "../../contexts/AuthContext";

// Lazy-loaded components (split Sidebar into smaller parts)
const SidebarRoleSwitch = lazy(() => import("../SideBar/SidebarRoleSwitch"));
const SidebarMenu = lazy(() => import("../SideBar/SidebarMenu"));

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r 
          border-gray-200 dark:border-gray-800 transform transition-transform 
          duration-200 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 lg:static lg:inset-0`}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 lg:hidden">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Menu
          </span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {/* Role Switch Section */}
          {/* <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <SidebarRoleSwitch />
            </Suspense>
          </ErrorBoundary> */}

          {/* Menu Items */}
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <SidebarMenu location={location} onClose={onClose} user={user} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
