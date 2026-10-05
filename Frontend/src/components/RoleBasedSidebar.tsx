import {
  Calendar,
  Users,
  FileText,
  FileHeart,
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
  FileDown,
  Boxes,
  PackageCheck,
  Pill,
  Package,
  ArrowRightLeft,
  TriangleAlert,
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
import { BrandLogo } from "./BrandLogo";

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
// ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…â€™ GRUPOS DO MENU
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
        roles: ["medico", "enfermeiro", "supervisor", "recepcionista"],
      },
      {
        title: "Fila de Encaixe",
        url: "/sistema/fila-espera",
        icon: Users,
        roles: ["recepcionista", "medico", "enfermeiro", "supervisor"],
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
    label: "Pacientes",
    items: [
      {
        title: "Prontuário",
        url: "/sistema/prontuario",
        icon: FileHeart,
        roles: ["medico"],
      },
    ],
  },

  {
    label: "Medicamentos",
    items: [
      {
        title: "Dispensação",
        url: "/sistema/dispensacao",
        icon: PackageCheck,
        roles: ["supervisor"],
      },
      {
        title: "Buscar Receitas",
        url: "/sistema/buscar-receitas",
        icon: FileText,
        roles: ["medico", "enfermeiro", "supervisor"],
      },
    ],
  },

  {
    label: "Estoque",
    items: [
      {
        title: "Saldo",
        url: "/sistema/estoque/saldo",
        icon: Boxes,
        roles: ["supervisor", "medico", "enfermeiro", "admin", "coordenador"],
      },
      {
        title: "Lotes",
        url: "/sistema/estoque/lotes",
        icon: Package,
        roles: ["supervisor", "admin", "coordenador"],
      },
      {
        title: "Movimentações",
        url: "/sistema/estoque/movimentacoes",
        icon: ArrowRightLeft,
        roles: ["supervisor", "admin", "coordenador"],
      },
      {
        title: "Alertas",
        url: "/sistema/estoque/alertas",
        icon: TriangleAlert,
        roles: ["supervisor", "admin", "coordenador"],
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
        roles: ["recepcionista"],
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
      //   title: "GerÃƒÆ’Ã‚Âªnciar profissionais",
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
        title: "Unidades",
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
        title: "Medicamentos",
        url: "/sistema/administrador/medicamentos",
        icon: Pill,
        roles: ["admin"],
      },
    ],
  },

  // {
  //   label: "Portal",
  //   items: [{ title: "DÃƒÆ’Ã‚Âºvidas frequentes", url: "/sistema/administrador/duvidas", icon: CircleHelp, roles: ["admin"] }],
  // },
];

export function RoleBasedSidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userRole = deriveRoleFromGroups(user?.grupos);
  const mesa = getMesaFromStorage();
  const location = useLocation();

  if (!user || !userRole) return null;

  const handleLogout = () => {
    clearMesaInStorage();
    logout();
    navigate("/sistema/login");
  };
  return (
    <Sidebar>
      <div className="flex flex-col items-center px-6 py-4">
        <BrandLogo size="sm" />
      </div>

      <SidebarContent>
        <div className="px-6 py-3 mx-2 mb-4 bg-muted/40 rounded-lg border border-border/50">
          <p className="text-sm font-medium leading-none mb-1">{user.nome}</p>

          <p className="text-xs text-muted-foreground italic">
            {userRole}
            {mesa && ` - ${mesa.nome}`}
          </p>
          {userRole !== "admin" && (
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

      <SidebarFooter className="p-4 border-t bg-background">
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
