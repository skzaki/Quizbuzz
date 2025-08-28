import {
    BarChart3,
    Calendar,
    CreditCard,
    Database,
    FileText
} from "lucide-react";
import { Link } from "react-router-dom";

// NOTE: Later replace this with API-driven menu for role-based access control
// Example: GET /api/menu?role=user | GET /api/menu?role=admin

const SidebarMenu = ({ location, onClose, user }) => {
  const userMenuItems = [
    // { icon: Home, label: "Dashboard", path: "/dashboard" },
    // { icon: BookOpen, label: "Practice", path: "/practice" },
    // { icon: Target, label: "Mock Tests", path: "/mock-tests" },
    // { icon: Trophy, label: "Contests", path: "/contests" },
    // { icon: TrendingUp, label: "Leaderboard", path: "/leaderboard" },
    // { icon: Award, label: "Certificates", path: "/certificates" },
    // { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const adminMenuItems = [
    { icon: BarChart3, label: "Admin Dashboard", path: "/admin" },
    { icon: Calendar, label: "Contest Management", path: "/admin/contests" },
    { icon: Database, label: "Question Bank", path: "/admin/questions" },
    // { icon: Award, label: "Certificates", path: "/admin/certificates" },
    { icon: CreditCard, label: "Payments", path: "/admin/payments" },
    { icon: FileText, label: "Analytics", path: "/admin/analytics" },
  ];

  const menuItems = user?.isAdmin ? adminMenuItems : userMenuItems;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="space-y-1">
      {menuItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          onClick={onClose}
          className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
            isActive(item.path)
              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <item.icon className="h-5 w-5" />
          <span className="font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default SidebarMenu;
