import { RouteObject } from "react-router-dom";
import { guard } from "./guard";
import { ACCESS } from "@/security/acess";
import AdminDashboardSupervisor from "@/pages/Sistema/Dashboards/AdminDashboardSupervisor";
import AdminDashboardGestor from "@/pages/Sistema/Dashboards/AdminDashboardGestor";
import AdminDashboardAtendente from "@/pages/Sistema/Dashboards/AdminDashboardAtendente";
import AdminMonitorUnidade from "@/pages/Sistema/Dashboards/AdminMonitorUnidade";

export const dashboardRoutes: RouteObject[] = [
  {
    path: "/sistema/dashboard",
    element: guard(<AdminDashboardSupervisor />, { allowedRoles: ACCESS.dashboard }),
  },
  {
    path: "/sistema/dashboard-gestor",
    element: guard(<AdminDashboardGestor />, { allowedRoles: ACCESS.dashboardGestor }),
  },
  {
    path: "/sistema/dashboard-atendente",
    element: guard(<AdminDashboardAtendente />, { withGuiche: true, allowedRoles: ACCESS.dashboardAtendente }),
  },
  {
    path: "/sistema/monitor-unidade",
    element: guard(<AdminMonitorUnidade />, { allowedRoles: ACCESS.monitorUnidade }),
  },
];

