import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDashboardGestor } from "@/hooks/sistema/useDashboardGestor";
import {
  META_ABSENTEISMO_MAX_PCT,
  META_DENTRO_PRAZO_MIN_PCT,
  META_ESPERA_MAX_MIN,
  META_OCUPACAO_MAX_PCT,
  META_OCUPACAO_MIN_PCT,
} from "@/constants/indicadores";
import { KpiTendenciaCard } from "@/components/dashboard-gestor/rede/KpiTendenciaCard";
import { SerieSemanalChart } from "@/components/dashboard-gestor/rede/SerieSemanalChart";
import { RankingMetaUnidades, unidadesMedidasNaMeta } from "@/components/dashboard-gestor/rede/RankingMetaUnidades";
import { TabelaUnidades } from "@/components/dashboard-gestor/rede/TabelaUnidades";
import { CardExpansivel } from "@/components/CardExpansivel";
import { DispersaoOcupacaoAbsenteismo } from "@/components/dashboard-gestor/rede/DispersaoOcupacaoAbsenteismo";
import { DemandaCapacidadeChart } from "@/components/dashboard-gestor/rede/DemandaCapacidadeChart";
import { BarrasHorizontais } from "@/components/meu-dia/BarrasHorizontais";

type Preset = "hoje" | "7" | "30" | "periodo";

const PRESETS: Array<{ valor: Exclude<Preset, "periodo">; rotulo: string; dias: number }> = [
  { valor: "hoje", rotulo: "Hoje", dias: 1 },
  { valor: "7", rotulo: "7 dias", dias: 7 },
  { valor: "30", rotulo: "30 dias", dias: 30 },
];

// Quantos itens cada card mostra antes de pedir para expandir.
const LIMITE_GRAFICO = 6;
const LIMITE_TABELA = 8;

