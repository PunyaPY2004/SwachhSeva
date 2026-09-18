import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchCurrentUser, hasToken, logout as logoutApi } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    restore();
  }, []);

  async function restore() {
    if (!hasToken()) {
      setCheckingSession(false);
      return;
    }
    try {
      const me = await fetchCurrentUser();
      setUser(me);
    } catch {
      logoutApi();
    } finally {
      setCheckingSession(false);
    }
  }

  function signOut() {
    logoutApi();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, checkingSession, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
