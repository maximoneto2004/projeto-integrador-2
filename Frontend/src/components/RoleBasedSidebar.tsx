import {
  Calendar,
  Users,
  FileText,
  Gauge,
  BarChart3,
  LogOut,
  PhoneCall,
  FolderKanban,
  NotebookPen,
  UserRoundPen,
  AlarmClock,
  Building2,
  Layers,
  MapPin,
  CircleHelp,
  Map,
  FileDown
} from "lucide-react";

import { NavLink } from "./NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

import type { UserRole } from "@/types/auth";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { clearMesaInStorage, deriveRoleFromGroups, getMesaFromStorage } from "@/lib/authHelpers";
import { useEffect } from "react";
import logoSdhdsCor from "@/assets/images/logo-sdhds-cor.png";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  roles: UserRole[];
  newTab?: boolean;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

// ------------------------------
// 📌 GRUPOS DO MENU
// ------------------------------
const menuGroups: MenuGroup[] = [


  {
    label: "Dashboard",
    items: [
      {
        title: "Dashboard da unidade",
        url: "/sistema/dashboard",
        icon: BarChart3,
        roles: ["supervisor", "coordenador"],
      },
      {
        title: "Dashboard Gestor",
        url: "/sistema/dashboard-gestor",
        icon: BarChart3,
        roles: ["gestor"],
      },
      {
        title: "Monitor por Unidade",
        url: "/sistema/monitor-unidade",
        icon: Gauge,
        roles: ["gestor"],
      },
    ],
  },

  {
    label: "Atendimentos",
    items: [
      {
        title: "Lista",
        url: "/sistema/agendamentos",
        icon: Calendar,
        roles: ["atendente", "supervisor", "recepcionista", "atendente 156"],
      },
      {
        title: "Fila de Encaixe",
        url: "/sistema/fila-espera",
        icon: Users,
        roles: ["recepcionista", "atendente", "supervisor"],
      },
    ],
  },


  {
    label: "Mapa",
    items: [
      {
        title: "Mapa de Unidades",
        url: "/sistema/mapa-unidades",
        icon: Map,
        roles: ["gestor"],
      },
    ],
  },

  {
    label: "Monitoramento",
    items: [
      {
        title: "Guichês",
        url: "/sistema/guiches",
        icon: Gauge,
        roles: ["supervisor"],
      },
      {
        title: "Painel de Chamadas",
        url: "/sistema/painel-publico",
        icon: PhoneCall,
        roles: ["supervisor", "recepcionista"],
        newTab: true,
      },
    ],
  },

  {
    label: "Prontuário",
    items: [
      {
        title: "Buscar Prontuário",
        url: "/sistema/buscar-prontuario",
        icon: FileText,
        roles: ["atendente"],
      },
    ],
  },

  {
    label: "Cidadão",
    items: [
      {
        title: "Agendar e cadastrar",
        url: "/sistema/cadastro-cidadao",
        icon: UserRoundPen,
        roles: ["atendente 156", "recepcionista"],
      },
    ],
  },

  {
    label: "Serviços",
    items: [
      {
        title: "Gerenciar",
        url: "/sistema/configurar-servicos",
        icon: FolderKanban,
        roles: ["coordenador"],
      },

      // {
      //   title: "Gerênciar profissionais",
      //   url: "/sistema/gerenciar-profissionais",
      //   icon: Users,
      //   roles: ["coordenador"],
      // },
    ],
  },
  {
    label: "Profissionais",
    items: [
      {
        title: "Buscar ",
        url: "/sistema/cadastro-profissionais",
        icon: Users,
        roles: ["coordenador"],
      },

      {
        title: "Cadastrar",
        url: "/sistema/cadastro/profissional",
        icon: NotebookPen,
        roles: ["coordenador"],
      },
    ],
  },

  {
    label: "Unidade",
    items: [
      {
        title: "Guichês",
        url: "/sistema/coordenador/guiches",
        icon: Gauge,
        roles: ["coordenador"],
      },
      {
        title: "Bloquear horários",
        url: "/sistema/bloquear-horarios",
        icon: AlarmClock,
        roles: ["coordenador"],
      },

      // {        saDASDAA
      //   title: "Controle de capacidade",
      //   url: "/sistema/controle-capacidade",
      //   icon: Users,
      //   roles: ["coordenador"],
      // },
    ],
  },
  {
    label: "Gerenciamento do sistema",
    items: [
      {
        title: "Unidades CRAS",
        url: "/sistema/administrador/unidades",
        icon: Building2,
        roles: ["admin"],
      },
      {
        title: "Serviços",
        url: "/sistema/administrador/servicos",
        icon: Layers,
        roles: ["admin"],
      },
      {
        title: "Bairros",
        url: "/sistema/administrador/bairros",
        icon: MapPin,
        roles: ["admin"],
      },
      {
        title: "Campos Prontuário",
        url: "/sistema/administrador/prontuario-campos",
        icon: FileText,
        roles: ["admin"],
      },
    ],
  },

  {
    label: "Relatórios",
    items: [
      {
        title: "Geração de relatórios",
        url: "/sistema/relatorio",
        icon: FileDown,
        roles: ["admin", "gestor", "coordenador"],
      },
    ]
  },

  {
    label: "Portal",
    items: [{ title: "Dúvidas frequentes", url: "/sistema/administrador/duvidas", icon: CircleHelp, roles: ["admin"] }],
  },
];

