import { createContext, useContext, useState } from "react"

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("qb-token"))
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("qb-user")
    return u ? JSON.parse(u) : null
  })

  const login = (token, user) => {
    setToken(token)
    setUser(user)
    localStorage.setItem("qb-token", token)
    localStorage.setItem("qb-user", JSON.stringify(user))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem("qb-token")
    localStorage.removeItem("qb-user")
  }

  const isAdmin = user?.role === "admin"

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
