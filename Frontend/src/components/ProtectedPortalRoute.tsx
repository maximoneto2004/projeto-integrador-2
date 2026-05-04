import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { fetchFortalezaDigitalCidadaoMe } from "@/services/portal/fortalezaDigital";

interface ProtectedPortalRouteProps {
  children: ReactNode;
  allowUnauthenticated?: boolean;
  skipCidadaoCheck?: boolean;
}

const RECENT_CADASTRO_VALIDATION_KEY = "portal:recent-cadastro-validation";
const RECENT_CADASTRO_VALIDATION_TTL_MS = 30_000;

function hasRecentCadastroValidation(): boolean {
  try {
    const raw = sessionStorage.getItem(RECENT_CADASTRO_VALIDATION_KEY);
    if (!raw) return false;
    const timestamp = Number(raw);
    if (!Number.isFinite(timestamp)) return false;
    const isRecent = Date.now() - timestamp <= RECENT_CADASTRO_VALIDATION_TTL_MS;
    if (!isRecent) {
      sessionStorage.removeItem(RECENT_CADASTRO_VALIDATION_KEY);
    }
    return isRecent;
  } catch {
    return false;
  }
}

function clearRecentCadastroValidation(): void {
  try {
    sessionStorage.removeItem(RECENT_CADASTRO_VALIDATION_KEY);
  } catch {
    // no-op
  }
}

function normalizeRole(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function tokenHasBasicRole(accessToken: string | null): boolean {
  if (!accessToken) return false;
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return false;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const json = JSON.parse(atob(padded)) as {
      realm_access?: { roles?: unknown[] };
      roles?: unknown[];
    };
    const roles = [
      ...(Array.isArray(json?.realm_access?.roles) ? json.realm_access.roles : []),
      ...(Array.isArray(json?.roles) ? json.roles : []),
    ];
    return roles.some((role) => normalizeRole(role) === "basico");
  } catch {
    return false;
  }
}

export function ProtectedPortalRoute({
  children,
  allowUnauthenticated = false,
  skipCidadaoCheck = false,
}: ProtectedPortalRouteProps) {
  const { accessToken, initializing } = usePortalAuth();
  const location = useLocation();
  const [checkingCidadao, setCheckingCidadao] = useState(false);
  const [cidadaoExists, setCidadaoExists] = useState<boolean | null>(null);
  const [lastCheckedPath, setLastCheckedPath] = useState<string | null>(null);
  const isSeloRoute = location.pathname === "/selo";
  const hasBasicRole = tokenHasBasicRole(accessToken);

  useEffect(() => {
    if (!accessToken || hasBasicRole) {
      setCidadaoExists(null);
      setCheckingCidadao(false);
      setLastCheckedPath(null);
      return;
    }

    const currentPath = location.pathname;
    let mounted = true;
    setCheckingCidadao(true);
    fetchFortalezaDigitalCidadaoMe(accessToken)
      .then((cidadao) => {
        if (!mounted) return;
        setCidadaoExists(Boolean(cidadao));
        if (cidadao) {
          clearRecentCadastroValidation();
        }
      })
      .catch(() => {
        if (!mounted) return;
        setCidadaoExists(false);
      })
      .finally(() => {
        if (!mounted) return;
        setCheckingCidadao(false);
        setLastCheckedPath(currentPath);
      });

    return () => {
      mounted = false;
    };
  }, [accessToken, hasBasicRole, location.pathname]);


  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-portal-neutral text-portal-muted">
        Validando sessão...
      </div>
    );
  }

  if (!accessToken) {
    if (allowUnauthenticated) return <>{children}</>;
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (hasBasicRole) {
    if (!isSeloRoute) {
      return <Navigate to="/selo" replace state={{ from: location }} />;
    }
    return <>{children}</>;
  }

  if (lastCheckedPath !== location.pathname || checkingCidadao || cidadaoExists === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-portal-neutral text-portal-muted">
        Validando cadastro...
      </div>
    );
  }

  if (isSeloRoute) {
    return <Navigate to={cidadaoExists ? "/perfil" : "/validar-cadastro"} replace state={{ from: location }} />;
  }

  if (skipCidadaoCheck) {
    if (cidadaoExists) {
      return <Navigate to="/perfil" replace state={{ from: location }} />;
    }
    return <>{children}</>;
  }

  if (!cidadaoExists) {
    if (hasRecentCadastroValidation()) {
      return <>{children}</>;
    }
    return <Navigate to="/validar-cadastro" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