export function RoleBasedSidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userRole = deriveRoleFromGroups(user?.grupos);
  const mesa = getMesaFromStorage();
  const location = useLocation();
  const citinovaLogoSrc = encodeURI(`${import.meta.env.BASE_URL}CITINOVA_COR (1).png`);

  if (!user || !userRole) return null;

  const handleLogout = () => {
    clearMesaInStorage();
    logout();
    navigate("/sistema/login");
  };
  return (
    <Sidebar>
      {/* 1. Header Dedicado para a Logo */}
      <div className="flex flex-col items-center px-6 py-4">
        <img src={logoSdhdsCor} alt="Logo Prefeitura" className="h-14 w-auto object-contain " />
      </div>

      <SidebarContent>
        <div className="px-6 py-3 mx-2 mb-4 bg-muted/40 rounded-lg border border-border/50">
          <p className="text-sm font-medium leading-none mb-1">{user.nome}</p>

          <p className="text-xs text-muted-foreground italic">
            {userRole}
            {mesa && ` - ${mesa.nome}`}
          </p>
          {userRole !== "atendente 156" && userRole !== "admin" && (
            <p className="text-xs text-muted-foreground italic">{`Unidade: ${user.unidade_ativa.nome}`}</p>
          )}
        </div>

        {/* 3. Grupos de Menu */}
        <SidebarGroupContent>
          {menuGroups.map((group) => {
            const allowedItems = group.items.filter((item) => item.roles.includes(userRole));

            if (allowedItems.length === 0) return null;

            return (
              <SidebarGroup key={group.label} className="py-0">
                <SidebarGroupLabel className="px-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/70">
                  {group.label}
                </SidebarGroupLabel>

                <SidebarGroupContent>
                  <SidebarMenu className="gap-1 px-2">
                    {allowedItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            target={item.newTab ? "_blank" : undefined}
                            rel={item.newTab ? "noopener noreferrer" : undefined}
                            className="flex items-center gap-3 px-3 py-2 rounded-md transition-all hover:bg-accent"
                            activeClassName="bg-primary/10 text-primary font-semibold border-r-4 border-primary rounded-r-none"
                          >
                            <item.icon className="h-4 w-4" />
                            <span className="text-sm">{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </SidebarGroupContent>
      </SidebarContent>

      <div className="flex flex-col items-center justify-center gap-2">
        <img src={citinovaLogoSrc} alt="Logo CITINOVA" className="h-16 w-auto object-contain" />
        {/* <img src={logoSdhdsCor} alt="Logo SDHDS" className="h-8 w-auto pb-4 object-contain" /> */}

      </div>
      <SidebarFooter className="p-4 border-t bg-background">
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