const apiDate = (valor: Date) => format(valor, "yyyy-MM-dd");
const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const pct = (valor: number) => `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

const AdminDashboardGestor = () => {
  const [preset, setPreset] = useState<Preset>("30");
  const [intervalo, setIntervalo] = useState<DateRange | undefined>();

  const periodo = useMemo(() => {
    const hoje = new Date();
    if (preset === "periodo" && intervalo?.from) {
      return { data_inicio: apiDate(intervalo.from), data_fim: apiDate(intervalo.to ?? intervalo.from) };
    }
    const dias = PRESETS.find((p) => p.valor === preset)?.dias ?? 30;
    return { data_inicio: apiDate(subDays(hoje, dias - 1)), data_fim: apiDate(hoje) };
  }, [intervalo, preset]);

  const { data: painel, isLoading, error } = useDashboardGestor(periodo);
  const atual = painel?.comparativo.atual;
  const anterior = painel?.comparativo.anterior;
  const unidades = painel?.informacoes_unidade ?? [];
  const unidadesNaMeta = unidadesMedidasNaMeta(unidades).length;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />

        <main className="min-w-0 flex-1 bg-muted/30">
          <header className="sticky top-0 z-10 flex flex-col gap-3 border-b bg-background px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Painel da rede</h1>
                <p className="text-sm text-muted-foreground">
                  {br(periodo.data_inicio)} a {br(periodo.data_fim)}
                  {painel && ` · comparado a ${br(painel.comparativo.anterior_inicio)} a ${br(painel.comparativo.anterior_fim)}`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-1">
              {PRESETS.map((p) => (
                <Button key={p.valor} size="sm" variant={preset === p.valor ? "default" : "ghost"} onClick={() => setPreset(p.valor)}>
                  {p.rotulo}
                </Button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant={preset === "periodo" ? "default" : "ghost"} className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {preset === "periodo" && intervalo?.from ? `${format(intervalo.from, "dd/MM")} – ${format(intervalo.to ?? intervalo.from, "dd/MM")}` : "Período"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={intervalo}
                    onSelect={(selecionado) => {
                      setIntervalo(selecionado);
                      if (selecionado?.from) setPreset("periodo");
                    }}
                    numberOfMonths={2}
                    disabled={{ after: new Date() }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </header>

          <div className="space-y-6 p-6">
            {error && <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Erro ao carregar o painel."}</p>}
            {isLoading && <p className="text-sm text-muted-foreground">Carregando a rede...</p>}

            {painel && atual && anterior && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <KpiTendenciaCard
                    title="Consultas realizadas"
                    valor={atual.consultas}
                    anterior={anterior.consultas}
                    formatar={(v) => v.toLocaleString("pt-BR")}
                    meta={{ texto: `${atual.agendamentos.toLocaleString("pt-BR")} agendamentos no período`, atingida: null }}
                  />
                  <KpiTendenciaCard
                    title="Não comparecimento"
                    valor={atual.absenteismo}
                    anterior={anterior.absenteismo}
                    formatar={pct}
                    melhorQuando="menor"
                    unidadeVariacao="pp"
                    meta={{ texto: `Meta: até ${META_ABSENTEISMO_MAX_PCT}%`, atingida: atual.absenteismo <= META_ABSENTEISMO_MAX_PCT }}
                  />
                  <KpiTendenciaCard
                    title="Consultas dentro da meta de tempo"
                    valor={atual.pct_dentro_meta}
                    anterior={anterior.pct_dentro_meta}
                    formatar={pct}
                    melhorQuando="maior"
                    unidadeVariacao="pp"
                    meta={{
                      texto: `Meta: ao menos ${META_DENTRO_PRAZO_MIN_PCT}%`,
                      atingida: atual.pct_dentro_meta === null ? null : atual.pct_dentro_meta >= META_DENTRO_PRAZO_MIN_PCT,
                    }}
                  />
                  <KpiTendenciaCard
                    title="Espera média"
                    valor={atual.tempo_medio_espera_min}
                    anterior={anterior.tempo_medio_espera_min}
                    formatar={(v) => `${Math.round(v)} min`}
                    melhorQuando="menor"
                    unidadeVariacao="min"
                    meta={{
                      texto: `Meta: até ${META_ESPERA_MAX_MIN} min, do horário marcado ao início da consulta`,
                      atingida: atual.tempo_medio_espera_min === null ? null : atual.tempo_medio_espera_min <= META_ESPERA_MAX_MIN,
                    }}
                  />
                  <KpiTendenciaCard
                    title="Ocupação da agenda"
                    valor={atual.ocupacao}
                    anterior={anterior.ocupacao}
                    formatar={pct}
                    unidadeVariacao="pp"
                    meta={{
                      texto: `Faixa ideal: ${META_OCUPACAO_MIN_PCT}% a ${META_OCUPACAO_MAX_PCT}% (abaixo é ociosidade, acima é sobrecarga)`,
                      atingida: atual.ocupacao === null ? null : atual.ocupacao >= META_OCUPACAO_MIN_PCT && atual.ocupacao <= META_OCUPACAO_MAX_PCT,
                    }}
                  />
                  <KpiTendenciaCard
                    title="Medicamentos abaixo do mínimo"
                    valor={painel.rupturas}
                    formatar={(v) => `${v}`}
                    meta={{ texto: "Situação do estoque agora, somando as unidades. Meta: nenhum.", atingida: painel.rupturas === 0 }}
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Tendência das últimas 12 semanas</CardTitle>
                    <CardDescription>Semanas completas até a data final do filtro. Cada medida tem o próprio gráfico.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <div>
                      <p className="mb-2 text-sm font-medium">Consultas realizadas</p>
                      <div className="h-56">
                        <SerieSemanalChart serie={painel.serie_semanal} campo="consultas" nome="Consultas" />
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">Não comparecimento</p>
                      <div className="h-56">
                        <SerieSemanalChart
                          serie={painel.serie_semanal}
                          campo="absenteismo"
                          nome="Não comparecimento"
                          sufixo="%"
                          meta={{ valor: META_ABSENTEISMO_MAX_PCT, rotulo: `meta ${META_ABSENTEISMO_MAX_PCT}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">Consultas dentro da meta de tempo</p>
                      <div className="h-56">
                        <SerieSemanalChart
                          serie={painel.serie_semanal}
                          campo="pct_dentro_meta"
                          nome="Dentro da meta"
                          sufixo="%"
                          meta={{ valor: META_DENTRO_PRAZO_MIN_PCT, rotulo: `meta ${META_DENTRO_PRAZO_MIN_PCT}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <CardExpansivel
                    titulo="Unidades por consultas dentro da meta"
                    descricao="Da pior para a melhor; em vermelho, abaixo da meta"
                    exibidos={Math.min(unidadesNaMeta, LIMITE_GRAFICO)}
                    total={unidadesNaMeta}
                    rotuloItens="unidades"
                    expandido={() => <RankingMetaUnidades unidades={unidades} />}
                  >
                    <RankingMetaUnidades unidades={unidades} limite={LIMITE_GRAFICO} />
                  </CardExpansivel>
                  <Card>
                    <CardHeader>
                      <CardTitle>Ocupação × não comparecimento</CardTitle>
                      <CardDescription>
                        Cada ponto é uma unidade; o tamanho é o volume de agendamentos. Agenda cheia com muita falta pede confirmação de presença, não mais vagas.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                      <DispersaoOcupacaoAbsenteismo unidades={unidades} />
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <CardExpansivel
                    className="xl:col-span-2"
                    titulo="Demanda × capacidade por tipo de serviço"
                    descricao="Vagas abertas na agenda e agendamentos não cancelados no período"
                    exibidos={Math.min(painel.demanda_capacidade.length, LIMITE_GRAFICO)}
                    total={painel.demanda_capacidade.length}
                    rotuloItens="tipos de serviço, os com mais agendamentos"
                    expandido={() => <DemandaCapacidadeChart dados={painel.demanda_capacidade} alturaAutomatica />}
                  >
                    <div className="h-80">
                      <DemandaCapacidadeChart dados={painel.demanda_capacidade} limite={LIMITE_GRAFICO} />
                    </div>
                  </CardExpansivel>
                  <Card>
                    <CardHeader>
                      <CardTitle>Público atendido por faixa etária</CardTitle>
                      <CardDescription>Consultas realizadas no período</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BarrasHorizontais
                        itens={painel.faixa_etaria.map((f) => ({ rotulo: f.faixa, valor: f.consultas }))}
                        unidade="consultas"
                        vazio="Nenhuma consulta realizada no período."
                      />
                    </CardContent>
                  </Card>
                </div>

                <CardExpansivel
                  titulo="Unidades"
                  descricao="Indicadores de cada unidade no período. Em vermelho, o que está fora da meta."
                  exibidos={Math.min(unidades.length, LIMITE_TABELA)}
                  total={unidades.length}
                  rotuloItens="unidades"
                  expandido={() => <TabelaUnidades unidades={unidades} cabecalhoFixo />}
                >
                  <TabelaUnidades unidades={unidades} limite={LIMITE_TABELA} />
                </CardExpansivel>
              </>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboardGestor;
