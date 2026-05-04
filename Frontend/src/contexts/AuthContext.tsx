import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { api, onLogout, onTokenChange, setAuthToken } from "@/services/api";
import { clearMesaInStorage } from "@/lib/authHelpers";
import { authService } from "@/services/sistema/authService";

import type { AuthUser, TokenRefreshResponse, TokenRequest, TokenResponse } from "@/types/api";

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  initializing: boolean;
  login: (credentials: TokenRequest) => Promise<AuthUser>;
  logout: () => void;
  updateUser: (data: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_TOKEN_PATH = "/authentication/token/";
const AUTH_REFRESH_PATH = "/authentication/token/refresh";
const AUTH_LOGOUT_PATH = "/authentication/token/logout";
const USER_KEY = "auth_user_session";

function readUserFromSession(): AuthUser | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthContextValue["user"]>(() => readUserFromSession());
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    onLogout(logout);
    onTokenChange(setAccessToken);

    refreshSession().finally(() => setInitializing(false));
  }, []);

  async function login(credentials: TokenRequest) {
    setLoading(true);
    try {
      const res = await api.post<TokenResponse>(AUTH_TOKEN_PATH, credentials);

      const { access, usuario } = res.data;

      setAuthToken(access);
      setUser(usuario);
      sessionStorage.setItem(USER_KEY, JSON.stringify(usuario));
      return usuario;
    } catch (err) {
      clearSession();
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function refreshSession() {
    try {
      const res = await api.post<TokenRefreshResponse>(AUTH_REFRESH_PATH);
      const { access, usuario } = res.data;
      setAuthToken(access);

      if (usuario) {
        setUser(usuario);
        sessionStorage.setItem(USER_KEY, JSON.stringify(usuario));
      } else {
        const fromSession = readUserFromSession();
        setUser(fromSession);
      }
    } catch (err) {
      clearSession();
    }
  }

  function updateUser(data: Partial<AuthUser>) {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...data };
      sessionStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }

  function clearSession() {
    clearMesaInStorage();
    sessionStorage.removeItem(USER_KEY);
    setAuthToken(null);
    setAccessToken(null);
    setUser(null);
  }

  function logout() {
    void authService.logout().catch(() => undefined);
    clearSession();
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, initializing, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
