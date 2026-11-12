import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(undefined);
  const [config, setConfig] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      return data;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
    api.get("/auth/config").then((r) => setConfig(r.data)).catch(() => setConfig({}));
  }, [refresh]);

  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, config, refresh, logout, setUser }}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);
