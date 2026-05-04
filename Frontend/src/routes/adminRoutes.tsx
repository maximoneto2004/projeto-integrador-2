import { RouteObject } from "react-router-dom";
import { guard } from "./guard";
import { ACCESS } from "@/security/acess";
import AdminAtendimentoPublico from "@/pages/Indefinidos/AdminAtendimentoPublico";
import AdminConfigurarServicos from "@/pages/Sistema/Coordenador/AdminConfigurarServicos";
import AdminBloquearHorarios from "@/pages/Sistema/Coordenador/AdminBloquearHorarios";
import AdminGerenciarProfissionais from "@/pages/Indefinidos/AdminGerenciarProfissionais";
import AdminControleCapacidade from "@/pages/Indefinidos/AdminControleCapacidade";
import AdminGerenciarUnidades from "@/pages/Indefinidos/AdminGerenciarUnidades";
import AdminCadastroServico from "@/pages/Indefinidos/AdminCadastroServico";
import AdminCadastroUnidade from "@/pages/Indefinidos/AdminCadastroUnidade";
import AdminCadastroProfissional from "@/pages/Sistema/Coordenador/AdminCadastroProfissional";
import AdminBuscarProfissionais from "@/pages/Sistema/Coordenador/AdminBuscarProfissionais";
import AdminGuichesCoordenador from "@/pages/Sistema/Coordenador/AdminGuichesCoordenador";
import AdminPerguntaFrequentesPage from "@/pages/Sistema/Administrador/AdminPerguntasFrequentesPage";
import AdminUnidadesPage from "@/pages/Sistema/Administrador/AdminUnidadesPage";
import AdminServicosTabelasPage from "@/pages/Sistema/Administrador/AdminServicosTabelasPage";
import AdminBairrosPage from "@/pages/Sistema/Administrador/AdminBairrosPage";
import AdminProntuarioCamposPage from "@/pages/Sistema/Administrador/AdminProntuarioCamposPage";
import AdminMapaUnidades from "@/pages/Sistema/Dashboards/AdminMapaUnidades";
import AdminLogin from "@/pages/Sistema/AdminLogin";
import AlterarSenha from "@/pages/Sistema/AlterarSenha";
import PainelPublico from "@/pages/PainelPublico";
import Relatorio from "@/pages/Sistema/Relatorio";

export const adminRoutes: RouteObject[] = [
  {
    path: "/sistema/login",
    element: <AdminLogin />,
  },
  {
    path: "/sistema/alterar-senha",
    element: <AlterarSenha />,
  },
  {
    path: "/sistema/painel-publico",
    element: <PainelPublico />,
  },
  {
    path: "/sistema/atendimento-publico",
    element: guard(<AdminAtendimentoPublico />, { allowedRoles: ACCESS.atendimentoPublico }),
  },
  {
    path: "/sistema/configurar-servicos",
    element: guard(<AdminConfigurarServicos />, { allowedRoles: ACCESS.configurarServicos }),
  },
  {
    path: "/sistema/bloquear-horarios",
    element: guard(<AdminBloquearHorarios />, { allowedRoles: ACCESS.bloquearHorarios }),
  },
  {
    path: "/sistema/coordenador/guiches",
    element: guard(<AdminGuichesCoordenador />, { allowedRoles: ACCESS.coordenadorGuiches }),
  },
  {
    path: "/sistema/gerenciar-profissionais",
    element: guard(<AdminGerenciarProfissionais />, { allowedRoles: ACCESS.gerenciarProfissionais }),
  },
  {
    path: "/sistema/cadastro-profissionais",
    element: guard(<AdminBuscarProfissionais />, { allowedRoles: ACCESS.gerenciarProfissionais }),
  },
  // {
  //     path: "/sistema/controle-capacidade",
  //     element: guard(<AdminControleCapacidade />, { allowedRoles: ACCESS.controleCapacidade }),
  // },
  {
    path: "/sistema/gerenciar-unidades",
    element: guard(<AdminGerenciarUnidades />, { allowedRoles: ACCESS.gerenciarUnidades }),
  },
  {
    path: "/sistema/cadastro/servico",
    element: guard(<AdminCadastroServico />, { allowedRoles: ACCESS.cadastroServico }),
  },
  {
    path: "/sistema/cadastro/unidade",
    element: guard(<AdminCadastroUnidade />, { allowedRoles: ACCESS.cadastroUnidade }),
  },
  {
    path: "/sistema/cadastro/profissional",
    element: guard(<AdminCadastroProfissional />, { allowedRoles: ACCESS.cadastroProfissional }),
  },
  {
    path: "/sistema/administrador/unidades",
    element: guard(<AdminUnidadesPage />, { allowedRoles: ACCESS.adminUnidades }),
  },
  {
    path: "/sistema/administrador/servicos",
    element: guard(<AdminServicosTabelasPage />, { allowedRoles: ACCESS.adminServicos }),
  },
  {
    path: "/sistema/administrador/bairros",
    element: guard(<AdminBairrosPage />, { allowedRoles: ACCESS.adminBairros }),
  },
  {
    path: "/sistema/administrador/prontuario-campos",
    element: guard(<AdminProntuarioCamposPage />, { allowedRoles: ACCESS.adminProntuarioCampos }),
  },
  {
    path: "/sistema/mapa-unidades",
    element: guard(<AdminMapaUnidades />, { allowedRoles: ACCESS.gerenciarUnidades }),
  },
  { 
    path: "/sistema/administrador/duvidas", 
    element: guard(<AdminPerguntaFrequentesPage />, { allowedRoles: ACCESS.adminPerguntas }) 
  },
  {
    path: "/sistema/relatorio",
    element: guard(<Relatorio />, { allowedRoles: ACCESS.relatorio})
  }
];
