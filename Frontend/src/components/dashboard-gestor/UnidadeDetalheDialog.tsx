import { useEffect, useMemo, useState, type ReactNode } from "react";
import { format, isValid, parseISO } from "date-fns";
import {
  MapPin,
  Phone,
  Mail,
  Calendar,
  Users,
  Clock,
  Star,
  TrendingUp,
  Activity,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building2,
  UserCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type {
  ServicoMetrica,
  UnidadeAvaliacao,
  UnidadeMapa,
  UnidadeMetricas,
  UnidadeProfissional,
  UnidadeSeriePonto,
} from "../../pages/Sistema/Dashboards/AdminMapaUnidades";

type UnidadeDetalheDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unidade: UnidadeMapa | null;
  bairroNome: string;
  metricas: UnidadeMetricas | null;
  servicosMetricas: ServicoMetrica[] | null;
  servicosLoading: boolean;
  avaliacoes: UnidadeAvaliacao[];
  avaliacoesLoading: boolean;
  seriePontos: UnidadeSeriePonto[] | null;
  serieLoading: boolean;
  serieError: string | null;
  serieDataInicio: string;
  serieDataFim: string;
  onSerieDataInicioChange: (value: string) => void;
  onSerieDataFimChange: (value: string) => void;
  onAtualizarSerie: () => void;
  tempoMetaPadraoMin: number;
};

const formatDateBr = (isoDate?: string | null) => {
  if (!isoDate) return "-";
  const parsed = parseISO(isoDate);
  if (!isValid(parsed)) return isoDate;
  return format(parsed, "dd/MM/yyyy");
};

const formatNota = (v: number) => (v > 0 ? v.toFixed(1) : "-");
const formatCargoLabel = (value?: string | null) => {
  const texto = String(value ?? "").trim();
  if (!texto) return "-";
  const normalizado = texto.toLocaleLowerCase("pt-BR");
  return normalizado.charAt(0).toLocaleUpperCase("pt-BR") + normalizado.slice(1);
};

const getFaixaAvaliacao = (nota: number) => {
  if (!Number.isFinite(nota) || nota <= 0) return "Sem avaliações";
  if (nota >= 4.5) return "Excelente";
  if (nota >= 4) return "Muito bom";
  if (nota >= 3) return "Bom";
  if (nota >= 2) return "Regular";
  return "Precisa melhorar";
};

const getSlaLabel = (tempoMedioAtendimentoMin: number, tempoMetaPadraoMin: number) => {
  if (!Number.isFinite(tempoMedioAtendimentoMin) || tempoMedioAtendimentoMin <= 0) return "Sem dados";
  if (tempoMedioAtendimentoMin <= tempoMetaPadraoMin) return "Dentro da meta";
  if (tempoMedioAtendimentoMin <= tempoMetaPadraoMin + 10) return "Levemente acima";
  if (tempoMedioAtendimentoMin <= tempoMetaPadraoMin + 20) return "Acima";
  return "Muito acima";
};

export const getEficiencia = (_pctAcimaEsperado: number, tempoMedioAtendimentoMin: number, tempoMetaPadraoMin: number) => {
  if (!Number.isFinite(tempoMedioAtendimentoMin) || tempoMedioAtendimentoMin <= 0) return null;
  if (!Number.isFinite(tempoMetaPadraoMin) || tempoMetaPadraoMin <= 0) return null;
  return Math.max(0, Math.min(100, (tempoMetaPadraoMin / tempoMedioAtendimentoMin) * 100));
};

const formatEndereco = (unidade: UnidadeMapa) => {
  const logradouro = unidade.logradouro?.trim();
  const numero = unidade.numero?.trim();
  const complemento = unidade.complemento?.trim();
  const enderecoBase = [logradouro, numero].filter(Boolean).join(", ");
  return complemento ? `${enderecoBase}` : enderecoBase;
};

