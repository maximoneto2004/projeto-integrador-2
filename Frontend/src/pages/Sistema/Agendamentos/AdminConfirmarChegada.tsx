import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/sonner";
import { Search, CheckCircle, User, Calendar, Clock } from "lucide-react";
import { appointmentStore } from "@/lib/appointmentStore";
import type { Appointment } from "@/types/agenda";

export default function AdminConfirmarChegada() {
  const [cpf, setCpf] = useState("");
  const [agendamentosEncontrados, setAgendamentosEncontrados] = useState<Appointment[]>([]);
  const [buscando, setBuscando] = useState(false);

  const formatarCPF = (valor: string) => {
    const numeros = valor.replace(/\D/g, "");
    if (numeros.length <= 11) {
      return numeros
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return valor;
  };

  const buscarAgendamentos = () => {
    if (false && (!cpf || cpf.replace(/\D/g, "").length !== 11)) {
      toast.error("Por favor, digite um CPF válido");
      return;
    }

    setBuscando(true);
    
    // Simular busca (mockado)
    setTimeout(() => {
      const hoje = new Date().toISOString().split('T')[0];
      const cpfLimpo = cpf.replace(/\D/g, "");
      
      const agendamentos = appointmentStore
        .getAppointments()
        .filter((a) => {
          const cpfAgendamento = a.cpfCidadao?.replace(/\D/g, "");
          return a.data === hoje && (a.status === "Marcado" || a.status === "Aguardando");
        });

      setAgendamentosEncontrados(agendamentos);
      setBuscando(false);

      if (agendamentos.length === 0) {
        toast.info("Nenhum agendamento encontrado para este CPF hoje");
      }
    }, 500);
  };

  const confirmarChegada = (agendamento: Appointment) => {
    appointmentStore.updateAppointment(agendamento.id, { status: "Aguardando" });
    toast.success(`Chegada confirmada! ${agendamento.nomeCidadao} está aguardando atendimento.`);
    
    // Remover da lista após confirmação
    setAgendamentosEncontrados((prev) => prev.filter((a) => a.id !== agendamento.id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      buscarAgendamentos();
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <RoleBasedSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-6 gap-4">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Confirmação de Chegada</h1>
          </header>

          <main className="flex-1 p-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Buscar Cidadão por CPF</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="cpf">CPF do Cidadão</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatarCPF(e.target.value))}
                      onKeyPress={handleKeyPress}
                      maxLength={14}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={buscarAgendamentos} disabled={buscando} className="gap-2">
                      <Search className="h-4 w-4" />
                      {buscando ? "Buscando..." : "Buscar"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {agendamentosEncontrados.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">
                  Agendamentos Encontrados ({agendamentosEncontrados.length})
                </h2>
                {agendamentosEncontrados.map((agendamento) => (
                  <Card key={agendamento.id} className="border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-semibold text-lg">{agendamento.nomeCidadao}</p>
                              <p className="text-sm text-muted-foreground">{agendamento.cpfCidadao}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Data</p>
                                <p className="font-medium">
                                  {new Date(agendamento.data + "T00:00:00").toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Horário</p>
                                <p className="font-medium">{agendamento.hora}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-sm">
                              <span className="text-muted-foreground">Serviço:</span>{" "}
                              <span className="font-medium">{agendamento.servico}</span>
                            </p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Categoria:</span>{" "}
                              <span className="font-medium">{agendamento.categoria}</span>
                            </p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Unidade:</span>{" "}
                              <span className="font-medium">{agendamento.unidade}</span>
                            </p>
                          </div>

                          <Badge variant="secondary">{agendamento.status}</Badge>
                        </div>

                        <Button
                          onClick={() => confirmarChegada(agendamento)}
                          className="gap-2"
                          size="lg"
                        >
                          <CheckCircle className="h-5 w-5" />
                          Confirmar Chegada
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
