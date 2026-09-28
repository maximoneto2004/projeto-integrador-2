import { RouteObject } from "react-router-dom";
import { guard } from "./guard";
import { ACCESS } from "@/security/acess";
import AdminMedicamentosPage from "@/pages/Sistema/Administrador/AdminMedicamentosPage";
import EstoquePage from "@/pages/Sistema/Estoque/EstoquePage";
import DispensacaoPage from "@/pages/Sistema/Estoque/DispensacaoPage";

export const estoqueRoutes: RouteObject[] = [
  {
    path: "/sistema/administrador/medicamentos",
    element: guard(<AdminMedicamentosPage />, { allowedRoles: ACCESS.medicamentosAdmin }),
  },
  {
    path: "/sistema/estoque",
    element: guard(<EstoquePage />, { allowedRoles: ACCESS.estoque }),
  },
  {
    path: "/sistema/dispensacao",
    element: guard(<DispensacaoPage />, { allowedRoles: ACCESS.dispensacao }),
  },
];
