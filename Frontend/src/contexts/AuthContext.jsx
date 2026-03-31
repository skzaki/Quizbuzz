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
  const [loading, setLoading] = useState(true);

  const parseToken = (token) => {
    try {
      const decoded = jwtDecode(token);

      // Reject expired tokens
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        console.warn("AuthContext: token is expired — discarding");
        return null;
      }

      // ✅ KEY FIX: authToken is exclusively for admin sessions.
      // If the stored token has role !== "admin" it is a stale participant
      // token left over from the old ContestJoin flow (before the fix).
      // Discard it silently so the admin never needs localStorage.clear().
      if (decoded.role !== "admin") {
        console.warn(
          "AuthContext: found non-admin token in authToken — discarding stale participant token"
        );
        return null;
      }

      return {
        ...decoded,
        isAdmin: true,
      };
    } catch (err) {
      console.error("AuthContext: invalid token —", err.message);
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      const parsedUser = parseToken(token);
      if (parsedUser) {
        setUser(parsedUser);
      } else {
        // Token is invalid, expired, or belongs to a participant — remove it
        localStorage.removeItem("authToken");
      }
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    // Only accept admin tokens into the admin auth context
    const parsedUser = parseToken(token);
    if (!parsedUser) {
      console.error("AuthContext.login: rejected non-admin or invalid token");
      return;
    }
    localStorage.setItem("authToken", token);
    setUser(parsedUser);
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
