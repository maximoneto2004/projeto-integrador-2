import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BarChart3, Coins, Home, PieChartIcon, ShieldAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Prontuario } from "@/types/prontuario";
import { perfilFamiliarService } from "@/services/sistema/perfilFamiliarService";
import { toast } from "@/lib/sonner";
import { getApiErrorMessage } from "@/lib/notifications";

type Alerta = {
  id: string;
  titulo: string;
  detalhe: string;
  severidade: "alta" | "media" | "baixa";
  data?: string;
};

type GraficoDimensao = {
  dimensao: string;
  valor: number;
  explicacao: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("pt-BR");
};

const formatCurrency = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const parseNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const isYes = (value?: string | null) => (value || "").trim().toLowerCase().startsWith("s");

const calcularIdade = (data?: string | null) => {
  if (!data) return null;
  const nascimento = new Date(data);
  if (Number.isNaN(nascimento.getTime())) return null;
  const diff = Date.now() - nascimento.getTime();
  const idade = new Date(diff).getUTCFullYear() - 1970;
  return idade < 0 ? null : idade;
};

export default function AdminPerfilFamiliar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cpf = searchParams.get("cpf") || "";

  const [loading, setLoading] = useState(false);
  const [prontuario, setProntuario] = useState<Prontuario | null>(null);

  useEffect(() => {
    if (!cpf) {
      setProntuario(null);
      return;
    }

    let active = true;
    const carregar = async () => {
      setLoading(true);
      try {
        const { data } = await perfilFamiliarService.obterPorCpf(cpf);
        if (!active) return;
        const payload = data?.results;
        if (!payload?.encontrado) {
          setProntuario(null);
          return;
        }
        const { encontrado: _encontrado, cpf: _cpf, versao: _versao, ...rest } = payload;
        setProntuario(rest as Prontuario);
      } catch (err) {
        if (!active) return;
        setProntuario(null);
        toast.error(getApiErrorMessage(err, "Não foi possível carregar o perfil familiar."));
      } finally {
        if (active) setLoading(false);
      }
    };

    void carregar();
    return () => {
      active = false;
    };
  }, [cpf]);

  const pessoaReferencia = useMemo(() => prontuario?.membros.find((m) => m.id === prontuario.pessoaReferenciaId), [prontuario]);

  const membrosComIdade = useMemo(
    () =>
      (prontuario?.membros || []).map((m) => ({
        ...m,
        idade: calcularIdade(m.dataNascimento),
      })),
    [prontuario],
  );

  const habitacaoAtual = useMemo(
    () => (prontuario?.condicoesHabitacionais || [])[Math.max((prontuario?.condicoesHabitacionais.length || 1) - 1, 0)],
    [prontuario],
  );

  const renda = useMemo(() => {
    if (!prontuario) {
      return {
        total: 0,
        perCapita: 0,
        totalBeneficios: 0,
        totalComBeneficios: 0,
        perCapitaComBeneficios: 0,
        trabalhadores: 0,
        comRenda: 0,
        percentualComRenda: 0,
        semRenda: 0,
        informais: 0,
      };
    }

    const membrosCount = prontuario.membros.length;
    const totalCalculado = prontuario.condicoesTrabalho.reduce((acc, item) => acc + parseNumber(item.rendaIndividual), 0);
    const total = parseNumber(prontuario.rendaTotal) || totalCalculado;
    const perCapita = parseNumber(prontuario.rendaPerCapita) || (membrosCount ? total / membrosCount : 0);
    const totalTransferenciasRenda = (prontuario.transferenciasRenda || []).reduce((acc, item) => acc + parseNumber(item.valor), 0);
    const totalBeneficiosEventuaisLegado = (prontuario.beneficiosEventuais || []).reduce((acc, item) => acc + parseNumber(item.valor), 0);
    const totalBeneficios = prontuario.transferenciasRenda?.length ? totalTransferenciasRenda : totalBeneficiosEventuaisLegado;
    const totalComBeneficios = total + totalBeneficios;
    const perCapitaComBeneficios = membrosCount ? totalComBeneficios / membrosCount : 0;
    const trabalhadores = prontuario.condicoesTrabalho.length;
    const comRenda = prontuario.condicoesTrabalho.filter((item) => parseNumber(item.rendaIndividual) > 0).length;
    const percentualComRenda = membrosCount ? Math.round((comRenda / membrosCount) * 100) : 0;
    const semRenda = prontuario.membros.length - comRenda;
    const informais = prontuario.condicoesTrabalho.filter((item) => !item.carteiraAssinada && !item.desempregado).length;
    return {
      total,
      perCapita,
      totalBeneficios,
      totalComBeneficios,
      perCapitaComBeneficios,
      trabalhadores,
      comRenda,
      percentualComRenda,
      semRenda,
      informais,
    };
  }, [prontuario]);

  const resumo = useMemo(() => {
    const criancas = membrosComIdade.filter((m) => (m.idade ?? 999) <= 6).length;
    const adolescentes = membrosComIdade.filter((m) => (m.idade ?? 999) >= 7 && (m.idade ?? 999) <= 17).length;
    const idosos = membrosComIdade.filter((m) => (m.idade ?? -1) >= 60).length;
    return { criancas, adolescentes, idosos };
  }, [membrosComIdade]);

  const alertas = useMemo<Alerta[]>(() => {
    if (!prontuario) return [];
    const itens: Alerta[] = [];

    if (prontuario.situacoesViolencia.some((s) => (s.tipoViolencia || "").toLowerCase() !== "sem marcador ativo")) {
      const ultima = prontuario.situacoesViolencia[prontuario.situacoesViolencia.length - 1];
      itens.push({
        id: "violencia",
        titulo: "Sinalização de violência",
        detalhe: ultima?.tipoViolencia || "Registro de situação de violência",
        data: ultima?.dataOcorrencia,
        severidade: "alta",
      });
    }

    if (prontuario.descumprimentosCondicionalidades.length > 0) {
      const ultimo = prontuario.descumprimentosCondicionalidades[0];
      itens.push({
        id: "condicionalidade",
        titulo: "Descumprimento de condicionalidade",
        detalhe: `${ultimo.membroNome || "Membro"} - ${ultimo.efeito || "Sem efeito"}`,
        data: ultimo.dataOcorrencia,
        severidade: "alta",
      });
    }

    if (habitacaoAtual && (isYes(habitacaoAtual.riscoDesabamento) || isYes(habitacaoAtual.areaConflito) || isYes(habitacaoAtual.dificilAcesso))) {
      itens.push({
        id: "moradia",
        titulo: "Moradia em área sensível",
        detalhe: "Há marcação de risco, conflito territorial ou difícil acesso.",
        severidade: "media",
      });
    }

    if (renda.perCapita > 0 && renda.perCapita < 218) {
      itens.push({
        id: "renda",
        titulo: "Renda per capita baixa",
        detalhe: `Per capita atual: ${formatCurrency(renda.perCapita)}.`,
        severidade: "alta",
      });
    }

    const saudeCritica = prontuario.condicoesSaude.some(
      (s) => isYes(s.necessitaCuidadosConstantes) || isYes(s.usoDrogas) || isYes(s.usoAlcool) || (s.doencasGraves || "").trim() !== "",
    );
    if (saudeCritica) {
      itens.push({
        id: "saude",
        titulo: "Sinalização de saúde e cuidados",
        detalhe: "Família com necessidade de monitoramento de saúde/cuidados.",
        severidade: "media",
      });
    }

    if ((prontuario.acolhimentos || []).some((a) => !a.dataSaida)) {
      itens.push({
        id: "acolhimento",
        titulo: "Acolhimento em curso",
        detalhe: "Existe membro sem data de saída do acolhimento.",
        severidade: "alta",
      });
    }

    return itens;
  }, [prontuario, habitacaoAtual, renda.perCapita]);

  const faixaAtencao = useMemo(() => {
    const score = alertas.reduce((acc, item) => acc + (item.severidade === "alta" ? 3 : item.severidade === "media" ? 2 : 1), 0);
    if (score >= 8) return { label: "Alta", className: "bg-red-100 text-red-700 border-red-200" };
    if (score >= 4) return { label: "Média", className: "bg-amber-100 text-amber-700 border-amber-200" };
    return { label: "Baixa", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  }, [alertas]);

  const graficoDimensoes = useMemo(() => {
    if (!prontuario) return [] as GraficoDimensao[];
    const totalMembros = Math.max(prontuario.membros.length, 1);
    const flagsMoradia =
      Number(isYes(habitacaoAtual?.riscoDesabamento)) + Number(isYes(habitacaoAtual?.areaConflito)) + Number(isYes(habitacaoAtual?.dificilAcesso));
    const saudeCritica = prontuario.condicoesSaude.filter(
      (s) => isYes(s.necessitaCuidadosConstantes) || isYes(s.usoDrogas) || isYes(s.usoAlcool) || (s.doencasGraves || "").trim() !== "",
    ).length;
    const situacoesViolenciaAtivas = prontuario.situacoesViolencia.filter(
      (s) => (s.tipoViolencia || "").trim().toLowerCase() !== "sem marcador ativo",
    );
    const quantidadeViolenciaAtiva = situacoesViolenciaAtivas.length;
    const registrosSemAcompanhamento = situacoesViolenciaAtivas.filter((s) => !s.acompanhamento).length;
    const parseMarcadoresAtivos = (tipoViolencia?: string) =>
      (tipoViolencia || "")
        .split(",")
        .map((marcador) => marcador.trim().toLowerCase())
        .filter((marcador) => marcador && marcador !== "sem marcador ativo");
    const totalMarcadoresAtivos = situacoesViolenciaAtivas.reduce((acc, situacao) => acc + parseMarcadoresAtivos(situacao.tipoViolencia).length, 0);
    const totalMarcadoresPossiveis = Math.max(situacoesViolenciaAtivas.length, 1) * 12;
    const percentualMarcadoresViolencia = Math.round((totalMarcadoresAtivos / totalMarcadoresPossiveis) * 100);
    const marcadoresCriticos = new Set(["exploracao_sexual", "violencia_sexual", "violencia_fisica", "violencia_psicologica", "trafico_pessoa"]);
    const possuiMarcadorCritico = situacoesViolenciaAtivas.some((situacao) =>
      parseMarcadoresAtivos(situacao.tipoViolencia).some((marcador) => marcadoresCriticos.has(marcador)),
    );
    const limiteRecenciaMs = 180 * 24 * 60 * 60 * 1000;
    const possuiRegistroRecente = situacoesViolenciaAtivas.some((s) => {
      const data = new Date(s.dataOcorrencia);
      if (Number.isNaN(data.getTime())) return false;
      return Date.now() - data.getTime() <= limiteRecenciaMs;
    });
    const percentualBaseViolencia = Math.max(25, percentualMarcadoresViolencia);
    const bonusMultiplosMarcadores = Math.min(20, Math.max(0, totalMarcadoresAtivos - 2) * 3);
    const bonusMarcadorCritico = possuiMarcadorCritico ? 10 : 0;
    const bonusRecencia = possuiRegistroRecente ? 10 : 0;
    const bonusSemAcompanhamento = registrosSemAcompanhamento > 0 ? 10 : 0;
    const valorViolencia =
      quantidadeViolenciaAtiva > 0
        ? Math.min(100, percentualBaseViolencia + bonusMultiplosMarcadores + bonusMarcadorCritico + bonusRecencia + bonusSemAcompanhamento)
        : 0;
    const descumprimentos = prontuario.descumprimentosCondicionalidades.length;

    return [
      {
        dimensao: "Trabalho/Renda",
        valor: renda.percentualComRenda,
        explicacao: `${renda.comRenda} de ${totalMembros} membros têm renda individual maior que R$ 0. `,
      },
      {
        dimensao: "Saúde/Cuidados",
        valor: Math.round((saudeCritica / totalMembros) * 100),
        explicacao: `${saudeCritica} de ${totalMembros} membros têm indicação de cuidado constante, uso de álcool/drogas ou doença grave. `,
      },
      {
        dimensao: "Moradia",
        valor: Math.min(100, flagsMoradia * 34),
        explicacao: `${flagsMoradia} marcador(es) ativos entre risco de desabamento, área de conflito e difícil acesso. `,
      },
      {
        dimensao: "Condicionalidades",
        valor: Math.min(100, descumprimentos * 20),
        explicacao: `${descumprimentos} registro(s) de descumprimento.`,
      },
      {
        dimensao: "Violência",
        valor: valorViolencia,
        explicacao:
          quantidadeViolenciaAtiva > 0
            ? `${quantidadeViolenciaAtiva} registro(s) ativo(s) e ${totalMarcadoresAtivos} marcador(es) ativo(s) na página Situação de Violência `
            : "Sem registro ativo de violência (0%).",
      },
    ];
  }, [prontuario, habitacaoAtual, renda.comRenda, renda.percentualComRenda]);

  const renderTooltipDimensoes = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ value?: number | string; payload?: GraficoDimensao }>;
  }) => {
    if (!active || !payload?.length || !payload[0]?.payload) return null;
    const item = payload[0].payload;
    const valor = `${Math.round(parseNumber(payload[0]?.value ?? item.valor))}%`;

    return (
      <div className="max-w-sm rounded-md border bg-background p-3 shadow-sm">
        <p className="text-sm font-semibold">
          {item.dimensao}: {valor}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{item.explicacao}</p>
      </div>
    );
  };

  const graficoComposicao = useMemo(() => {
    if (!prontuario) return [] as Array<{ name: string; value: number; color: string }>;
    const criancas = membrosComIdade.filter((m) => (m.idade ?? 999) <= 6).length;
    const adolescentes = membrosComIdade.filter((m) => (m.idade ?? 999) >= 7 && (m.idade ?? 999) <= 17).length;
    const idosos = membrosComIdade.filter((m) => (m.idade ?? -1) >= 60).length;
    const adultos = Math.max(prontuario.membros.length - criancas - adolescentes - idosos, 0);
    return [
      { name: "Crianças (0-6)", value: criancas, color: "#0ea5e9" },
      { name: "Adolescentes (7-17)", value: adolescentes, color: "#8b5cf6" },
      { name: "Adultos (18-59)", value: adultos, color: "#14b8a6" },
      { name: "Idosos (60+)", value: idosos, color: "#f59e0b" },
    ].filter((item) => item.value > 0);
  }, [prontuario, membrosComIdade]);

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <RoleBasedSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-14 border-b flex items-center px-6 gap-4">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">Perfil familiar</h1>
            </header>
            <main className="flex-1 p-6">Carregando perfil familiar...</main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!prontuario) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <RoleBasedSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-14 border-b flex items-center px-6 gap-4">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">Perfil familiar</h1>
            </header>
            <main className="flex-1 p-6">
              <p>Prontuário não encontrado.</p>
              <Button variant="outline" onClick={() => navigate(`/sistema/prontuario?cpf=${cpf}`)} className="mt-4 gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao prontuário
              </Button>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <RoleBasedSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-6 gap-4">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Perfil familiar - análise</h1>
          </header>

          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <Button variant="outline" onClick={() => navigate(`/sistema/prontuario?cpf=${cpf}`)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao prontuário
              </Button>

              {/* <Card className={`border ${faixaAtencao.className}`}>
                <CardContent className="py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide">Faixa de atenção do caso</p>
                    <p className="text-2xl font-bold">{faixaAtencao.label}</p>
                    <p className="text-sm">Prontuário {prontuario.numero} • Referência: {pessoaReferencia?.nome || "-"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" />
                    <span className="text-sm font-medium">{alertas.length} alertas priorizados</span>
                  </div>
                </CardContent>
              </Card> */}

              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="py-3">
                    <p className="text-xs text-muted-foreground">Composição Familiar</p>
                    <p className="text-2xl font-semibold">{prontuario.membros.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4">
                    <p className="text-xs text-muted-foreground">Renda e trabalho</p>
                    <p className="text-lg font-semibold">{formatCurrency(renda.perCapita)}</p>
                    <p className="text-xs text-muted-foreground">Per capita com benefícios: {formatCurrency(renda.perCapitaComBeneficios)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4">
                    <p className="text-xs text-muted-foreground">Proteção social</p>
                    <p className="text-lg font-semibold">{prontuario.acessoBeneficiosServicos?.beneficiosEventuaisTotal || 0} benefícios</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4">
                    <p className="text-xs text-muted-foreground">Acompanhamento</p>
                    <p className="text-lg font-semibold">{prontuario.participacoesServicos.length} serviços</p>
                    <p className="text-xs text-muted-foreground">
                      CREAS ativos: {prontuario.acessoBeneficiosServicos?.acompanhamentosCreasAtivos || 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle>Dimensões de vulnerabilidade</CardTitle>
                      <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Expandir
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[96vw] w-[1200px] max-h-[90vh]">
                        <DialogHeader>
                          <DialogTitle>Dimensões de vulnerabilidade</DialogTitle>
                          <DialogDescription>Visualização ampliada do índice de exposição por dimensão (0 a 100).</DialogDescription>
                        </DialogHeader>
                        <div className="w-full overflow-auto border rounded-md p-2">
                          <div style={{ minWidth: 900, height: 520 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={graficoDimensoes} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[0, 100]} />
                                <YAxis type="category" dataKey="dimensao" width={160} />
                                <Tooltip content={renderTooltipDimensoes} />
                                <Bar dataKey="valor" fill="#0f766e" radius={[0, 8, 8, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">Índice visual de exposição por dimensão (0 a 100).</p>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={graficoDimensoes} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 100]} />
                          <YAxis type="category" dataKey="dimensao" width={110} />
                          <Tooltip content={renderTooltipDimensoes} />
                          <Bar dataKey="valor" fill="#0f766e" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Composição familiar por faixa etária</CardTitle>
                    <PieChartIcon className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">Distribuição dos membros da família por ciclo de vida.</p>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={graficoComposicao} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label>
                            {graficoComposicao.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [value, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid gap-2">
                      {graficoComposicao.map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Detalhes do prontuário</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="composicao">
                      <AccordionTrigger>Composição familiar</AccordionTrigger>
                      <AccordionContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>Parentesco</TableHead>
                              <TableHead>Idade</TableHead>
                              <TableHead>CPF</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {membrosComIdade.map((m) => (
                              <TableRow key={m.id}>
                                <TableCell className="font-medium">{m.nome}</TableCell>
                                <TableCell>{m.parentesco}</TableCell>
                                <TableCell>{m.idade ?? "-"}</TableCell>
                                <TableCell>{m.cpf}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="trabalho">
                      <AccordionTrigger>Renda e trabalho</AccordionTrigger>
                      <AccordionContent>
                        <div className="mb-3 flex flex-wrap gap-2">
                          <Badge variant="outline">Renda total (com benefícios): {formatCurrency(renda.totalComBeneficios)}</Badge>
                          <Badge variant="outline">Per capita (com benefícios): {formatCurrency(renda.perCapitaComBeneficios)}</Badge>
                          <Badge variant="outline">Benefícios: {formatCurrency(renda.totalBeneficios)}</Badge>
                          <Badge variant="outline">Trabalhadores: {renda.trabalhadores}</Badge>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Membro</TableHead>
                              <TableHead>Ocupação</TableHead>
                              <TableHead>Vínculo</TableHead>
                              <TableHead className="text-right">Renda</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {prontuario.condicoesTrabalho.map((t) => (
                              <TableRow key={t.id}>
                                <TableCell>{t.membroNome || "-"}</TableCell>
                                <TableCell>{t.ocupacao || "-"}</TableCell>
                                <TableCell>{t.vinculo || "-"}</TableCell>
                                <TableCell className="text-right">{formatCurrency(parseNumber(t.rendaIndividual))}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="servicos">
                      <AccordionTrigger>Serviços, benefícios e encaminhamentos</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <Card>
                            <CardHeader className="py-3">
                              <CardTitle className="text-base">Participações em serviços</CardTitle>
                            </CardHeader>
                            <CardContent className="py-0">
                              {prontuario.participacoesServicos.slice(0, 8).map((s) => (
                                <div key={s.id} className="py-2 border-b last:border-b-0">
                                  <p className="text-sm font-medium">{s.servico || "-"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {s.membroNome || "-"} • {formatDate(s.dataInicio)} • {s.unidadeRealizacao || "Unidade não informada"}
                                  </p>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="py-3">
                              <CardTitle className="text-base">Encaminhamentos</CardTitle>
                            </CardHeader>
                            <CardContent className="py-0">
                              {(prontuario.encaminhamentos || []).slice(0, 8).map((e) => (
                                <div key={e.id} className="py-2 border-b last:border-b-0">
                                  <p className="text-sm font-medium">{e.codigoArea || "Sem código"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {e.unidadeOrigem || "-"} → {e.unidadeDestino || "-"} • {formatDate(e.dataRegistro)}
                                  </p>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="condicionalidades">
                      <AccordionTrigger>Moradia, condicionalidades e avaliação técnica</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <Card>
                            <CardHeader className="py-3 flex flex-row items-center justify-between">
                              <CardTitle className="text-base">Moradia</CardTitle>
                              <Home className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="py-0 text-sm">
                              {habitacaoAtual ? (
                                <>
                                  <p>Tipo: {habitacaoAtual.tipoMoradia || "-"}</p>
                                  <p>Cômodos: {habitacaoAtual.numeroComodos || 0}</p>
                                  <p>Risco: {habitacaoAtual.riscoDesabamento || "-"}</p>
                                  <p>Conflito territorial: {habitacaoAtual.areaConflito || "-"}</p>
                                </>
                              ) : (
                                <p className="text-muted-foreground">Sem registro habitacional.</p>
                              )}
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="py-3 flex flex-row items-center justify-between">
                              <CardTitle className="text-base">Condicionalidades</CardTitle>
                              <Coins className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="py-0">
                              {(prontuario.descumprimentosCondicionalidades || []).slice(0, 8).map((d) => (
                                <div key={d.id} className="py-2 border-b last:border-b-0">
                                  <p className="text-sm font-medium">{d.membroNome || "-"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {d.efeito || "-"} • {d.ondeDescumpriu || "-"} • {formatDate(d.dataOcorrencia)}
                                  </p>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        </div>
                        {prontuario.avaliacaoAcompanhamento && (
                          <Card>
                            <CardHeader className="py-3">
                              <CardTitle className="text-base">Avaliação do acompanhamento</CardTitle>
                            </CardHeader>
                            <CardContent className="py-0 text-sm space-y-1">
                              <p>Status: {prontuario.avaliacaoAcompanhamento.statusVulnerabilidade || "-"}</p>
                              <p>Vínculo família-serviço: {prontuario.avaliacaoAcompanhamento.vinculoFamilia || "-"}</p>
                              <p>Encaminhamentos: {prontuario.avaliacaoAcompanhamento.encaminhamentos || "-"}</p>
                            </CardContent>
                          </Card>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
