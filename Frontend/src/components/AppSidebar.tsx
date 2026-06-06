import { useNavigate, useLocation } from "react-router-dom";
import {
  Calendar,
  ClipboardList,
  Settings,
  Users,
  Building2,
  Briefcase,
  Clock,
  Ban,
  Gauge,
  BarChart3,
  LogOut,
  Home,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

// const menuItems = [
//   {
//     title: "Início",
//     url: "/",
//     icon: Home,
//   },
// ];

const agendamentosItems = [
  {
    title: "Atendimento ao Público",
    url: "/sistema/atendimento-publico",
    icon: Users,
  },
  {
    title: "Lista de Agendamentos",
    url: "/sistema/agendamentos",
    icon: Calendar,
  },
  {
    title: "Registrar Atendimento",
    url: "/sistema/registrar-atendimento",
    icon: ClipboardList,
  },
];

const configuracaoItems = [
  {
    title: "Configurar Serviços",
    url: "/sistema/configurar-servicos",
    icon: Settings,
  },
  {
    title: "Bloquear Horários",
    url: "/sistema/bloquear-horarios",
    icon: Ban,
  },
  {
    title: "Controle de Capacidade",
    url: "/sistema/controle-capacidade",
    icon: Gauge,
  },
];

const cadastroItems = [
  {
    title: "Gerenciar Unidades",
    url: "/sistema/gerenciar-unidades",
    icon: Building2,
  },
  {
    title: "Cadastrar Serviços",
    url: "/sistema/cadastro/servico",
    icon: Briefcase,
  },
  {
    title: "Gerenciar Profissionais",
    url: "/sistema/gerenciar-profissionais",
    icon: Users,
  },
];

const relatorioItems = [
  {
    title: "Relatórios",
    url: "/sistema/relatorios",
    icon: BarChart3,
  },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">CRAS Fortaleza</span>
          <span className="text-xs text-muted-foreground">Painel Admin</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Menu Principal */}
        {/* <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup> */}

        {/* Agendamentos */}
        <SidebarGroup>
          <SidebarGroupLabel>Agendamentos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {agendamentosItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configurações */}
        <SidebarGroup>
          <SidebarGroupLabel>Configurações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configuracaoItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Cadastros */}
        <SidebarGroup>
          <SidebarGroupLabel>Cadastros</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {cadastroItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Relatórios */}
        <SidebarGroup>
          <SidebarGroupLabel>Relatórios</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {relatorioItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate("/sistema/login")} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

