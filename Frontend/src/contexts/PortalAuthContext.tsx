import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import {
  clearAccessTokenCookie,
  fetchFortalezaDigitalPerfil,
  logoutFortalezaDigital,
  PORTAL_SESSION_EXPIRED_EVENT,
  refreshAccessTokenFromCookie,
  startLoginFortalezaDigital,
} from "@/services/portal/fortalezaDigital";
import { getPortalCookieConsent, openPortalCookieBanner } from "@/lib/portalConsent";

type PortalAuthContextValue = {
  accessToken: string | null;
  displayName: string;
  loading: boolean;
  initializing: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
};

const PortalAuthContext = createContext<PortalAuthContextValue | undefined>(undefined);

function getJwtExp(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const json = JSON.parse(atob(padded));
    return typeof json?.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const DISPLAY_NAME_KEY = "portal_display_name";
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [displayName, setDisplayName] = useState(() => {
    return localStorage.getItem(DISPLAY_NAME_KEY) || "Cadastrar";
  });

  useEffect(() => {
    refreshSession().finally(() => setInitializing(false));
  }, []);

  useEffect(() => {
    let mounted = true;
    const carregarNome = async () => {
      if (!accessToken) {
        if (!initializing) {
          localStorage.removeItem(DISPLAY_NAME_KEY);
          if (mounted) setDisplayName("Cadastrar");
        }
        return;
      }
      const cached = localStorage.getItem(DISPLAY_NAME_KEY);
      if (cached) {
        if (mounted) setDisplayName(cached);
        return;
      }
      const perfil = await fetchFortalezaDigitalPerfil(accessToken);
      if (!mounted) return;
      const nomeCompleto = String(perfil?.nome || perfil?.name || "").trim();
      const primeiroNome = nomeCompleto.split(/\s+/)[0] || "Cadastrar";
      localStorage.setItem(DISPLAY_NAME_KEY, primeiroNome);
      setDisplayName(primeiroNome);
    };
    void carregarNome();
    return () => {
      mounted = false;
    };
  }, [accessToken, initializing]);

  const login = useCallback(() => {
    if (getPortalCookieConsent() !== "accepted") {
      openPortalCookieBanner();
      return;
    }
    startLoginFortalezaDigital();
  }, []);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const token = await refreshAccessTokenFromCookie();
      setAccessToken(token);
      return token;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      if (accessToken) {
        await logoutFortalezaDigital();
      }
    } finally {
      clearAccessTokenCookie();
      localStorage.removeItem(DISPLAY_NAME_KEY);
      setAccessToken(null);
      setDisplayName("Cadastrar");
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    const exp = getJwtExp(accessToken);
    if (!exp) return;
    const ms = exp * 1000 - Date.now();
    if (ms <= 0) {
      void logout();
      return;
    }
    const timerId = window.setTimeout(() => {
      void logout();
    }, ms);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [accessToken, logout]);

  useEffect(() => {
    const handler = () => {
      void logout();
    };
    window.addEventListener(PORTAL_SESSION_EXPIRED_EVENT, handler);
    return () => {
      window.removeEventListener(PORTAL_SESSION_EXPIRED_EVENT, handler);
    };
  }, [logout]);

  return (
    <PortalAuthContext.Provider
      value={{ accessToken, displayName, loading, initializing, login, logout, refreshSession }}
    >
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error("usePortalAuth must be used within PortalAuthProvider");
  return ctx;
}