function InfoLinha({ label, value }: { label: string; value: ReactNode }) {
  const displayValue = value === "" || value === null || value === undefined ? "-" : value;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-start gap-6">
      <div className="text-xs text-muted-foreground break-words">{label}</div>
      <div className="text-sm font-medium text-right break-words whitespace-normal">{displayValue}</div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, subValue }: { label: string; value: ReactNode; icon: any; subValue?: string }) {
  return (
    <Card className="h-full border border-slate-200/80 bg-white shadow-sm">
      <CardContent className="flex h-full items-start gap-3 p-3.5">
        <div className="shrink-0 rounded-lg bg-slate-100 p-2">
          <Icon className="h-4.5 w-4.5 text-slate-700" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-slate-500">{label}</p>
          <p className="break-words text-[1.65rem] font-black leading-none text-slate-900">{value}</p>
          {subValue && <p className="text-[11px] leading-snug text-slate-500">{subValue}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: ReactNode; icon?: any }) {
  return (
    <div className="flex items-start gap-3 py-1">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />}
      <div className="space-y-0.5">
        <p className="text-[11px] font-medium text-muted-foreground uppercase">{label}</p>
        <div className="text-sm font-semibold">{value || "-"}</div>
      </div>
    </div>
  );
}

const AVALIACOES_POR_PAGINA = 6;
const SERVICOS_POR_PAGINA = 10;

const getSlaStatus = (tempo: number, meta: number) => {
  if (!Number.isFinite(tempo) || tempo <= 0) {
    return { label: "Sem dados", color: "bg-slate-200 text-slate-700 border-slate-200", icon: AlertCircle };
  }
  if (!Number.isFinite(meta) || meta <= 0) {
    return { label: "Sem meta", color: "bg-slate-200 text-slate-700 border-slate-200", icon: AlertCircle };
  }
  if (tempo <= meta) return { label: "No Prazo", color: "bg-emerald-500/40 text-emerald-800 border-emerald-200", icon: CheckCircle2 };
  if (tempo <= meta + 10) return { label: "Alerta", color: "bg-amber-500/40 text-amber-800 border-amber-200", icon: AlertCircle };
  return { label: "Crítico", color: "bg-rose-500/40 text-rose-800 border-rose-200", icon: AlertCircle };
};

const formatMinutesCard = (value: number | null | undefined) =>
  Number.isFinite(value) && (value ?? 0) > 0 ? `${Number(value).toFixed(1)} min` : "--";

const getAderenciaMetaSubtitle = (tempoMedioAtendimentoMin: number, tempoMetaPadraoMin: number) => {
  if (!Number.isFinite(tempoMedioAtendimentoMin) || tempoMedioAtendimentoMin <= 0) return "Sem base para comparar";
  if (!Number.isFinite(tempoMetaPadraoMin) || tempoMetaPadraoMin <= 0) return "Meta indisponivel";
  if (tempoMedioAtendimentoMin <= tempoMetaPadraoMin) return "Dentro da meta";

  return `${(tempoMedioAtendimentoMin - tempoMetaPadraoMin).toFixed(1)} min acima do tempo médio esperado.`;
};

type TempoMedioView = "geral" | "comum" | "especial";

