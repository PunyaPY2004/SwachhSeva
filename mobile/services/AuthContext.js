import React, { createContext, useContext, useEffect, useState } from "react";
import { getToken, clearToken } from "./api";
import { fetchCurrentUser } from "./auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        return;
      }
      const me = await fetchCurrentUser();
      setUser(me);
    } catch (err) {
      // Token expired/invalid — treat as logged out.
      await clearToken();
      setUser(null);
    } finally {
      setCheckingSession(false);
    }
  }

  async function signOut() {
    await clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, checkingSession, signOut, refreshSession: restoreSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
}
