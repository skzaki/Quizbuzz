import { jwtDecode } from "jwt-decode";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const parseToken = (token) => {
    try {
      const decoded = jwtDecode(token);

      // ✅ Map role → isAdmin
      return {
        ...decoded,
        isAdmin: decoded.role === "admin",
      };
    } catch (err) {
      console.error("Invalid token:", err);
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      const parsedUser = parseToken(token);
      if (parsedUser) setUser(parsedUser);
      else localStorage.removeItem("authToken");
    }
  }, []);

  const login = (token) => {
    // localStorage.setItem("authToken", token);
    const parsedUser = parseToken(token);
    setUser(parsedUser);
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
