import { RouteObject } from "react-router-dom";
import { guard } from "./guard";
import { ACCESS } from "@/security/acess";
import AdminProntuarioPaciente from "@/pages/Sistema/Prontuário/AdminProntuarioPaciente";
import AdminBuscarReceitas from "@/pages/Sistema/Prontuário/AdminBuscarReceitas";

export const prontuarioRoutes: RouteObject[] = [
  {
    path: "/sistema/prontuario",
    element: guard(<AdminProntuarioPaciente />, { withGuiche: true, allowedRoles: ACCESS.prontuarioClinico }),
  },
  {
    path: "/sistema/buscar-receitas",
    element: guard(<AdminBuscarReceitas />, { withGuiche: true, allowedRoles: ACCESS.prontuario }),
  },
];
