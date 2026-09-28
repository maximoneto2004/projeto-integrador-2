import { Navigate, Route, RouteObject, Routes } from "react-router-dom";
import { adminRoutes } from "./adminRoutes";
import { agendamentosRoutes } from "./agendamentosRoutes";
import { prontuarioRoutes } from "./prontuarioRoutes";
import { dashboardRoutes } from "./dashboardRoutes";
import { estoqueRoutes } from "./estoqueRoutes";
import NotFound from "@/pages/NotFound";

const groups: RouteObject[] = [
  ...adminRoutes,
  ...agendamentosRoutes,
  ...prontuarioRoutes,
  ...dashboardRoutes,
  ...estoqueRoutes,
];

const renderRoutes = (routes: RouteObject[]) =>
  routes.map(({ path, element }) => <Route key={path} path={path} element={element} />);

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/sistema/login" replace />} />
    {renderRoutes(groups)}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;

