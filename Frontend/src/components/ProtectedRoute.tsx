import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { deriveRoleFromGroups } from "@/lib/authHelpers";
import type { UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, initializing } = useAuth();
  const userRole = deriveRoleFromGroups(user?.grupos);

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-destructive mb-4">Acesso Negado</h1>
          <p className="text-muted-foreground mb-6">
            VocǦ nǜo tem permissǜo para acessar esta pǭgina.
          </p>
          <p className="text-sm text-muted-foreground">
            Seu perfil: <span className="font-bold">{userRole || "Sem perfil"}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

