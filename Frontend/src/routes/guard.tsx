// src/routes/guard.tsx
import { ReactNode } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProtectedRouteWithGuiche } from "@/components/ProtectedRouteWithGuiche";

type GuardOptions = { withGuiche?: boolean; allowedRoles?: string[] };

export const guard = (
  element: ReactNode,
  { withGuiche = false, allowedRoles }: GuardOptions = {}
) => {
  const Wrapper = withGuiche ? ProtectedRouteWithGuiche : ProtectedRoute;
  return <Wrapper allowedRoles={allowedRoles}>{element}</Wrapper>;
};
