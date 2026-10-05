import { Navigate, RouteObject } from "react-router-dom";
import { guard } from "./guard";
import { ACCESS } from "@/security/acess";
import AdminMedicamentosPage from "@/pages/Sistema/Administrador/AdminMedicamentosPage";
import SaldoEstoquePage from "@/pages/Sistema/Estoque/SaldoEstoquePage";
import LotesEstoquePage from "@/pages/Sistema/Estoque/LotesEstoquePage";
import MovimentacoesEstoquePage from "@/pages/Sistema/Estoque/MovimentacoesEstoquePage";
import AlertasEstoquePage from "@/pages/Sistema/Estoque/AlertasEstoquePage";
import DispensacaoPage from "@/pages/Sistema/Estoque/DispensacaoPage";

export const estoqueRoutes: RouteObject[] = [
  {
    path: "/sistema/administrador/medicamentos",
    element: guard(<AdminMedicamentosPage />, { allowedRoles: ACCESS.medicamentosAdmin }),
  },
  {
    path: "/sistema/estoque",
    element: <Navigate to="/sistema/estoque/saldo" replace />,
  },
  {
    path: "/sistema/estoque/saldo",
    element: guard(<SaldoEstoquePage />, { allowedRoles: ACCESS.estoqueSaldo }),
  },
  {
    path: "/sistema/estoque/lotes",
    element: guard(<LotesEstoquePage />, { allowedRoles: ACCESS.estoqueGestao }),
  },
  {
    path: "/sistema/estoque/movimentacoes",
    element: guard(<MovimentacoesEstoquePage />, { allowedRoles: ACCESS.estoqueGestao }),
  },
  {
    path: "/sistema/estoque/alertas",
    element: guard(<AlertasEstoquePage />, { allowedRoles: ACCESS.estoqueGestao }),
  },
  {
    path: "/sistema/dispensacao",
    element: guard(<DispensacaoPage />, { allowedRoles: ACCESS.dispensacao }),
  },
];
