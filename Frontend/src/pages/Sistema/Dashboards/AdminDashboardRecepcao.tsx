import { Link } from "react-router-dom";
import { AlarmClock, CalendarCheck, CalendarPlus, ListOrdered, UserCheck, Users } from "lucide-react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useRecepcao } from "@/hooks/sistema/useRecepcaoQualidade";
import { KpiCard } from "@/components/meu-dia/KpiCard";
import { BarrasHorizontais } from "@/components/meu-dia/BarrasHorizontais";

const minutos = (valor: number | null) => (valor === null ? "—" : valor >= 60 ? `${Math.floor(valor / 60)} h ${valor % 60} min` : `${valor} min`);

const AdminDashboardRecepcao = () => {
  const { user } = useAuth();
  const unidadeId = user?.unidade_ativa?.id || "";
  const { data: painel, isLoading, error } = useRecepcao(unidadeId);
  const resumo = painel?.resumo;
  const fila = painel?.fila;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />

        <main className="min-w-0 flex-1 bg-muted/30">
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background px-6 py-4">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Fluxo do dia</h1>
              <p className="text-sm text-muted-foreground">
                Quem deve chegar, quem está atrasado e onde há vaga para encaixe em {user?.unidade_ativa?.nome || "sua unidade"}. Atualiza a cada 30 segundos.
              </p>
            </div>
          </header>

          <div className="space-y-6 p-6">
            {!unidadeId && <p className="text-sm text-destructive">Sua unidade ativa não foi identificada. Entre novamente no sistema.</p>}
            {error && <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Erro ao carregar o painel."}</p>}
            {isLoading && <p className="text-sm text-muted-foreground">Carregando o dia...</p>}

            {painel && resumo && fila && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <KpiCard title="Esperados hoje" value={`${resumo.esperados}`} helper={`${resumo.cancelados} cancelados não entram na conta`} icon={CalendarCheck} />
                  <KpiCard title="Já chegaram" value={`${resumo.chegaram}`} helper={`${resumo.ausentes} marcados como ausentes`} icon={UserCheck} />
                  <KpiCard
                    title="Atrasados"
                    value={`${resumo.atrasados}`}
                    helper="Horário já passou e a chegada não foi confirmada"
                    icon={AlarmClock}
                    alerta={resumo.atrasados > 0}
                  />
                  <KpiCard title="Ainda vão chegar" value={`${resumo.a_chegar}`} helper="Agendados para mais tarde hoje" icon={Users} />
                  <KpiCard title="Vagas livres para encaixe" value={`${resumo.vagas_livres}`} helper="Nos horários que ainda vão acontecer hoje" icon={CalendarPlus} />
                  <KpiCard
                    title="Fila de espera"
                    value={`${fila.total}`}
                    helper={`${fila.preferencial_80} preferencial 80+ · ${fila.preferencial} preferencial · ${fila.urgentes} urgentes · mais antiga ${minutos(fila.espera_mais_antiga_min)}`}
                    icon={ListOrdered}
                    alerta={fila.urgentes > 0}
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Atrasados</CardTitle>
                    <CardDescription>Ligue para o paciente ou marque a ausência na lista de atendimentos para liberar a vaga.</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    {painel.atrasados.length ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="px-2 py-2 font-medium">Horário</th>
                            <th className="px-2 py-2 font-medium">Paciente</th>
                            <th className="px-2 py-2 font-medium">Telefone</th>
                            <th className="px-2 py-2 font-medium">Serviço</th>
                            <th className="px-2 py-2 text-right font-medium">Atraso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {painel.atrasados.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="px-2 py-2 font-medium tabular-nums">{item.horario}</td>
                              <td className="px-2 py-2">{item.cidadao_nome}</td>
                              <td className="px-2 py-2 tabular-nums">{item.telefone || <span className="text-amber-800">sem telefone</span>}</td>
                              <td className="px-2 py-2 text-muted-foreground">{item.servico_nome}</td>
                              <td className="px-2 py-2 text-right font-semibold tabular-nums text-red-700">{minutos(item.atraso_min)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="py-8 text-center text-sm text-muted-foreground">Nenhum paciente atrasado agora.</p>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Vagas livres por serviço</CardTitle>
                      <CardDescription>Use para encaixar quem está na fila de espera</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {painel.vagas_livres.length ? (
                        <ul className="space-y-3">
                          {painel.vagas_livres.map((linha) => (
                            <li key={linha.tipo_servico} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                              <span>{linha.tipo_servico}</span>
                              <span className="flex flex-wrap items-center gap-1">
                                {linha.horarios.map((h) => (
                                  <Badge key={h} variant="secondary" className="tabular-nums">{h}</Badge>
                                ))}
                                <span className="ml-1 tabular-nums text-muted-foreground">{linha.livres} vagas</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma vaga livre nos próximos horários de hoje.</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Fila de espera por serviço</CardTitle>
                      <CardDescription>Pessoas aguardando encaixe nesta unidade</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BarrasHorizontais
                        itens={fila.por_servico.map((s) => ({ rotulo: s.servico_nome, valor: s.total }))}
                        unidade="pessoas"
                        vazio="Ninguém na fila de espera."
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Cadastros incompletos de quem vem hoje</CardTitle>
                    <CardDescription>Aproveite a chegada do paciente para completar o cadastro.</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    {painel.cadastros_incompletos.length ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="px-2 py-2 font-medium">Horário</th>
                            <th className="px-2 py-2 font-medium">Paciente</th>
                            <th className="px-2 py-2 font-medium">Falta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {painel.cadastros_incompletos.map((item) => (
                            <tr key={item.cidadao_id} className="border-t">
                              <td className="px-2 py-2 tabular-nums">{item.horario}</td>
                              <td className="px-2 py-2">{item.cidadao_nome}</td>
                              <td className="px-2 py-2">
                                <span className="flex flex-wrap gap-1">
                                  {item.faltando.map((campo) => (
                                    <Badge key={campo} variant="secondary" className="bg-amber-100 text-amber-900">{campo}</Badge>
                                  ))}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="py-8 text-center text-sm text-muted-foreground">Todos os cadastros de hoje estão completos.</p>
                    )}
                    {painel.cadastros_incompletos.length > 0 && (
                      <Link to="/sistema/cadastro-cidadao" className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline">
                        Abrir o cadastro de cidadãos
                      </Link>
                    )}
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

export default AdminDashboardRecepcao;
