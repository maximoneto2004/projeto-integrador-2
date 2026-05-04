import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { deriveRoleFromGroups, getMesaFromStorage, setMesaInStorage, type MesaGuiche } from "@/lib/authHelpers";
import type { UserRole } from "@/types/auth";
import { GuicheModal } from "./GuicheModal";
import type { GuicheDefineResponse } from "@/types/api";

interface ProtectedRouteWithGuicheProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRouteWithGuiche({
  children,
  allowedRoles,
}: ProtectedRouteWithGuicheProps) {
  const { user, initializing, updateUser } = useAuth();
  const userRole = deriveRoleFromGroups(user?.grupos);
  const [showGuicheModal, setShowGuicheModal] = useState(false);
  const [, setMesaAtual] = useState<MesaGuiche | undefined>(() => getMesaFromStorage());

  useEffect(() => {
    if (userRole === "atendente" && !getMesaFromStorage()) {
      setShowGuicheModal(true);
    }
  }, [userRole]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Validando sessão...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sistema/login" replace />;
  }

  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to="/sistema/login" replace />;
  }

  const handleGuicheConfirm = (guicheResponse: GuicheDefineResponse) => {
    const guiche = guicheResponse.guiche;
    setMesaInStorage(guiche);
    setMesaAtual(guiche);
    updateUser({ guiche_atual: guiche });
    setShowGuicheModal(false);
  };

  return (
    <>
      <GuicheModal open={showGuicheModal} onConfirm={handleGuicheConfirm} />
      {!showGuicheModal && children}
    </>
  );
}

