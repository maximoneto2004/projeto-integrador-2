import { RouteObject } from "react-router-dom";
import { guard } from "./guard";
import { ACCESS } from "@/security/acess";
import AdminAgendamentos from "@/pages/Sistema/Agendamentos/AdminAgendamentos";
import AdminFilaEspera from "@/pages/Sistema/Agendamentos/AdminFilaEspera";
import AdminConfirmarChegada from "@/pages/Sistema/Agendamentos/AdminConfirmarChegada";
import AdminFichaAtendimento from "@/pages/Sistema/Atendimentos/AdminFichaAtendimento";
// import AdminRegistrarServicosPage from "@/pages/Indefinidos/sistemaRegistrarServicosPage";
import AdminCadastroCidadao from "@/pages/Sistema/Cadastros/AdminCadastroCidadao";
import AdminAgendarCidadao from "@/pages/Indefinidos/AdminAgendarCidadao";
import AdminGuichesSupervisor from "@/pages/Sistema/Supervisor/AdminGuichesSupervisor";
// import VisualizarHorario from "@/pages/indefinidos/VisualizarHorario";

export const agendamentosRoutes: RouteObject[] = [
  {
    path: "/sistema/agendamentos",
    element: guard(<AdminAgendamentos />, { withGuiche: true, allowedRoles: ACCESS.adminAgendamentos }),
  },
  {
    path: "/sistema/fila-espera",
    element: guard(<AdminFilaEspera />, { withGuiche: true, allowedRoles: ACCESS.filaEspera }),
  },
  {
    path: "/sistema/confirmar-chegada",
    element: guard(<AdminConfirmarChegada />, { allowedRoles: ACCESS.confirmarChegada }),
  },
  // {
  //   path: "/sistema/ficha-atendimento",
  //   element: guard(<AdminFichaAtendimento />, { withGuiche: true, allowedRoles: ACCESS.prontuario }),
  // },
  // {
  //   path: "/sistema/registrar-servicos",
  //   element: guard(<AdminRegistrarServicosPage />, { withGuiche: true, allowedRoles: ACCESS.registrarServicos }),
  // },
  {
    path: "/sistema/cadastro-cidadao",
    element: guard(<AdminCadastroCidadao />, { allowedRoles: ACCESS.cadastroCidadao }),
  },
  {
    path: "/sistema/guiches",
    element: guard(<AdminGuichesSupervisor />, { allowedRoles: ACCESS.supervisorGuiches }),
  },
  // {
  //   path: "/sistema/agendar-cidadao",
  //   element: guard(<AdminAgendarCidadao />, { allowedRoles: ACCESS.agendarCidadao }),
  // },
  // {
  //   path: "/sistema/horario/:hora",
  //   element: guard(<VisualizarHorario />, { allowedRoles: ACCESS.horario }),
  // },
];
