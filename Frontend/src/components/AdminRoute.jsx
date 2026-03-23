import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/login" replace />;

  return children;
};

export default AdminRoute;
