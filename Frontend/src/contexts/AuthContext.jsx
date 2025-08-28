import { createContext, useContext, useState } from "react";

// Create context
const AuthContext = createContext(undefined);

// Hook to use Auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Mock user data
const mockUser = {
  id: "1",
  name: "Austin Makasare",
  email: "austin@example.com",
  avatar:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIf4R5qPKHPNMyAqV-FjS_OTBB8pfUV29Phg&s",
  xp: 12450,
  level: 15,
  streak: 7,
  globalRank: 42,
  badges: [
    {
      id: "1",
      name: "First Win",
      icon: "🏆",
      description: "Won your first contest",
      earnedAt: "2024-01-15",
    },
    {
      id: "2",
      name: "Streak Master",
      icon: "🔥",
      description: "7-day streak achieved",
      earnedAt: "2024-01-20",
    },
    {
      id: "3",
      name: "Top Scorer",
      icon: "⭐",
      description: "Scored 100% in a contest",
      earnedAt: "2024-01-18",
    },
  ],
  isAdmin: true,
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(mockUser);

  const login = async (email, password) => {
    // TODO: Replace with real login API
    setUser(mockUser);
  };

  const logout = () => {
    setUser(null);
  };

  const switchToAdmin = () => {
    if (user) {
      setUser({ ...user, isAdmin: true });
    }
  };

  const switchToUser = () => {
    if (user) {
      setUser({ ...user, isAdmin: false });
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, switchToAdmin, switchToUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
