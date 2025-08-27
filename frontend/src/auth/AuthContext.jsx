import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const KEY = "laba_auth_token";
const VALID_USERS = [
  {
    user: import.meta.env.VITE_LOGIN_USER || "admin",
    pass: import.meta.env.VITE_LOGIN_PASS || "laba2025",
  },
];

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(KEY));
  const isAuthenticated = !!token;

  const login = (u, p) => {
    const ok = VALID_USERS.some((v) => v.user === u && v.pass === p);
    if (!ok) return false;
    const t = btoa(`${u}:${Date.now()}`);
    localStorage.setItem(KEY, t);
    setToken(t);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(KEY);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
}
