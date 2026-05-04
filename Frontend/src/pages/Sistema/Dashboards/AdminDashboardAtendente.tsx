import { useMemo, useState } from "react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Activity, Clock3, Users, PhoneCall } from "lucide-react";

import { AtendenteCard } from "@/components/dashboard-atendente/cards/AtendenteCard";

import { VolumeTurnoChart } from "@/components/dashboard-atendente/charts/VolumeTurnoChart";
import { AtendimentosPorCanalChart } from "@/components/dashboard-atendente/charts/AtendimentosPorCanalChart";
import { AtendimentosPorServicoChart } from "@/components/dashboard-atendente/charts/AtendimentosPorServicoChart";
import { StatusAtendimentosChart } from "@/components/dashboard-atendente/charts/StatusAtendimentosChart";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

type RangeTipo = "hoje" | "semana";

// -------------------------
// 🔢 DADOS MOCKADOS
// -------------------------

const volumeTurno = [
  { turno: "Manha", atendimentos: 18, filaMedia: 6, tempoFila: 12 },
  { turno: "Tarde", atendimentos: 14, filaMedia: 5, tempoFila: 10 },
  { turno: "Noite", atendimentos: 8, filaMedia: 3, tempoFila: 8 },
];

const porCanal = [
  { canal: "Fila de espera", total: 12, tma: 23 },
  { canal: "Portal", total: 9, tma: 19 },
  { canal: "SPU", total: 6, tma: 21 },
  { canal: "Encaminhado", total: 7, tma: 17 },
];

const porServico = [
  { servico: "Auxílio Bolsa Família", total: 9, tma: 19 },
  { servico: "Benefício BPC", total: 7, tma: 23 },
  { servico: "Cadastro Único", total: 10, tma: 18 },
  { servico: "Atualização cadastral", total: 6, tma: 21 },
  { servico: "Orientação social", total: 5, tma: 17 },
];

const statusAtendimentos = [
  { status: "Aguardando", total: 8 },
  { status: "Ativado - Aguardando Atendimento", total: 4 },
  { status: "Em Atendimento", total: 6 },
  { status: "Finalizado", total: 10 },
  { status: "Cancelado", total: 2 },
  { status: "Não Compareceu", total: 1 },
];

const statusColors = [
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#6366f1",
  "#ef4444",
  "#94a3b8",
];

// -------------------------
// 🧠 COMPONENTE PRINCIPAL
// -------------------------

const AdminDashboardAtendente = () => {
  const [range] = useState<RangeTipo>("hoje");
  const hojeLabel = format(new Date(), "dd/MM", { locale: ptBR });

  const totals = useMemo(() => {
    const atendimentos = volumeTurno.reduce(
      (acc, item) => acc + item.atendimentos,
      0
    );

    const filaAtual = porCanal.reduce((acc, item) => acc + item.total, 0);

    const tma =
      porServico.reduce((acc, item) => acc + item.tma, 0) /
      porServico.length;

    const esperaMedia =
      volumeTurno.reduce((acc, item) => acc + item.tempoFila, 0) /
      volumeTurno.length;

    return {
      atendimentos,
      filaAtual,
      tma: Math.round(tma),
      esperaMedia: Math.round(esperaMedia),
    };
  }, []);

  const cards = [
    {
      title: "Atendimentos no dia",
      value: totals.atendimentos,
      icon: Activity,
      helper: "Somando todos os turnos",
    },
    {
      title: "Fila atual",
      value: `${totals.filaAtual} pessoas`,
      icon: Users,
      helper: `Tempo médio: ${totals.esperaMedia} min`,
    },
    {
      title: "TMA (duração)",
      value: `${totals.tma} min`,
      icon: Clock3,
      helper: "",
    },
    {
      title: "Espera e primeira resposta",
      value: `${totals.esperaMedia} min`,
      icon: PhoneCall,
      helper: "Do chamado ao início do atendimento",
    },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />

        <main className="flex-1 bg-muted/30">
          {/* ---------------- HEADER ---------------- */}
          <header className="sticky top-0 z-10 flex flex-col gap-3 border-b bg-background px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Dashboard do Atendente
                </h1>
                <p className="text-sm text-muted-foreground">
                  Volume, carga e tempos do atendimento{" "}
                  {range === "hoje" ? "de hoje" : "da semana"} ({hojeLabel})
                </p>
              </div>
            </div>

            <Button variant="outline" size="sm">
              Exportar CSV
            </Button>
          </header>

          {/* ---------------- BODY ---------------- */}
          <div className="space-y-6 p-6">
            {/* CARDS RESUMO */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {cards.map((card) => (
                <AtendenteCard key={card.title} {...card} />
              ))}
            </div>

            {/* GRÁFICOS PRINCIPAIS */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {/* VOLUME POR TURNO */}
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Volume por turno</CardTitle>
                  <CardDescription>
                    Atendimentos, fila média e tempo médio de fila
                  </CardDescription>
                </CardHeader>

                <CardContent className="h-80">
                  <VolumeTurnoChart data={volumeTurno} />
                </CardContent>
              </Card>

              {/* POR CANAL */}
              <Card>
                <CardHeader>
                  <CardTitle>Atendimentos por canal</CardTitle>
                  <CardDescription>
                    Volume e TMA médio por canal de entrada
                  </CardDescription>
                </CardHeader>

                <CardContent className="h-80">
                  <AtendimentosPorCanalChart data={porCanal} />
                </CardContent>
              </Card>
            </div>

            {/* SERVIÇOS + STATUS */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {/* POR SERVIÇO */}
              <Card>
                <CardHeader>
                  <CardTitle>Atendimentos por serviço</CardTitle>
                  <CardDescription>
                    Volume e TMA médio por serviço prestado
                  </CardDescription>
                </CardHeader>

                <CardContent className="h-80">
                  <AtendimentosPorServicoChart data={porServico} />
                </CardContent>
              </Card>

              {/* STATUS */}
              <Card>
                <CardHeader>
                  <CardTitle>Status dos atendimentos</CardTitle>
                  <CardDescription>
                    Aguardando, em atendimento, finalizados e outros
                  </CardDescription>
                </CardHeader>

                <CardContent className="h-80">
                  <StatusAtendimentosChart
                    data={statusAtendimentos}
                    colors={statusColors}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboardAtendente;
