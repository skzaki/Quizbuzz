import { Shield, User } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const SidebarRoleSwitch = () => {
  const { user, switchToAdmin, switchToUser } = useAuth();

  return (
    <div className="mb-6">
      <div className="flex items-center space-x-2 mb-2">
        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {user?.isAdmin ? "Admin Mode" : "User Mode"}
        </span>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={switchToUser}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            !user?.isAdmin
              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <User className="h-4 w-4 mx-auto" />
        </button>
        <button
          onClick={switchToAdmin}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            user?.isAdmin
              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Shield className="h-4 w-4 mx-auto" />
        </button>
      </div>
    </div>
  );
};

export default SidebarRoleSwitch;
