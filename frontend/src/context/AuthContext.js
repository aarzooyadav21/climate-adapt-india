import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("bct_token");
    const u = localStorage.getItem("bct_user");
    if (t && u) {
      setUser(JSON.parse(u));
      api.get("/auth/me").then((r) => {
        setUser(r.data);
        localStorage.setItem("bct_user", JSON.stringify(r.data));
      }).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("bct_token", data.token);
    localStorage.setItem("bct_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("bct_token", data.token);
    localStorage.setItem("bct_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("bct_token");
    localStorage.removeItem("bct_user");
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
