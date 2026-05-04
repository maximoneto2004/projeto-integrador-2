import { useMemo, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { endOfWeek, format, startOfWeek } from "date-fns";
import { Activity, AlertTriangle, Clock3 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardSupervisor } from "@/hooks/sistema/useDashboardSupervisor";

import DashboardCard from "@/components/dashboard-supervisor/DashboardCard";
import { AtendimentosPorServicoSection } from "@/components/dashboard-supervisor/sections/AtendimentosPorServicoSection";
import { AgendamentosPorCategoriaSection } from "@/components/dashboard-supervisor/sections/AgendamentosPorCategoriaSection";
import { VolumeStatusSection } from "@/components/dashboard-supervisor/sections/VolumeStatusSection";
import { CapacidadeCargaSection } from "@/components/dashboard-supervisor/sections/CapacidadeCargaSection";
import { ResumoStatusSection } from "@/components/dashboard-supervisor/sections/ResumoStatusSection";
import { OrigemAtendimentosSection } from "@/components/dashboard-supervisor/sections/OrigemAtendimentosSection";

type RangeTipo = "hoje" | "semana" | "periodo";

const statusColors: Record<string, string> = {
  Marcados: "#2563eb",
  Atendimentos: "#0ea5e9",
  Ativados: "#f59e0b",
  Ausentes: "#dc2626",
  Cancelados: "#ef4444",
  Fila: "#f97316",
  Finalizados: "#10b981",
};

const formatMinutes = (value: number) => `${Math.round(value)} min`;

const AdminDashboardSupervisor = () => {
  const today = new Date();
  const { user } = useAuth();
  const [range, setRange] = useState<RangeTipo>("hoje");
  const [dateRange, setDateRange] = useState<DateRange>({ from: new Date(), to: new Date() });

  const unidadeId = user?.unidade_ativa?.id || "";

  const { dataInicio, dataFim } = useMemo(() => {
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    const from = range === "hoje" ? today : range === "semana" ? weekStart : dateRange?.from || today;
    const to = range === "hoje" ? today : range === "semana" ? weekEnd : dateRange?.to || from;

    return {
      dataInicio: format(from, "yyyy-MM-dd"),
      dataFim: format(to, "yyyy-MM-dd"),
    };
  }, [dateRange?.from, dateRange?.to, range, today]);

  const {
    data: dashboard,
    isLoading: loading,
    error,
  } = useDashboardSupervisor({
    unidade_id: unidadeId,
    data_inicio: dataInicio,
    data_fim: dataFim,
  });

  const totalAgendamentos = dashboard?.total_agendamentos || 0;
  const emAtendimento = dashboard?.em_atendimento || 0;
  const aguardandoAtivado = dashboard?.aguardando_atendimento_ativado || 0;
  const naoCompareceu = dashboard?.nao_compareceu || 0;
  const cancelados = dashboard?.cancelados || 0;
  const aguardandoFila = dashboard?.aguardando_fila || 0;
  const agendados = dashboard?.agendados || 0;
  const finalizados = dashboard?.finalizados || 0;

  const rangeLabel = range === "hoje" ? "hoje" : range === "semana" ? "semana" : "período";

  const statusSelecionado = {
    Marcados: agendados,
    Atendimentos: emAtendimento,
    Ativados: aguardandoAtivado,
    Ausentes: naoCompareceu,
    Cancelados: cancelados,
    Fila: aguardandoFila,
    Finalizados: finalizados,
  };

  const noShowRate = Number(dashboard?.taxa_nao_comparecimento || 0);
  const tempoMedio = Number(dashboard?.tempo_medio || 0);

  const horariosChartData = (dashboard?.atendimentos_por_hora || [])
    .map((item) => ({ hora: `${String(item.hour).padStart(2, "0")}h`, total: item.total || 0 }))
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const horarioPico = horariosChartData.reduce(
    (max, item) => (item.total > max.total ? item : max),
    { hora: "--", total: 0 }
  );

  const produtividadePorColaborador = (dashboard?.servicos_metricas || []).map((item) => ({
    atendente: item.servico_nome || "Serviço",
    total: item.total || 0,
    tempoMedioColaborador: item.tempo_medio_atendimento_min || 0,
  }));

  const categoriaChartData = (dashboard?.agendamentos_por_classe || []).map((item) => ({
    categoria: item.servico__classe__nome || "Sem categoria",
    total: item.total || 0,
  }));

  const statusResumoData = [
    { label: "Reagendados", total: 0 },
    { label: "Cancelados", total: cancelados },
    { label: "Ausente", total: naoCompareceu },
    { label: "Atendidos", total: finalizados },
  ];

  const origemData = (dashboard?.origem_atendimentos || []).map((item) => ({
    origem: item.origem || "Não informado",
    total: item.total || 0,
  }));

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />

        <main className="flex-1 bg-muted/30">
          <header className="sticky top-0 z-10 flex flex-col gap-3 border-b bg-background px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Dashboard da Unidade</h1>
                <p className="text-sm text-muted-foreground">Visão consolidada de operação, capacidade e qualidade por período</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 md:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-md border bg-card p-1 gap-2">
                  <Button size="sm" variant={range === "hoje" ? "default" : "ghost"} onClick={() => setRange("hoje")}>
                    Hoje
                  </Button>

                  <Button
                    size="sm"
                    variant={range === "semana" ? "default" : "ghost"}
                    onClick={() => setRange("semana")}
                  >
                    Semana
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-[260px] justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}
                        onClick={() => setRange("periodo")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                            </>
                          ) : (
                            format(dateRange.from, "dd/MM/yyyy")
                          )
                        ) : (
                          "Selecionar período"
                        )}
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={(selected) => {
                          setDateRange(selected ?? {});
                          if (selected?.from && selected?.to) setRange("periodo");
                        }}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
{/* 
                <Button variant="outline" size="sm" disabled>
                  Exportar CSV
                </Button> */}
              </div>
            </div>
          </header>

          <div className="space-y-6 p-6">
            {!unidadeId && (
              <p className="text-sm text-muted-foreground">Usuário sem unidade ativa. Não foi possível carregar os dados do dashboard.</p>
            )}
            {error && <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Erro ao carregar dashboard."}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <DashboardCard
                title={`Atendimentos (${rangeLabel})`}
                value={`${totalAgendamentos}`}
                icon={Activity}
                accent="bg-primary/10 text-primary"
              />

              <DashboardCard
                title="Aguardando atendimento"
                value={`${aguardandoAtivado}`}
                icon={Activity}
                accent="bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-100"
              />

              <DashboardCard
                title="Taxa de não comparecimento"
                value={`${noShowRate.toFixed(1)}%`}
                icon={AlertTriangle}
                accent="bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-100"
              />

              <DashboardCard
                title="Tempo médio"
                value={totalAgendamentos ? formatMinutes(tempoMedio) : "--"}
                icon={Clock3}
                accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <VolumeStatusSection
                data={Object.keys(statusSelecionado).map((status) => ({
                  status,
                  total: statusSelecionado[status as keyof typeof statusSelecionado],
                  fill: statusColors[status] || "#94a3b8",
                }))}
              />
              <AtendimentosPorServicoSection data={produtividadePorColaborador} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <CapacidadeCargaSection data={horariosChartData} horarioPico={horarioPico} />
              <AgendamentosPorCategoriaSection
                data={categoriaChartData}
                subtitle={range === "hoje" ? "Hoje" : range === "semana" ? "Semana" : "Período selecionado"}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <ResumoStatusSection data={statusResumoData} />
              <OrigemAtendimentosSection data={origemData} />
            </div>

            {loading && <p className="text-sm text-muted-foreground">Carregando dados...</p>}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboardSupervisor;
