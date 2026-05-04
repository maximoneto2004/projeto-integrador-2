import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { appointmentStore } from "@/lib/appointmentStore";
import type { Appointment } from "@/types/agenda";
import { Phone, Eye, Filter, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/sonner";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface ChamadoHistorico {
  id: string;
  nomeCidadao: string;
  servico: string;
  horaChamada: string;
  mesa: string;
  status: string;
}

const AdminAtendimentoPublico = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filtros
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0]);
  const [filtroSituacao, setFiltroSituacao] = useState<string>("todos");
  const [filtroServico, setFiltroServico] = useState<string>("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("integral");

  // Chamadas e Histórico
  const [ultimoChamado, setUltimoChamado] = useState<Appointment | null>(null);
  const [historicoUltimos, setHistoricoUltimos] = useState<ChamadoHistorico[]>([]);
  const mesaAtendente = "Mesa 03"; // TODO: pegar do contexto de usuário logado

  // Modal de chamada
  const [modalChamada, setModalChamada] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Appointment | null>(null);

  useEffect(() => {
    carregarAgendamentos();
  }, [filtroData, filtroSituacao, filtroServico, filtroPeriodo]);

  const carregarAgendamentos = () => {
    let lista = appointmentStore.getAppointments();

    // Filtro por data
    lista = lista.filter(a => a.data === filtroData);

    // Filtro por situação
    if (filtroSituacao !== "todos") {
      lista = lista.filter(a => a.status === filtroSituacao);
    }

    // Filtro por serviço
    if (filtroServico !== "todos") {
      lista = lista.filter(a => a.servico === filtroServico);
    }

    // Filtro por período
    if (filtroPeriodo !== "integral") {
      lista = lista.filter(a => {
        const hora = parseInt(a.hora.split(':')[0]);
        if (filtroPeriodo === "manha") {
          return hora < 12;
        } else if (filtroPeriodo === "tarde") {
          return hora >= 12;
        }
        return true;
      });
    }

    setAppointments(lista);
  };

  const chamarProximo = () => {
    const atendente = "Roberta Nascimento"; // TODO: pegar do contexto de usuário logado
    const proximo = appointmentStore.chamarProximoAgendamento(atendente);
    
    if (proximo) {
      // Atualizar último chamado
      setUltimoChamado(proximo);
      
      // Adicionar ao histórico
      const novoChamado: ChamadoHistorico = {
        id: proximo.id,
        nomeCidadao: proximo.nomeCidadao,
        servico: proximo.servico,
        horaChamada: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        mesa: mesaAtendente,
        status: "Em Atendimento"
      };
      
      setHistoricoUltimos(prev => [novoChamado, ...prev].slice(0, 5));
      
      setAgendamentoSelecionado(proximo);
      setModalChamada(true);
      toast.success(`${proximo.nomeCidadao} foi chamado!`);
      carregarAgendamentos();
    } else {
      toast.error("Não há agendamentos aguardando atendimento");
    }
  };

  const iniciarAtendimento = () => {
    if (agendamentoSelecionado) {
      appointmentStore.updateAppointment(agendamentoSelecionado.id, {
        status: "Em Atendimento",
        atendente: "Roberta Nascimento", // TODO: pegar do contexto
        horaInicioReal: new Date().toTimeString().split(' ')[0].substring(0, 5),
      });
      
      // Atualizar histórico
      setHistoricoUltimos(prev => 
        prev.map(h => h.id === agendamentoSelecionado.id 
          ? { ...h, status: "Em Atendimento" } 
          : h
        )
      );
      
      // cronômetro removido
      toast.success("Atendimento iniciado");
      setModalChamada(false);
      carregarAgendamentos();
    }
  };

  const aguardarAlgunsMinutos = () => {
    toast.info("Cidadão aguardará alguns minutos");
    setModalChamada(false);
  };

  const marcarNaoCompareceu = () => {
    if (agendamentoSelecionado) {
      appointmentStore.updateAppointment(agendamentoSelecionado.id, {
        status: "Não Compareceu",
      });
      
      // Atualizar histórico
      setHistoricoUltimos(prev => 
        prev.map(h => h.id === agendamentoSelecionado.id 
          ? { ...h, status: "Não Compareceu" } 
          : h
        )
      );
      
      toast.warning("Marcado como não compareceu");
      setModalChamada(false);
      carregarAgendamentos();
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      "Aguardando": "bg-yellow-200 text-yellow-700 border-yellow-300",
      "Ativado - Aguardando Atendimento": "bg-orange-200 text-orange-700 border-orange-300",
      "Em Atendimento": "bg-blue-200 text-blue-700 border-blue-300",
      Atendido: "bg-success/20 text-success border-success",
      Ausente: "bg-gray-200 text-gray-700 border-gray-300",
      "Não Compareceu": "bg-destructive/20 text-destructive border-destructive",
      Marcado: "bg-warning/20 text-warning border-warning",
      Finalizado: "bg-purple-200 text-purple-700 border-purple-300",
      Cancelado: "bg-destructive/20 text-destructive border-destructive",
    };

    return (
      <Badge className={`${styles[status as keyof typeof styles] || ""} border whitespace-nowrap`}>
        {status}
      </Badge>
    );
  };

  const servicosUnicos = [...new Set(appointmentStore.getAppointments().map(a => a.servico))];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />

        <main className="flex-1 p-8">
          <div className="mb-4">
            <SidebarTrigger />
          </div>

          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Atendimento ao Público</h1>
            <div className="flex gap-2">
              <Button onClick={chamarProximo} className="gap-2">
                <Phone className="h-4 w-4" />
                Chamar Próximo Agendamento
              </Button>
            </div>
          </div>

          {/* Seção: Chamando Agora */}
          {ultimoChamado && (
            <div className="mb-8">
              <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-background">
                <CardContent className="pt-8 pb-8">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <User className="h-6 w-6 text-primary" />
                      <h2 className="text-xl font-semibold text-muted-foreground">Chamando Agora</h2>
                    </div>
                    
                    <div className="text-5xl font-bold text-foreground mb-2">
                      {ultimoChamado.nomeCidadao}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-6">
                      <div className="bg-background/50 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground mb-1">Serviço</p>
                        <p className="font-semibold text-foreground">{ultimoChamado.servico}</p>
                      </div>
                      <div className="bg-background/50 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground mb-1">Horário</p>
                        <p className="font-semibold text-foreground">{ultimoChamado.hora}</p>
                      </div>
                      <div className="bg-background/50 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground mb-1">Mesa/Sala</p>
                        <p className="font-semibold text-primary text-2xl">{mesaAtendente}</p>
                      </div>
                      <div className="bg-background/50 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground mb-1">Atendente</p>
                        <p className="font-semibold text-foreground">{ultimoChamado.atendenteQueRealizouChamada || "Roberta Nascimento"}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Histórico dos Últimos Chamados */}
          {historicoUltimos.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">Últimos Chamados</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {historicoUltimos.map((chamado) => (
                  <Card key={chamado.id} className="border border-border">
                    <CardContent className="pt-4 pb-4">
                      <div className="space-y-2">
                        <div className="font-semibold text-foreground truncate">
                          {chamado.nomeCidadao}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {chamado.servico}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-primary font-medium">{chamado.mesa}</span>
                          <span className="text-muted-foreground">{chamado.horaChamada}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {chamado.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Estatísticas rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">
                  {appointments.filter(a => a.status === "Aguardando" || a.status === "Ativado - Aguardando Atendimento").length}
                </div>
                <p className="text-sm text-muted-foreground">Aguardando</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">
                  {appointments.filter(a => a.status === "Em Atendimento").length}
                </div>
                <p className="text-sm text-muted-foreground">Em Atendimento</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">
                  {appointments.filter(a => a.status === "Atendido").length}
                </div>
                <p className="text-sm text-muted-foreground">Atendidos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">
                  {appointments.filter(a => a.status === "Não Compareceu" || a.status === "Ausente").length}
                </div>
                <p className="text-sm text-muted-foreground">Ausentes</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="font-bold text-foreground text-xl flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </span>
            </button>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={filtroData}
                    onChange={(e) => setFiltroData(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Situação</Label>
                  <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="Aguardando">Aguardando</SelectItem>
                      <SelectItem value="Em Atendimento">Em Andamento</SelectItem>
                      <SelectItem value="Atendido">Atendido</SelectItem>
                      <SelectItem value="Ausente">Ausente</SelectItem>
                      <SelectItem value="Não Compareceu">Não Compareceu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de Serviço</Label>
                  <Select value={filtroServico} onValueChange={setFiltroServico}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {servicosUnicos.map(servico => (
                        <SelectItem key={servico} value={servico}>{servico}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Período</Label>
                  <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="integral">Integral</SelectItem>
                      <SelectItem value="manha">Manhã</SelectItem>
                      <SelectItem value="tarde">Tarde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Tabela de Fila */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Fila de Aguardando - Auditoria</h3>
          </div>
          <div className="bg-card rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-foreground">Horário</th>
                    <th className="px-6 py-4 text-left font-bold text-foreground">Cidadão</th>
                    <th className="px-6 py-4 text-left font-bold text-foreground">Serviço</th>
                    <th className="px-6 py-4 text-left font-bold text-foreground">Status</th>
                    <th className="px-6 py-4 text-left font-bold text-foreground">Tentativas</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment, index) => (
                    <tr key={appointment.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                      <td className="px-6 py-4 text-foreground font-medium">{appointment.hora}</td>
                      <td className="px-6 py-4 text-foreground">{appointment.nomeCidadao || "-"}</td>
                      <td className="px-6 py-4 text-foreground">{appointment.servico}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(appointment.status)}</td>
                      <td className="px-6 py-4 text-foreground">{appointment.tentativasChamada || 0}</td>
                    </tr>
                  ))}
                  {appointments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        Nenhum agendamento encontrado para os filtros selecionados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Modal de Chamada */}
      <Dialog open={modalChamada} onOpenChange={setModalChamada}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chamada de Atendimento</DialogTitle>
          </DialogHeader>
          {agendamentoSelecionado && (
            <div className="space-y-4">
              <div className="bg-primary/10 border-l-4 border-primary p-4 rounded">
                <p className="text-2xl font-bold text-foreground">{agendamentoSelecionado.nomeCidadao}</p>
                <p className="text-sm text-muted-foreground">foi chamado para atendimento</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">CPF</Label>
                  <p className="font-medium">{agendamentoSelecionado.cpfCidadao}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Telefone</Label>
                  <p className="font-medium">{agendamentoSelecionado.telefoneCidadao || "-"}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-sm">Serviço</Label>
                <p className="font-medium">{agendamentoSelecionado.servico}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Local</Label>
                  <p className="font-medium">{agendamentoSelecionado.unidade}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Horário Agendado</Label>
                  <p className="font-medium">{agendamentoSelecionado.hora}</p>
                </div>
              </div>

              {agendamentoSelecionado.observacoes && (
                <div>
                  <Label className="text-muted-foreground text-sm">Observações</Label>
                  <p className="text-sm mt-1 bg-muted/30 p-3 rounded-lg">{agendamentoSelecionado.observacoes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="grid-cols-2 flex-col gap-2 sm:flex-col">
            <Button onClick={iniciarAtendimento}>
              Iniciar Atendimento
            </Button>
        
            <Button onClick={marcarNaoCompareceu} variant="destructive" >
              Marcar Como Não Compareceu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default AdminAtendimentoPublico;
