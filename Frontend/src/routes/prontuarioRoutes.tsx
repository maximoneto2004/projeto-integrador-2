import { RouteObject } from "react-router-dom";
import { guard } from "./guard";
import { ACCESS } from "@/security/acess";
import AdminProntuarioPage from "@/pages/Sistema/Prontuário/AdminProntuarioPage";
import AdminHistoricoProntuario from "@/pages/Sistema/Prontuário/AdminHistoricoProntuario";
import AdminBuscarProntuario from "@/pages/Sistema/Prontuário/AdminBuscarProntuario";
import AdminEncaminhamentoProntuario from "@/pages/Sistema/Prontuário/AdminEncaminhamentoProntuario";
import AdminPerfilFamiliar from "@/pages/Sistema/Prontuário/AdminPerfilFamiliar";

export const prontuarioRoutes: RouteObject[] = [
  {
    path: "/sistema/prontuario",
    element: guard(<AdminProntuarioPage />, { withGuiche: true, allowedRoles: ACCESS.prontuario }),
  },
  {
    path: "/sistema/historico-prontuario",
    element: guard(<AdminHistoricoProntuario />, { withGuiche: true, allowedRoles: ACCESS.prontuario }),
  },
  {
    path: "/sistema/buscar-prontuario",
    element: guard(<AdminBuscarProntuario />, { withGuiche: true, allowedRoles: ACCESS.prontuario }),
  },
  {
    path: "/sistema/encaminhamento-prontuario",
    element: guard(<AdminEncaminhamentoProntuario />, { withGuiche: true, allowedRoles: ACCESS.prontuario }),
  },
  {
    path: "/sistema/perfil-familiar",
    element: guard(<AdminPerfilFamiliar />, { withGuiche: true, allowedRoles: ACCESS.prontuario }),
  },
];

