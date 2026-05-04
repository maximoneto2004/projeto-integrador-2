import { RouteObject } from "react-router-dom";
import Index from "@/pages/Portal/Index";
import Agendar from "@/pages/Portal/Agendar";
import AgendarDetalhes from "@/pages/Portal/AgendarDetalhes";
import MeusAgendamentos from "@/pages/Portal/MeusAgendamentos";
import Styleguide from "@/pages/Portal/Styleguide";
import Perfil from "@/pages/Portal/Perfil";
import CadastroDigital from "@/pages/Portal/CadastroDigital";
import DuvidasFrequentes from "@/pages/Portal/DuvidasFrequentes";
import UnidadesCras from "@/pages/Portal/Unidades";
import ValidarCadastro from "@/pages/Portal/CompletarCadastro"
import Selo from "@/pages/Portal/Selo"
import { ProtectedPortalRoute } from "@/components/ProtectedPortalRoute";
import TermoDeUso from "@/pages/Portal/TermosDeUso";

export const portalRoutes: RouteObject[] = [
  { path: "/", element: <Index /> },
  { path: "/agendar", element: <ProtectedPortalRoute><Agendar /></ProtectedPortalRoute> },
  { path: "/agendar/detalhes", element: <ProtectedPortalRoute><AgendarDetalhes /></ProtectedPortalRoute> },
  { path: "/meus-agendamentos", element: <ProtectedPortalRoute><MeusAgendamentos /></ProtectedPortalRoute> },
  { path: "/perfil", element: <ProtectedPortalRoute><Perfil /></ProtectedPortalRoute> },
  { path: "/cadastro-digital", element: <CadastroDigital /> },
  { path: "/duvidas-frequentes", element: <DuvidasFrequentes /> },
  { path: "/unidades-cras", element: <UnidadesCras /> },
  { path: "/termos-uso", element: <TermoDeUso/>},
  { path: "/styleguide", element: <Styleguide /> },
  { path: "/validar-cadastro", element: <ProtectedPortalRoute skipCidadaoCheck><ValidarCadastro /></ProtectedPortalRoute> },
  { path: "/selo", element: <ProtectedPortalRoute allowUnauthenticated><Selo /></ProtectedPortalRoute>}
];
