import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("amir_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("amir_token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("amir_user", JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem("amir_token");
        localStorage.removeItem("amir_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("amir_token", res.data.token);
    localStorage.setItem("amir_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const signup = async (name, email, password) => {
    const res = await api.post("/auth/signup", { name, email, password });
    localStorage.setItem("amir_token", res.data.token);
    localStorage.setItem("amir_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem("amir_token");
    localStorage.removeItem("amir_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
