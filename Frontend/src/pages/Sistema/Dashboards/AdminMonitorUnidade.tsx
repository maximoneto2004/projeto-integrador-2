import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";

import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useDashboardMonitorUnidade } from "@/hooks/sistema/useDashboardMonitorUnidade";
import { useUnidadesCras } from "@/hooks/useUnidadesCras";
import { MonitorUnidadeTooltip } from "@/components/dashboard-monitor-unidade/charts/MonitorUnidadeTooltip";
import { MonitorUnidadeCardsGrid } from "@/components/dashboard-monitor-unidade/cards/MonitorUnidadeCardsGrid";
import { FilaPorStatusSection } from "@/components/dashboard-monitor-unidade/sections/FilaPorStatusSection";
import { TempoMedioAtendimentoSection } from "@/components/dashboard-monitor-unidade/sections/TempoMedioAtendimentoSection";
import { AtendimentosPorHoraSection } from "@/components/dashboard-monitor-unidade/sections/AtendimentosPorHoraSection";
import { ServicosMaisBuscadosSection } from "@/components/dashboard-monitor-unidade/sections/ServicosMaisBuscadosSection";
import { IndicadoresPorServicoSection } from "@/components/dashboard-monitor-unidade/sections/IndicadoresPorServicoSection";

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const formatApiDate = (value: Date) => format(value, "yyyy-MM-dd");
type RangeTipo = "hoje" | "periodo";

