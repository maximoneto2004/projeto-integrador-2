import { Route, RouteObject, Routes } from "react-router-dom";
import { adminRoutes } from "./adminRoutes";
import { agendamentosRoutes } from "./agendamentosRoutes";
import { prontuarioRoutes } from "./prontuarioRoutes";
import { dashboardRoutes } from "./dashboardRoutes";
import NotFound from "@/pages/NotFound";

const groups: RouteObject[] = [
  ...adminRoutes,
  ...agendamentosRoutes,
  ...prontuarioRoutes,
  ...dashboardRoutes,
];

const renderRoutes = (routes: RouteObject[]) =>
  routes.map(({ path, element }) => <Route key={path} path={path} element={element} />);

export const AppRoutes = () => (
  <Routes>
    {renderRoutes(groups)}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;

