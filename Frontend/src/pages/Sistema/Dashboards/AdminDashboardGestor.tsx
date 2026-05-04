import { useEffect, useMemo, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { AlertTriangle, ArrowUpRight, Clock3, Gauge, MapPin, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { toast } from "@/lib/sonner";
import { getApiErrorMessage } from "@/lib/notifications";
import {
  dashboardGestorService,
  type DashboardGestorResult,
} from "@/services/sistema/dashboardGestorService";
import { GestorCard } from "@/components/dashboard-gestor/cards/GestorCard";
import { DashboardGestorTooltip } from "@/components/dashboard-gestor/charts/DashboardGestorTooltip";
import { AtendimentosPorUnidadeSection } from "@/components/dashboard-gestor/sections/AtendimentosPorUnidadeSection";
import { PerfisPublicoSection } from "@/components/dashboard-gestor/sections/PerfisPublicoSection";
import { CapacidadeAgendaSection } from "@/components/dashboard-gestor/sections/CapacidadeAgendaSection";
import { FilaDuracaoSection } from "@/components/dashboard-gestor/sections/FilaDuracaoSection";

type RangeTipo = "hoje" | "periodo";

const cores = ["#2563eb", "#22c55e", "#f97316", "#0ea5e9", "#a855f7", "#f43f5e"];

const formatApiDate = (value: Date) => format(value, "yyyy-MM-dd");

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const mapPrioridadeLabel = (prioridade: string) => {
  const normalized = (prioridade || "").toUpperCase();
  if (normalized === "PREFERENCIAL+") return "Preferencial+";
  if (normalized === "PREFERENCIAL") return "Preferencial";
  return prioridade || "Sem classificação";
};

const AdminDashboardGestor = () => {
  const [range, setRange] = useState<RangeTipo>("hoje");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardGestorResult | null>(null);

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

  useEffect(() => {
    let active = true;

    const carregar = async () => {
      setLoading(true);
      try {
        const { data } = await dashboardGestorService.obter(periodoSelecionado);
        if (!active) return;

        if (!data?.success || !data.results) {
          setDashboard(null);
          return;
        }

        setDashboard(data.results);
      } catch (err) {
        if (!active) return;
        setDashboard(null);
        toast.error(getApiErrorMessage(err, "Não foi possível carregar o dashboard do gestor."));
      } finally {
        if (active) setLoading(false);
      }
    };

    void carregar();
    return () => {
      active = false;
    };
  }, [periodoSelecionado.data_inicio, periodoSelecionado.data_fim]);

  const comparecimentoBase = useMemo(() => {
    if (!dashboard) return 0;
    return clampPercent(100 - (dashboard.taxa_nao_comparecimento || 0));
  }, [dashboard]);

  const prioridadePorUnidade = useMemo(() => {
    const mapa = new Map<string, number>();
    (dashboard?.pessoas_prioridades || []).forEach((item) => {
      const unidade = item.unidade_name || "Sem unidade";
      mapa.set(unidade, (mapa.get(unidade) || 0) + Number(item.total || 0));
    });
    return mapa;
  }, [dashboard?.pessoas_prioridades]);

  const unidadesBase = useMemo(() => {
    if (!dashboard) return [];

    return (dashboard.informacoes_unidade || [])
      .map((unidade) => {
        const capacidade = Number(unidade.max_vagas || 0);
        const vagasOcupadas = Number(unidade.vagas_ocupadas || 0);
        const ocupacao = capacidade > 0 ? clampPercent((vagasOcupadas / capacidade) * 100) : 0;

        return {
          nome: unidade.nome_unidade || "Sem unidade",
          atendimentosHoje: Number(unidade.total_agendamentos || 0),
          fila: Number(unidade.fila_aguardando || 0),
          capacidade,
          vagasOcupadas,
          ocupacao,
          comparecimento: comparecimentoBase,
          esperaMedia: Number(unidade.duracao_media_atendimento_min || 0),
          prioridade: prioridadePorUnidade.get(unidade.nome_unidade || "") || 0,
          equipe: Number(unidade.total_profissionais || 0),
        };
      })
      .sort((a, b) => b.atendimentosHoje - a.atendimentosHoje);
  }, [comparecimentoBase, dashboard, prioridadePorUnidade]);

  const resumo = useMemo(() => {
    const totalAtendimentos = Number(dashboard?.total_agendamentos || 0);
    const filaTotal = unidadesBase.reduce((acc, unidade) => acc + unidade.fila, 0);
    const ocupacaoMediaApi = Number(dashboard?.ocupacao_media || 0);
    const ocupacaoMedia =
      ocupacaoMediaApi > 0
        ? clampPercent(ocupacaoMediaApi)
        : unidadesBase.length
          ? clampPercent(
              unidadesBase.reduce((acc, unidade) => acc + unidade.ocupacao, 0) / unidadesBase.length
            )
          : 0;
    const comparecimentoMedio = comparecimentoBase;
    const esperaMedia = Math.round(Number(dashboard?.tempo_medio || 0));
    const unidadesCriticas = unidadesBase.filter(
      (unidade) => unidade.fila > 20 || unidade.ocupacao > 85 || unidade.esperaMedia > 25
    ).length;

    return {
      totalAtendimentos,
      filaTotal,
      ocupacaoMedia,
      comparecimentoMedio,
      esperaMedia,
      unidadesCriticas,
    };
  }, [comparecimentoBase, dashboard, unidadesBase]);

  const capacidadeChart = useMemo(
    () =>
      unidadesBase.map((unidade) => ({
        nome: unidade.nome,
        capacidade: unidade.capacidade,
        ocupacao: unidade.vagasOcupadas,
      })),
    [unidadesBase]
  );

  const perfisPublico = useMemo(() => {
    const acumulado = new Map<string, number>();
    (dashboard?.pessoas_prioridades || []).forEach((item) => {
      const label = mapPrioridadeLabel(item.prioridade);
      acumulado.set(label, (acumulado.get(label) || 0) + Number(item.total || 0));
    });

    return Array.from(acumulado.entries())
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [dashboard?.pessoas_prioridades]);

  const hojeLabel = format(new Date(), "dd/MM", { locale: ptBR });
  const periodoResumo = useMemo(() => {
    const inicio = dashboard?.data_inicio;
    const fim = dashboard?.data_fim;
    if (!inicio || !fim) return "";
    const ini = format(new Date(`${inicio}T00:00:00`), "dd/MM");
    const end = format(new Date(`${fim}T00:00:00`), "dd/MM");
    return ` (${ini} - ${end})`;
  }, [dashboard?.data_fim, dashboard?.data_inicio]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />

        <main className="flex-1 bg-muted/30">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Dashboard do Gestor</h1>
                <p className="text-sm text-muted-foreground">
                  Visão consolidada das unidades do CRAS por {" "}
                  {range === "hoje" ? "hoje" : "período selecionado"} ({hojeLabel}
                  {periodoResumo})
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-md border bg-card p-1 gap-2">
                <Button
                  size="sm"
                  variant={range === "hoje" ? "default" : "ghost"}
                  onClick={() => setRange("hoje")}
                >
                  Hoje
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[260px] justify-start text-left font-normal",
                        !dateRange?.from && "text-muted-foreground"
                      )}
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
{/* 
              <Button variant="outline" size="sm">
                Exportar CSV
              </Button> */}
            </div>
          </header>

          <div className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <GestorCard
                title="Atendimentos no período"
                value={resumo.totalAtendimentos}
                subtitle="Somando todas as unidades (filtro aplicado)"
                icon={Users}
              />

              <GestorCard
                title="Fila total"
                value={resumo.filaTotal}
                subtitle="Demandas aguardando atendimento"
                icon={ArrowUpRight}
                accent="text-amber-500"
              />

              <GestorCard
                title="Ocupação média"
                value={`${resumo.ocupacaoMedia}%`}
                subtitle="Uso das agendas por unidade"
                icon={Gauge}
                accent="text-blue-600"
              />

              <GestorCard
                title="Comparecimento"
                value={`${resumo.comparecimentoMedio}%`}
                subtitle="Estimado por ausência registrada"
                icon={MapPin}
                accent="text-emerald-500"
              />

              <GestorCard
                title="Tempo médio"
                value={`${resumo.esperaMedia} min`}
                subtitle="Duração média dos atendimentos"
                icon={Clock3}
                accent="text-purple-500"
              />

              <GestorCard
                title="Unidades em atenção"
                value={resumo.unidadesCriticas}
                subtitle="Fila alta ou ocupação elevada"
                icon={AlertTriangle}
                accent="text-red-500"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <AtendimentosPorUnidadeSection
                data={unidadesBase}
                loading={loading}
                hasDashboardData={!!dashboard}
                tooltip={<DashboardGestorTooltip />}
              />
              <PerfisPublicoSection
                data={perfisPublico}
                colors={cores}
                tooltip={<DashboardGestorTooltip />}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <CapacidadeAgendaSection data={capacidadeChart} tooltip={<DashboardGestorTooltip />} />
              <FilaDuracaoSection unidades={unidadesBase} />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboardGestor;
