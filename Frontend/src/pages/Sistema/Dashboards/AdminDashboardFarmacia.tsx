import { CalendarClock, Hourglass, PackageCheck, PackageX, Pill, Timer } from "lucide-react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useFarmacia } from "@/hooks/sistema/useFarmacia";
import { KpiCard } from "@/components/meu-dia/KpiCard";
import { BarrasHorizontais } from "@/components/meu-dia/BarrasHorizontais";
import { CoberturaEstoque } from "@/components/farmacia/CoberturaEstoque";
import { SaidasDiariasChart } from "@/components/farmacia/SaidasDiariasChart";
import { ItensReceitaChart } from "@/components/farmacia/ItensReceitaChart";

// Espera acima disso na farmácia acende o alerta do card.
const ESPERA_ALERTA_MIN = 20;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const minutos = (valor: number | null | undefined) => (valor === null || valor === undefined ? "—" : `${Math.round(valor)} min`);
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const rotuloMes = (iso: string) => `${MESES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(2, 4)}`;

const AdminDashboardFarmacia = () => {
  const { user } = useAuth();
  const unidadeId = user?.unidade_ativa?.id || "";
  const { data: painel, isLoading, error } = useFarmacia(unidadeId);
  const resumo = painel?.resumo;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />

        <main className="min-w-0 flex-1 bg-muted/30">
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background px-6 py-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Farmácia da unidade</h1>
              <p className="text-sm text-muted-foreground">
                Quem espera para retirar, o que vai faltar e o que vai vencer em {user?.unidade_ativa?.nome || "sua unidade"}.
              </p>
            </div>
          </header>

          <div className="space-y-6 p-6">
            {!unidadeId && <p className="text-sm text-destructive">Sua unidade ativa não foi identificada. Entre novamente no sistema.</p>}
            {error && <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Erro ao carregar o painel."}</p>}
            {isLoading && <p className="text-sm text-muted-foreground">Carregando a farmácia...</p>}

            {painel && resumo && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <KpiCard
                    title="Fila de retirada agora"
                    value={`${resumo.fila_retirada}`}
                    helper={`${plural(resumo.chamando, "sendo chamado", "sendo chamados")} · maior espera ${minutos(resumo.maior_espera_min)}`}
                    icon={Hourglass}
                    alerta={resumo.maior_espera_min !== null && resumo.maior_espera_min > ESPERA_ALERTA_MIN}
                  />
                  <KpiCard
                    title="Tempo até a entrega"
                    value={minutos(painel.tempo_ate_dispensacao.tempo_medio_min)}
                    helper={`Do fim da consulta à primeira dispensação · ${plural(painel.tempo_ate_dispensacao.atendidos, "paciente", "pacientes")} em 30 dias`}
                    icon={Timer}
                  />
                  <KpiCard
                    title="Receitas atendidas hoje"
                    value={`${resumo.receitas_atendidas_hoje}`}
                    helper={
                      resumo.pct_itens_integrais === null
                        ? "Sem receitas nos últimos 30 dias"
                        : `${Math.round(resumo.pct_itens_integrais)}% dos itens entregues por completo em 30 dias`
                    }
                    icon={PackageCheck}
                  />
                  <KpiCard
                    title="Abaixo do estoque mínimo"
                    value={`${resumo.medicamentos_abaixo_minimo}`}
                    helper={`${plural(painel.rupturas.length, "medicamento", "medicamentos")} com receitas que o estoque não cobre`}
                    icon={PackageX}
                    alerta={resumo.medicamentos_abaixo_minimo > 0}
                  />
                  <KpiCard
                    title="Lotes a vencer em 30 dias"
                    value={`${resumo.lotes_vencendo}`}
                    helper={`${plural(resumo.lotes_vencidos, "lote vencido", "lotes vencidos")} ainda com saldo`}
                    icon={CalendarClock}
                    alerta={resumo.lotes_vencidos > 0}
                  />
                  <KpiCard
                    title="Perdas em 30 dias"
                    value={`${resumo.perdas_30d} un.`}
                    helper="Descartes e perdas registrados no estoque"
                    icon={Pill}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Fila de retirada</CardTitle>
                      <CardDescription>Pacientes encaminhados pelo médico, por ordem de saída do consultório</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      {painel.fila.length ? (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-muted-foreground">
                              <th className="px-2 py-2 font-medium">Paciente</th>
                              <th className="px-2 py-2 font-medium">Situação</th>
                              <th className="px-2 py-2 text-right font-medium">Esperando há</th>
                            </tr>
                          </thead>
                          <tbody>
                            {painel.fila.map((item) => (
                              <tr key={item.id} className="border-t">
                                <td className="px-2 py-2">{item.cidadao_nome}</td>
                                <td className="px-2 py-2">
                                  <Badge variant="secondary" className={item.situacao === "CHAMANDO_RETIRADA" ? "bg-emerald-100 text-emerald-800" : "bg-lime-100 text-lime-800"}>
                                    {item.situacao === "CHAMANDO_RETIRADA" ? `Chamado${item.farmaceutico_nome ? ` por ${item.farmaceutico_nome}` : ""}` : "Aguardando"}
                                  </Badge>
                                </td>
                                <td className={`px-2 py-2 text-right tabular-nums ${item.espera_min !== null && item.espera_min > ESPERA_ALERTA_MIN ? "font-semibold text-red-700" : ""}`}>
                                  {minutos(item.espera_min)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="py-8 text-center text-sm text-muted-foreground">Ninguém aguardando retirada agora.</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Receitas que o estoque não cobre</CardTitle>
                      <CardDescription>Itens pendentes ou parciais dos últimos 30 dias em que falta mais do que há em estoque</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      {painel.rupturas.length ? (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-muted-foreground">
                              <th className="px-2 py-2 font-medium">Medicamento</th>
                              <th className="px-2 py-2 text-right font-medium">Itens</th>
                              <th className="px-2 py-2 text-right font-medium">Falta entregar</th>
                              <th className="px-2 py-2 text-right font-medium">Em estoque</th>
                            </tr>
                          </thead>
                          <tbody>
                            {painel.rupturas.map((linha) => (
                              <tr key={linha.medicamento_id} className="border-t">
                                <td className="px-2 py-2">{linha.medicamento}</td>
                                <td className="px-2 py-2 text-right tabular-nums">{linha.itens_pendentes}</td>
                                <td className="px-2 py-2 text-right tabular-nums">{linha.quantidade_faltante}</td>
                                <td className="px-2 py-2 text-right font-semibold tabular-nums text-red-700">{linha.saldo_disponivel}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="py-8 text-center text-sm text-muted-foreground">O estoque cobre todas as receitas pendentes.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Dias de cobertura do estoque</CardTitle>
                    <CardDescription>
                      Saldo dividido pelo consumo médio diário dos últimos 30 dias. A marca vertical indica {painel.cobertura_alerta_dias} dias; abaixo dela, em vermelho, não há tempo de repor.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CoberturaEstoque linhas={painel.cobertura} alertaDias={painel.cobertura_alerta_dias} />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Saídas diárias dos mais dispensados</CardTitle>
                      <CardDescription>Unidades entregues por dia nos últimos 30 dias (4 medicamentos com mais saídas)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                      <SaidasDiariasChart saidas={painel.saidas_diarias} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Itens de receita por semana</CardTitle>
                      <CardDescription>Como ficaram os itens das receitas emitidas pela unidade nos últimos 30 dias</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ItensReceitaChart semanas={painel.itens_receita.semanas} />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Validade dos lotes</CardTitle>
                    <CardDescription>
                      Unidades com saldo por mês de vencimento, nos próximos 6 meses
                      {painel.validade.vencidos.lotes
                        ? `. Já vencidos: ${plural(painel.validade.vencidos.lotes, "lote", "lotes")} (${painel.validade.vencidos.quantidade} un.)`
                        : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarrasHorizontais
                      itens={painel.validade.meses.map((mes) => ({ rotulo: rotuloMes(mes.mes), valor: mes.quantidade }))}
                      unidade="unidades"
                      vazio="Nenhum lote vence nos próximos 6 meses."
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboardFarmacia;