export function UnidadeDetalheDialog({
  open,
  onOpenChange,
  unidade,
  bairroNome,
  metricas,
  servicosMetricas,
  servicosLoading,
  avaliacoes,
  avaliacoesLoading,
  seriePontos,
  serieLoading,
  serieError,
  serieDataInicio,
  serieDataFim,
  onSerieDataInicioChange,
  onSerieDataFimChange,
  onAtualizarSerie,
  tempoMetaPadraoMin,
}: UnidadeDetalheDialogProps) {
  const statusSla = getSlaStatus(metricas?.tempoMedioAtendimentoMin ?? 0, tempoMetaPadraoMin);
  const eficiencia = getEficiencia(metricas?.pctAcimaEsperado ?? 0, metricas?.tempoMedioAtendimentoMin ?? 0, tempoMetaPadraoMin);
  const metaAtendimentoLabel =
    Number.isFinite(tempoMetaPadraoMin) && tempoMetaPadraoMin > 0 ? `Meta media: ${tempoMetaPadraoMin.toFixed(1)} min` : "Meta indisponivel";
  const aderenciaMetaSubtitle = getAderenciaMetaSubtitle(metricas?.tempoMedioAtendimentoMin ?? 0, tempoMetaPadraoMin);
  const tempoComumLabel = formatMinutesCard(metricas?.tempoMedioAtendimentoComumMin);
  const tempoEspecialLabel = formatMinutesCard(metricas?.tempoMedioAtendimentoEspecializadoMin);
  const esperadoComumLabel = formatMinutesCard(metricas?.tempoMedioEsperadoComumMin);
  const esperadoEspecialLabel = formatMinutesCard(metricas?.tempoMedioEsperadoEspecializadoMin);
  const equipeSorted = useMemo(() => [...(metricas?.profissionais ?? [])].sort((a, b) => a.nome.localeCompare(b.nome)), [metricas]);
  const avaliacoesSorted = useMemo(
    () => [...(avaliacoes ?? [])].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))),
    [avaliacoes],
  );
  const [tempoMedioView, setTempoMedioView] = useState<TempoMedioView>("geral");
  const [paginaAvaliacoes, setPaginaAvaliacoes] = useState(1);
  const [paginaServicos, setPaginaServicos] = useState(1);
  const totalPaginasAvaliacoes = Math.max(1, Math.ceil(avaliacoesSorted.length / AVALIACOES_POR_PAGINA));
  const avaliacoesPaginadas = useMemo(() => {
    const inicio = (paginaAvaliacoes - 1) * AVALIACOES_POR_PAGINA;
    return avaliacoesSorted.slice(inicio, inicio + AVALIACOES_POR_PAGINA);
  }, [avaliacoesSorted, paginaAvaliacoes]);

  const listaServicos = useMemo(() => servicosMetricas ?? [], [servicosMetricas]);
  const totalPaginasServicos = Math.max(1, Math.ceil(listaServicos.length / SERVICOS_POR_PAGINA));
  const servicosPaginados = useMemo(() => {
    const inicio = (paginaServicos - 1) * SERVICOS_POR_PAGINA;
    return listaServicos.slice(inicio, inicio + SERVICOS_POR_PAGINA);
  }, [listaServicos, paginaServicos]);
  const equipe = (metricas?.profissionais ?? []).slice().sort((a, b) => a.nome.localeCompare(b.nome));
  const serie = seriePontos ?? [];

  const createdAtMinDate = (() => {
    const iso = unidade?.createdAt;
    if (!iso) return "";
    const parsed = parseISO(iso);
    if (!isValid(parsed)) return "";
    return format(parsed, "yyyy-MM-dd");
  })();

  const todayMaxDate = format(new Date(), "yyyy-MM-dd");
  useEffect(() => {
    if (!open) return;
    setPaginaAvaliacoes(1);
    setPaginaServicos(1);
    setTempoMedioView("geral");
  }, [unidade?.id, open]);

  useEffect(() => {
    if (paginaAvaliacoes > totalPaginasAvaliacoes) {
      setPaginaAvaliacoes(totalPaginasAvaliacoes);
    }
  }, [paginaAvaliacoes, totalPaginasAvaliacoes]);

  useEffect(() => {
    if (paginaServicos > totalPaginasServicos) {
      setPaginaServicos(totalPaginasServicos);
    }
  }, [paginaServicos, totalPaginasServicos]);

  const tempoMedioCard = useMemo(() => {
    if (tempoMedioView === "comum") {
      return {
        label: "Tempo Médio Comum",
        value: tempoComumLabel,
        subValue: `Meta média: ${esperadoComumLabel}`,
      };
    }

    if (tempoMedioView === "especial") {
      return {
        label: "Tempo Médio Especial",
        value: tempoEspecialLabel,
        subValue: `Meta média: ${esperadoEspecialLabel}`,
      };
    }

    return {
      label: "Tempo Médio Geral",
      value: formatMinutesCard(metricas?.tempoMedioAtendimentoMin),
      subValue: metaAtendimentoLabel,
    };
  }, [
    metaAtendimentoLabel,
    metricas?.tempoMedioAtendimentoMin,
    metricas?.tempoMedioEsperadoComumMin,
    metricas?.tempoMedioEsperadoEspecializadoMin,
    tempoComumLabel,
    esperadoComumLabel,
    esperadoEspecialLabel,
    tempoEspecialLabel,
    tempoMedioView,
  ]);

  const formatTickDate = (value: unknown) => {
    const iso = String(value ?? "");
    if (!iso) return "";
    const parsed = parseISO(iso);
    if (!isValid(parsed)) return iso;
    return format(parsed, "dd/MM");
  };

  if (!unidade || !metricas) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl">
        {/* HEADER ESTILIZADO */}
        <div className="relative overflow-hidden bg- px-8 py-8 ">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <DialogTitle className="text-2xl font-bold tracking-tight leading-none">{unidade.nome || `Unidade ${unidade.id}`}</DialogTitle>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                <p className="flex items-center gap-1.5 text-black">
                  <MapPin className="h-4 w-4 text-black" /> {bairroNome}
                </p>
                <p className="flex items-center gap-1.5 text-black">
                  <Calendar className="h-4 w-4 text-black" /> Monitorada desde {formatDateBr(unidade.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] uppercase font-bold ">Avaliação Geral</p>
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="text-2xl font-black">{formatNota(metricas.notaAvaliacao)}</span>
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                </div>
              </div>
              <Separator orientation="vertical" className="h-10 bg-0 mx-2" />
              <Badge className={`${statusSla.color} border-none px-4 py-2 flex gap-2 text-sm`}>
                <statusSla.icon className="h-4 w-4" />
                {statusSla.label}
              </Badge>
            </div>
          </div>
          {/* Decorativo de fundo */}
        </div>

        <Tabs defaultValue="metricas" className="flex-1 flex flex-col overflow-hidden bg-background">
          <div className="px-8 border-b">
            <TabsList className="h-14 bg-transparent gap-8 p-0">
              <TabsTrigger
                value="metricas"
                className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-muted-foreground data-[state=active]:text-foreground"
              >
                <Activity className="h-4 w-4 mr-2" /> Desempenho
              </TabsTrigger>
              <TabsTrigger
                value="equipe"
                className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-muted-foreground data-[state=active]:text-foreground"
              >
                <Users className="h-4 w-4 mr-2" /> Equipe
              </TabsTrigger>
              <TabsTrigger
                value="avaliacao"
                className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-muted-foreground data-[state=active]:text-foreground"
              >
                <Star className="h-4 w-4 mr-2" /> Avaliações
              </TabsTrigger>
              <TabsTrigger
                value="informacoes"
                className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-muted-foreground data-[state=active]:text-foreground"
              >
                <MapPin className="h-4 w-4 mr-2" /> Informações
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 bg-slate-50/30">
            <div className="p-8">
              {/* --- ABA DESEMPENHO --- */}
              <TabsContent value="metricas" className="mt-0 space-y-6 outline-none">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Atendimentos"
                    value={metricas.atendimentosMensaisTotal}
                    icon={Activity}
                    subValue="Total bruto de atendimentos no período selecionado."
                  />
                  <Card className="h-full border border-slate-200/80 bg-white shadow-sm">
                    <CardContent className="flex h-full items-start gap-3 p-3.5">
                      <div className="shrink-0 rounded-lg bg-slate-100 p-2">
                        <Clock className="h-4.5 w-4.5 text-slate-700" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-slate-500">{tempoMedioCard.label}</p>
                          <p className="break-words text-[1.65rem] font-black leading-none text-slate-900">{tempoMedioCard.value}</p>
                          <p className="text-[11px] leading-snug text-slate-500">{tempoMedioCard.subValue}</p>
                        </div>

                        <div className="flex justify-center">
                          <div className="grid w-fit grid-cols-3 rounded-full border border-slate-200 bg-slate-50 p-1">
                            {[
                              { id: "geral", label: "Geral" },
                              { id: "comum", label: "Comum" },
                              { id: "especial", label: "Especial" },
                            ].map((item) => {
                              const active = tempoMedioView === item.id;
                              return (
                                <Button
                                  key={item.id}
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className={`h-7 rounded-full px-3 text-[11px] font-semibold transition ${
                                    active
                                      ? "bg-white text-slate-900 shadow-sm hover:bg-white"
                                      : "text-slate-500 hover:bg-transparent hover:text-slate-900"
                                  }`}
                                  onClick={() => setTempoMedioView(item.id as TempoMedioView)}
                                >
                                  {item.label}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <StatCard
                    label="Espera Média"
                    value={formatMinutesCard(metricas.tempoMedioEsperaMin)}
                    icon={Users}
                    subValue={"Espera média para atendimentos."}
                  />
                  <StatCard
                    label="Aderência à Meta"
                    value={eficiencia === null ? "--" : `${eficiencia.toFixed(1)}%`}
                    icon={TrendingUp}
                    subValue={aderenciaMetaSubtitle}
                  />
                </div>

                <Card className="shadow-sm border-slate-200 overflow-hidden">
                  <CardHeader className="bg-white border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
                    <div>
                      <CardTitle className="text-base font-bold">Série Temporal de Performance</CardTitle>
                      <p className="text-xs text-muted-foreground">Volume de atendimentos vs. Tempos de resposta</p>
                    </div>
                    <div className="w-full sm:w-auto grid grid-cols-1 sm:grid-cols-[auto_auto] items-center gap-2 rounded-lg border bg-muted/50 p-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Input
                          type="date"
                          value={serieDataInicio}
                          onChange={(e) => onSerieDataInicioChange(e.target.value)}
                          className="h-8 w-full sm:w-36 min-w-[8.5rem] border-none bg-transparent shadow-none text-xs"
                        />
                        <Separator orientation="vertical" className="h-4" />
                        <Input
                          type="date"
                          value={serieDataFim}
                          onChange={(e) => onSerieDataFimChange(e.target.value)}
                          className="h-8 w-full sm:w-36 min-w-[8.5rem] border-none bg-transparent shadow-none text-xs"
                        />
                      </div>
                      <Button
                        size="default"
                        className="h-9 w-full sm:w-auto shrink-0 gap-1.5 whitespace-nowrap bg-slate-200 px-4 py-2 text-sm font-semibold leading-none text-slate-900 hover:bg-slate-300"
                        onClick={onAtualizarSerie}
                        disabled={serieLoading}
                      >
                        <Filter className="h-3.5 w-3.5" />
                        {serieLoading ? "Atualizando..." : "Aplicar"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[300px] w-full">
                      {serieLoading ? (
                        <Skeleton className="h-full w-full rounded-lg" />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={seriePontos || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                              dataKey="data"
                              tickFormatter={(v) => format(parseISO(v), "dd/MM")}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 11, fill: "#64748b" }}
                            />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                            <Tooltip
                              labelFormatter={(value) => formatDateBr(String(value ?? ""))}
                              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Bar
                              yAxisId="left"
                              dataKey="atendimentosTotal"
                              name="Atendimentos"
                              fill="#3b82f6"
                              radius={[4, 4, 0, 0]}
                              barSize={24}
                              opacity={0.8}
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="tempoMedioAtendimentoMin"
                              name="Tempo Médio (min)"
                              stroke="#10b981"
                              strokeWidth={3}
                              dot={{ r: 4, fill: "#10b981" }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Desempenho por Tipo de Serviço (apenas atendimentos finalizados)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="pl-6 font-bold">Serviço</TableHead>
                          <TableHead className="text-right font-bold">Vol. Total</TableHead>
                          <TableHead className="text-right font-bold">Tempo Esperado</TableHead>
                          <TableHead className="text-right font-bold">Atend. Médio</TableHead>
                          <TableHead className="text-right font-bold">Espera Média</TableHead>
                          <TableHead className="text-right pr-6 font-bold">Desvio da Meta</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {servicosLoading
                          ? [1, 2, 3].map((i) => (
                              <TableRow key={i}>
                                <TableCell colSpan={6}>
                                  <Skeleton className="h-8 w-full" />
                                </TableCell>
                              </TableRow>
                            ))
                          : servicosPaginados.map((s) => (
                              <TableRow key={s.servicoId} className="hover:bg-slate-50/50">
                                <TableCell className="pl-6">
                                  <div className="font-bold text-slate-700">{s.servicoNome}</div>
                                  <div className="text-[10px] text-muted-foreground uppercase">{s.tipoServicoNome}</div>
                                </TableCell>
                                <TableCell className="text-right font-semibold">{s.total}</TableCell>
                                <TableCell className="text-right">{s.esperadoMin.toFixed(1)}m</TableCell>
                                <TableCell className="text-right">{s.tempoMedioAtendimentoMin.toFixed(1)}m</TableCell>
                                <TableCell className="text-right text-muted-foreground">{s.tempoMedioEsperaMin.toFixed(1)}m</TableCell>
                                <TableCell className="text-right pr-6">
                                  <Badge variant={s.pctAcimaEsperado > 15 ? "destructive" : "secondary"} className="text-[10px] h-5">
                                    {s.pctAcimaEsperado.toFixed(1)}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                      </TableBody>
                    </Table>
                    {!servicosLoading && listaServicos.length > SERVICOS_POR_PAGINA && (
                      <div className="flex items-center justify-end px-6 py-4 border-t bg-white">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPaginaServicos((pagina) => Math.max(1, pagina - 1))}
                            disabled={paginaServicos === 1}
                          >
                            Anterior
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Página {paginaServicos} / {totalPaginasServicos}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPaginaServicos((pagina) => Math.min(totalPaginasServicos, pagina + 1))}
                            disabled={paginaServicos >= totalPaginasServicos}
                          >
                            Próxima
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* --- ABA EQUIPE --- */}
              <TabsContent value="equipe" className="mt-0 outline-none">
                <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between border-b py-4">
                    <CardTitle className="text-base font-bold">Membros da Unidade</CardTitle>
                    <Badge variant="outline" className="bg-slate-50">
                      {equipeSorted.length} Colaboradores
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="pl-6">Profissional</TableHead>
                          <TableHead>Cargo / Função</TableHead>
                          <TableHead>Contato</TableHead>
                          <TableHead className="text-right pr-6">Avaliação (Média)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {equipeSorted.map((p) => (
                          <TableRow key={p.id || p.cpf}>
                            <TableCell className="pl-6 font-bold flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                                {p.nome.substring(0, 2).toUpperCase()}
                              </div>
                              {p.nome}
                            </TableCell>
                            <TableCell className="text-slate-600">{formatCargoLabel(p.cargo)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col text-xs">
                                <span>{p.contato}</span>
                                <span className="text-muted-foreground">{p.email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              {p.ehAtendente ? (
                                <div className="flex items-center justify-end gap-1.5 font-bold">
                                  {p.notaMedia?.toFixed(1) || "N/A"}
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* --- ABA AVALIAÇÃO --- */}
              <TabsContent value="avaliacao" className="mt-0 outline-none space-y-6">
                {/* Banner de Resumo Horizontal - Substitui o Card da Esquerda */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 min-w-[120px]">
                      <span className="text-4xl font-black text-slate-800 tabular-nums">{formatNota(metricas.notaAvaliacao)}</span>
                      <div className="flex gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${s <= Math.round(metricas.notaAvaliacao) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Satisfação Geral</h3>
                      <p className="text-sm text-muted-foreground">
                        Média baseada em <span className="font-semibold text-slate-700">{avaliacoesSorted.length} avaliações</span> no período
                        selecionado.
                      </p>
                    </div>
                  </div>

                  {/* Mini Indicadores Rápidos */}
                  <div className="flex gap-4 w-full md:w-auto">
                    <div className="flex-1 md:flex-none px-4 py-2 bg-white rounded-lg border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Comentários</p>
                      <p className="text-lg font-bold text-primary">{avaliacoesSorted.filter((a) => a.comentario).length}</p>
                    </div>
                    <div className="flex-1 md:flex-none px-4 py-2 bg-white rounded-lg border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Nota Máxima</p>
                      <p className="text-lg font-bold text-emerald-500">{avaliacoesSorted.filter((a) => a.nota === 5).length}</p>
                    </div>
                  </div>
                </div>

                {/* Lista de Avaliações Estilo "Timeline" */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Feedbacks Detalhados</h4>
                  </div>

                  <ScrollArea className="h-[450px] pr-4">
                    <div className="space-y-3">
                      {avaliacoesLoading ? (
                        Array(3)
                          .fill(0)
                          .map((_, i) => (
                            <div key={i} className="p-4 rounded-xl border border-slate-100 space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-10 w-full" />
                            </div>
                          ))
                      ) : avaliacoesSorted.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed">
                          <p className="text-slate-400 text-sm">Nenhum feedback encontrado para este período.</p>
                        </div>
                      ) : (
                        avaliacoesPaginadas.map((av) => (
                          <div
                            key={av.id}
                            className="group p-5 rounded-xl border border-slate-100 bg-white hover:border-primary/20 hover:shadow-sm transition-all relative overflow-hidden"
                          >
                            {/* Indicador lateral de nota */}
                            <div
                              className={`absolute left-0 top-0 bottom-0 w-1 ${av.nota >= 4 ? "bg-emerald-400" : av.nota >= 3 ? "bg-amber-400" : "bg-rose-400"}`}
                            />

                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                  <span className="text-sm font-bold text-slate-700">{av.nota}</span>
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                </div>
                                <span className="text-xs font-medium text-slate-400">{formatDateBr(av.createdAt)}</span>
                              </div>
                              <Badge variant="outline" className="text-[10px] font-normal text-slate-400 border-slate-100">
                                ID: #{av.id.substring(0, 5)}
                              </Badge>
                            </div>

                            <p className="text-sm text-slate-600 leading-relaxed mb-4 pl-1">
                              {av.comentario || <span className="text-slate-300 italic">Sem comentário registrado.</span>}
                            </p>

                            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="h-3 w-3 text-primary" />
                                </div>
                                <span className="text-xs text-slate-500 italic">
                                  Atendido por <span className="font-semibold text-slate-700 not-italic">{av.atendente?.nome || "Equipe Geral"}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  {/* Paginação Compacta */}
                  {avaliacoesSorted.length > 0 && (
                    <div className="flex items-center justify-center gap-4 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-slate-100 text-slate-500"
                        onClick={() => setPaginaAvaliacoes((p) => Math.max(1, p - 1))}
                        disabled={paginaAvaliacoes <= 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-xs font-bold text-slate-400">
                        {paginaAvaliacoes} / {totalPaginasAvaliacoes}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-slate-100 text-slate-500"
                        onClick={() => setPaginaAvaliacoes((p) => Math.min(totalPaginasAvaliacoes, p + 1))}
                        disabled={paginaAvaliacoes >= totalPaginasAvaliacoes}
                      >
                        Próxima
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* --- ABA INFORMAÇÕES --- */}
              <TabsContent value="informacoes" className="mt-0 outline-none">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="shadow-sm">
                    <CardHeader className="border-b">
                      <CardTitle className="text-base font-bold">Localização e Endereço</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <InfoRow label="Logradouro" value={unidade.logradouro} icon={MapPin} />
                      <div className="grid grid-cols-2 gap-4">
                        <InfoRow label="Número" value={unidade.numero} />
                        <InfoRow label="Bairro" value={bairroNome} />
                      </div>
                      <InfoRow label="CEP" value={unidade.cep} />
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm">
                    <CardHeader className="border-b">
                      <CardTitle className="text-base font-bold">Canais de Atendimento</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <InfoRow label="Telefone de Contato" value={unidade.telefone} icon={Phone} />
                      <InfoRow label="E-mail da Unidade" value={unidade.email} icon={Mail} />
                      <InfoRow label="Status de Monitoramento" value="Ativo e Sincronizado" icon={UserCheck} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
