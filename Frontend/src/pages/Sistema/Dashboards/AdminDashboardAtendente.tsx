import { useState } from "react";
import { format } from "date-fns";
import { Activity, CheckCircle2, Clock3, Hourglass, Target } from "lucide-react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useMeuDia } from "@/hooks/sistema/useMeuDia";
import { META_DENTRO_PRAZO_MIN_PCT } from "@/constants/indicadores";
import { KpiCard } from "@/components/meu-dia/KpiCard";
import { AgendaDoDia } from "@/components/meu-dia/AgendaDoDia";
import { TempoConsultaChart } from "@/components/meu-dia/TempoConsultaChart";
import { ClassificacaoRiscoBarra } from "@/components/meu-dia/ClassificacaoRiscoBarra";
import { BarrasHorizontais } from "@/components/meu-dia/BarrasHorizontais";

// Espera acima disso no dia de hoje acende o alerta do card.
const ESPERA_ALERTA_MIN = 30;

const minutos = (valor: number | null | undefined) => (valor === null || valor === undefined ? "—" : `${Math.round(valor)} min`);

const AdminDashboardAtendente = () => {
  const { user } = useAuth();
  const hoje = format(new Date(), "yyyy-MM-dd");
  const [dia, setDia] = useState(hoje);
  const unidadeId = user?.unidade_ativa?.id || "";
  const { data: painel, isLoading, error } = useMeuDia({ unidade_id: unidadeId, data: dia });

  const resumo = painel?.resumo;
  const meus = painel?.meus_tempos;
  const unidade = painel?.tempos_unidade;
  const ehHoje = dia === hoje;
  const pctNaMeta = meus?.pct_dentro_meta ?? null;
  const maiorEspera = resumo?.maior_espera_min ?? null;
  const triagem = painel?.triagem;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />

        <main className="min-w-0 flex-1 bg-muted/30">
          <header className="sticky top-0 z-10 flex flex-col gap-3 border-b bg-background px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Meu dia</h1>
                <p className="text-sm text-muted-foreground">
                  Seus atendimentos em {user?.unidade_ativa?.nome || "sua unidade"}. Os números são só seus; a unidade aparece como referência.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant={ehHoje ? "default" : "outline"} onClick={() => setDia(hoje)}>
                Hoje
              </Button>
              <Input
                type="date"
                aria-label="Dia"
                className="w-[170px]"
                value={dia}
                max={hoje}
                onChange={(e) => e.target.value && setDia(e.target.value)}
              />
            </div>
          </header>

          <div className="space-y-6 p-6">
            {!unidadeId && <p className="text-sm text-destructive">Sua unidade ativa não foi identificada. Entre novamente no sistema.</p>}
            {error && <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Erro ao carregar o painel."}</p>}
            {isLoading && <p className="text-sm text-muted-foreground">Carregando seu dia...</p>}

            {painel && resumo && meus && unidade && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <KpiCard
                    title="Atendidos"
                    value={`${resumo.atendidos} de ${resumo.agendados}`}
                    helper={`${resumo.a_chegar} ainda não chegaram · ${resumo.ausentes} ausentes`}
                    icon={CheckCircle2}
                  />
                  <KpiCard
                    title="Aguardando agora"
                    value={`${resumo.aguardando}`}
                    helper={
                      ehHoje
                        ? `Maior espera: ${minutos(maiorEspera)}${resumo.em_atendimento ? ` · ${resumo.em_atendimento} em atendimento` : ""}`
                        : "Espera só é calculada para hoje"
                    }
                    icon={Hourglass}
                    alerta={ehHoje && maiorEspera !== null && maiorEspera > ESPERA_ALERTA_MIN}
                  />
                  <KpiCard
                    title="Meu tempo médio de consulta"
                    value={meus.medidos ? minutos(meus.tempo_medio_atendimento_min) : "—"}
                    helper={`Meta média ${minutos(meus.medidos ? meus.tempo_medio_esperado_min : null)} · unidade ${minutos(unidade.medidos ? unidade.tempo_medio_atendimento_min : null)}`}
                    icon={Clock3}
                  />
                  <KpiCard
                    title="Consultas na meta"
                    value={pctNaMeta === null ? "—" : `${Math.round(pctNaMeta)}%`}
                    helper={
                      unidade.pct_dentro_meta === null
                        ? `${meus.medidos} consultas medidas`
                        : `${meus.medidos} consultas medidas · unidade ${Math.round(unidade.pct_dentro_meta)}%`
                    }
                    icon={Target}
                    alerta={pctNaMeta !== null && pctNaMeta < META_DENTRO_PRAZO_MIN_PCT}
                  />
                </div>

                <AgendaDoDia itens={painel.agenda} />

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <Card className="xl:col-span-2">
                    <CardHeader>
                      <CardTitle>Meu tempo de consulta nos últimos 30 dias</CardTitle>
                      <CardDescription>Média diária das suas consultas encerradas, comparada à meta dos serviços</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                      <TempoConsultaChart serie={painel.serie} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Classificação de risco</CardTitle>
                      <CardDescription>Seus registros de atendimento nos últimos 30 dias</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ClassificacaoRiscoBarra dados={painel.classificacao_risco} />
                    </CardContent>
                  </Card>
                </div>

                {painel.prescricao && painel.cids && (
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <Card>
                      <CardHeader>
                        <CardTitle>Principais CIDs</CardTitle>
                        <CardDescription>Últimos 30 dias (top 10)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <BarrasHorizontais
                          itens={painel.cids.map((item) => ({ rotulo: item.cid, valor: item.total }))}
                          unidade="atendimentos"
                          vazio="Nenhum CID registrado no período."
                        />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Medicamentos que prescrevi</CardTitle>
                        <CardDescription>Receitas com cada medicamento nos últimos 30 dias (top 10)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <BarrasHorizontais
                          itens={painel.prescricao.medicamentos.map((item) => ({ rotulo: item.nome, valor: item.receitas }))}
                          unidade="receitas"
                          vazio="Nenhuma receita emitida no período."
                        />
                      </CardContent>
                    </Card>
                    <KpiCard
                      title="Receitas com retirada imediata"
                      value={`${painel.prescricao.receitas_retirada_imediata} de ${painel.prescricao.receitas_total}`}
                      helper="Pacientes encaminhados direto à farmácia nos últimos 30 dias"
                      icon={Activity}
                    />
                  </div>
                )}

                {triagem && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Sinais vitais alterados na triagem</CardTitle>
                      <CardDescription>
                        {triagem.registros_com_sinais} registros com sinais vitais nos últimos 30 dias. PA ≥ 140/90 mmHg, glicemia ≥ 200 mg/dL, temperatura ≥ 37,8 °C.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BarrasHorizontais
                        itens={[
                          { rotulo: "Pressão elevada", valor: triagem.pressao_elevada },
                          { rotulo: "Glicemia alta", valor: triagem.glicemia_alta },
                          { rotulo: "Febre", valor: triagem.febre },
                        ].sort((a, b) => b.valor - a.valor)}
                        unidade="registros"
                        vazio="Nenhum sinal vital alterado no período."
                      />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboardAtendente;