const AdminMonitorUnidade = () => {
  const [unidadeSelecionada, setUnidadeSelecionada] = useState("");
  const [unidadeOpen, setUnidadeOpen] = useState(false);
  const [range, setRange] = useState<RangeTipo>("hoje");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const { unidades, loading: loadingUnidades, error: unidadesError, fetchUnidades } = useUnidadesCras("");

  useEffect(() => {
    void fetchUnidades();
  }, [fetchUnidades]);

  useEffect(() => {
    if (!unidadeSelecionada && unidades.length > 0) {
      setUnidadeSelecionada(unidades[0].id);
    }
  }, [unidadeSelecionada, unidades]);

  const periodoSelecionado = useMemo(() => {
    const hoje = new Date();
    if (range === "hoje") {
      const data = formatApiDate(hoje);
      return { data_inicio: data, data_fim: data };
    }

    const from = dateRange?.from ?? hoje;
    const to = dateRange?.to ?? from;
    return {
      data_inicio: formatApiDate(from),
      data_fim: formatApiDate(to),
    };
  }, [dateRange?.from, dateRange?.to, range]);

  const {
    data: dashboard,
    isLoading: loadingDashboard,
    error: dashboardError,
  } = useDashboardMonitorUnidade({
    unidade_id: unidadeSelecionada,
    data_inicio: periodoSelecionado.data_inicio,
    data_fim: periodoSelecionado.data_fim,
  });

  const totalAgendamentos = Number(dashboard?.total_agendamentos || 0);
  const emAtendimento = Number(dashboard?.em_atendimento || 0);
  const aguardandoAtivado = Number(dashboard?.aguardando_atendimento_ativado || 0);
  const naoCompareceu = Number(dashboard?.nao_compareceu || 0);
  const cancelados = Number(dashboard?.cancelados || 0);
  const aguardandoFila = Number(dashboard?.aguardando_fila || 0);
  const noShowRate = clampPercent(Number(dashboard?.taxa_nao_comparecimento || 0));
  const comparecimento = clampPercent(100 - noShowRate);
  const tempoMedio = Number(dashboard?.tempo_medio || 0);
  const finalizados = Number(dashboard?.finalizados || 0);
  const agendados = Number(dashboard?.agendados || 0);

  const filaPorStatus = [
    { status: "Agendado", total: agendados },
    // { status: "Aguardando fila", total: aguardandoFila },
    { status: "Ativados", total: aguardandoAtivado },
    { status: "Atendimento", total: emAtendimento },
    { status: "Ausente", total: naoCompareceu },
    { status: "Cancelado", total: cancelados },
    { status: "Finalizado", total: finalizados },
  ];

  const atendimentosPorHora = (dashboard?.atendimentos_por_hora || []).map((item) => ({
    hora: `${String(item.hour).padStart(2, "0")}h`,
    total: item.total || 0,
  }));

  const servicosMaisBuscados = (dashboard?.atendimentos_categoria || [])
    .map((item) => ({ servico: item.servico__nome || "Sem serviço", total: item.total || 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const servicosMetricas = dashboard?.servicos_metricas || [];

  const loading = loadingUnidades || loadingDashboard;
  const hasError = unidadesError || dashboardError;
  const periodoResumo = useMemo(() => {
    const inicio = periodoSelecionado.data_inicio;
    const fim = periodoSelecionado.data_fim;
    if (!inicio || !fim) return "";
    const ini = format(new Date(`${inicio}T00:00:00`), "dd/MM/yyyy");
    const end = format(new Date(`${fim}T00:00:00`), "dd/MM/yyyy");
    return `${ini} - ${end}`;
  }, [periodoSelecionado.data_fim, periodoSelecionado.data_inicio]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <RoleBasedSidebar />
        <main className="flex-1 bg-muted/30">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight">Monitor da Unidade</h1>
                <p className="text-sm text-muted-foreground break-words">
                  Indicadores da unidade selecionada ({range === "hoje" ? "hoje" : "período selecionado"}: {periodoResumo})
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Popover open={unidadeOpen} onOpenChange={setUnidadeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={unidadeOpen}
                    disabled={loadingUnidades}
                    className="w-[220px] xl:w-[280px] justify-between"
                  >
                    <span className="truncate">
                      {unidades.find((u) => u.id === unidadeSelecionada)?.nome || (loadingUnidades ? "Carregando unidades..." : "Escolha a unidade")}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Digite o nome da unidade..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
                      <CommandGroup>
                        {unidades.map((u) => (
                          <CommandItem
                            key={u.id}
                            value={u.nome}
                            onSelect={() => {
                              setUnidadeSelecionada(u.id);
                              setUnidadeOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", u.id === unidadeSelecionada ? "opacity-100" : "opacity-0")} />
                            {u.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="flex rounded-md border bg-card p-1 gap-2">
                <Button size="sm" variant={range === "hoje" ? "default" : "ghost"} onClick={() => setRange("hoje")}>
                  Hoje
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-[220px] xl:w-[260px] justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}
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
                      onSelect={(newRange) => {
                        setDateRange(newRange);
                        if (newRange?.from && newRange?.to) setRange("periodo");
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </header>

          <div className="space-y-6 p-6">
            {hasError && (
              <p className="text-sm text-destructive">
                {dashboardError instanceof Error
                  ? dashboardError.message
                  : unidadesError instanceof Error
                    ? unidadesError.message
                    : "Erro ao carregar dados do monitor."}
              </p>
            )}

            <MonitorUnidadeCardsGrid
              totalAgendamentos={totalAgendamentos}
              ativados={aguardandoFila + aguardandoAtivado}
              comparecimento={comparecimento}
              noShowRate={noShowRate}
            />

            <div className="grid gap-4 lg:grid-cols-3">
              <FilaPorStatusSection data={filaPorStatus} tooltip={<MonitorUnidadeTooltip />} />
              <TempoMedioAtendimentoSection totalAgendamentos={totalAgendamentos} tempoMedio={tempoMedio} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <AtendimentosPorHoraSection data={atendimentosPorHora} tooltip={<MonitorUnidadeTooltip />} />
              <ServicosMaisBuscadosSection data={servicosMaisBuscados} />
            </div>

            <IndicadoresPorServicoSection data={servicosMetricas} loading={loading} />

            {loading && <p className="text-sm text-muted-foreground">Carregando dados do monitor...</p>}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminMonitorUnidade;
