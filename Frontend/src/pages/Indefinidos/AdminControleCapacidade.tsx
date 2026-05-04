import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { toast } from "@/lib/sonner";
import { ArrowLeft, Save, Users, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CapacidadeTurno {
  periodo: string;
  horaInicio: string;
  horaFim: string;
  atendentes: number;
  atendimentosSimultaneos: number;
  tipoServico?: "Comum" | "Especial";
}

interface CapacidadeUnidade {
  unidadeId: string;
  turnos: CapacidadeTurno[];
}

const unidadesCRAS = [
  { id: "messejana", nome: "CRAS Messejana - Fortaleza" },
  { id: "centro", nome: "CRAS Centro - Fortaleza" },
  { id: "aldeota", nome: "CRAS Aldeota - Fortaleza" },
  { id: "parangaba", nome: "CRAS Parangaba - Fortaleza" },
];

const capacidadesMock: CapacidadeUnidade[] = [
  {
    unidadeId: "messejana",
    turnos: [
      {
        periodo: "Manhã",
        horaInicio: "08:00",
        horaFim: "12:00",
        atendentes: 3,
        atendimentosSimultaneos: 3,
      },
      {
        periodo: "Tarde",
        horaInicio: "14:00",
        horaFim: "18:00",
        atendentes: 4,
        atendimentosSimultaneos: 4,
      },
    ],
  },
];

export default function AdminControleCapacidade() {
  const navigate = useNavigate();
  const [unidadeSelecionada, setUnidadeSelecionada] = useState("");
  const [capacidades, setCapacidades] = useState<CapacidadeUnidade[]>(capacidadesMock);
  const [turnosManha, setTurnosManha] = useState({
    horaInicio: "08:00",
    horaFim: "12:00",
    atendentes: 3,
  });
  const [turnosTarde, setTurnosTarde] = useState({
    horaInicio: "14:00",
    horaFim: "18:00",
    atendentes: 4,
  });
  const [tempoAtendimento, setTempoAtendimento] = useState(20);
  const [tipoServico, setTipoServico] = useState<"Comum" | "Especial">("Comum");

  const capacidadeAtual = capacidades.find((c) => c.unidadeId === unidadeSelecionada);

  const calcularAtendimentosPorTurno = (
    horaInicio: string,
    horaFim: string,
    atendentes: number
  ) => {
    const [horaIni, minIni] = horaInicio.split(":").map(Number);
    const [horaFim2, minFim] = horaFim.split(":").map(Number);
    const minutosTotal = (horaFim2 * 60 + minFim) - (horaIni * 60 + minIni);
    const slots = Math.floor(minutosTotal / tempoAtendimento);
    return slots * atendentes;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!unidadeSelecionada) {
      toast.error("Selecione uma unidade CRAS");
      return;
    }

    if (turnosManha.atendentes < 1 || turnosTarde.atendentes < 1) {
      toast.error("Defina pelo menos 1 atendente por turno");
      return;
    }

    const novaCapacidade: CapacidadeUnidade = {
      unidadeId: unidadeSelecionada,
      turnos: [
        {
          periodo: "Manhã",
          horaInicio: turnosManha.horaInicio,
          horaFim: turnosManha.horaFim,
          atendentes: turnosManha.atendentes,
          atendimentosSimultaneos: turnosManha.atendentes,
          tipoServico,
        },
        {
          periodo: "Tarde",
          horaInicio: turnosTarde.horaInicio,
          horaFim: turnosTarde.horaFim,
          atendentes: turnosTarde.atendentes,
          atendimentosSimultaneos: turnosTarde.atendentes,
          tipoServico,
        },
      ],
    };

    // Atualizar ou adicionar capacidade
    const capacidadeExistente = capacidades.findIndex(
      (c) => c.unidadeId === unidadeSelecionada
    );

    if (capacidadeExistente >= 0) {
      const novasCapacidades = [...capacidades];
      novasCapacidades[capacidadeExistente] = novaCapacidade;
      setCapacidades(novasCapacidades);
    } else {
      setCapacidades([...capacidades, novaCapacidade]);
    }

    toast.success("Capacidade de atendimento configurada com sucesso!");
  };

  const carregarCapacidade = (unidadeId: string) => {
    const capacidade = capacidades.find((c) => c.unidadeId === unidadeId);
    if (capacidade) {
      const manha = capacidade.turnos.find((t) => t.periodo === "Manhã");
      const tarde = capacidade.turnos.find((t) => t.periodo === "Tarde");

      if (manha) {
        setTurnosManha({
          horaInicio: manha.horaInicio,
          horaFim: manha.horaFim,
          atendentes: manha.atendentes,
        });
      }
      if (tarde) {
        setTurnosTarde({
          horaInicio: tarde.horaInicio,
          horaFim: tarde.horaFim,
          atendentes: tarde.atendentes,
        });
      }
    }
  };

  const handleUnidadeChange = (unidadeId: string) => {
    setUnidadeSelecionada(unidadeId);
    carregarCapacidade(unidadeId);
  };

  const getNomeUnidade = (id: string) => {
    return unidadesCRAS.find((u) => u.id === id)?.nome || id;
  };

  const atendimentosManha = calcularAtendimentosPorTurno(
    turnosManha.horaInicio,
    turnosManha.horaFim,
    turnosManha.atendentes
  );

  const atendimentosTarde = calcularAtendimentosPorTurno(
    turnosTarde.horaInicio,
    turnosTarde.horaFim,
    turnosTarde.atendentes
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-6">
              <SidebarTrigger />
              <Button variant="ghost" size="icon" onClick={() => navigate("/sistema/agendamentos")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Controle de Capacidade</h1>
                <p className="text-muted-foreground mt-1">
                  Configure a capacidade de atendimentos simultâneos por unidade
                </p>
              </div>
            </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário de Configuração */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurar Capacidade</CardTitle>
                <CardDescription>
                  Defina quantos atendentes estarão disponíveis por turno para calcular a
                  capacidade de agendamentos simultâneos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Seleção de Unidade */}
                  <div>
                    <Label htmlFor="unidade">Unidade CRAS *</Label>
                    <Select value={unidadeSelecionada} onValueChange={handleUnidadeChange}>
                      <SelectTrigger id="unidade">
                        <SelectValue placeholder="Selecione a unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {unidadesCRAS.map((unidade) => (
                          <SelectItem key={unidade.id} value={unidade.id}>
                            {unidade.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tempo de Atendimento */}
                  <div>
                    <Label htmlFor="tempo">Tempo de Atendimento (minutos)</Label>
                    <Input
                      id="tempo"
                      type="number"
                      min="10"
                      step="5"
                      value={tempoAtendimento}
                      onChange={(e) => setTempoAtendimento(Number(e.target.value))}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Usado para calcular quantos atendimentos cabem no período
                    </p>
                  </div>

                  {/* Tipo de Serviço */}
                  <div>
                    <Label htmlFor="tipoServico">Tipo de Serviço *</Label>
                    <Select value={tipoServico} onValueChange={(val: "Comum" | "Especial") => setTipoServico(val)}>
                      <SelectTrigger id="tipoServico">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Comum">Comum</SelectItem>
                        <SelectItem value="Especial">Especial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Turno da Manhã */}
                  <div className="border border-border rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Turno da Manhã
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="manha-inicio">Hora Início</Label>
                        <Input
                          id="manha-inicio"
                          type="time"
                          value={turnosManha.horaInicio}
                          onChange={(e) =>
                            setTurnosManha({ ...turnosManha, horaInicio: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="manha-fim">Hora Fim</Label>
                        <Input
                          id="manha-fim"
                          type="time"
                          value={turnosManha.horaFim}
                          onChange={(e) =>
                            setTurnosManha({ ...turnosManha, horaFim: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="manha-atendentes">Nº de Atendentes *</Label>
                        <Input
                          id="manha-atendentes"
                          type="number"
                          min="1"
                          value={turnosManha.atendentes}
                          onChange={(e) =>
                            setTurnosManha({ ...turnosManha, atendentes: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded p-3">
                      <p className="text-sm">
                        <strong>Capacidade Calculada:</strong> {turnosManha.atendentes}{" "}
                        atendimentos simultâneos • {atendimentosManha} atendimentos no período
                      </p>
                    </div>
                  </div>

                  {/* Turno da Tarde */}
                  <div className="border border-border rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Turno da Tarde
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="tarde-inicio">Hora Início</Label>
                        <Input
                          id="tarde-inicio"
                          type="time"
                          value={turnosTarde.horaInicio}
                          onChange={(e) =>
                            setTurnosTarde({ ...turnosTarde, horaInicio: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="tarde-fim">Hora Fim</Label>
                        <Input
                          id="tarde-fim"
                          type="time"
                          value={turnosTarde.horaFim}
                          onChange={(e) =>
                            setTurnosTarde({ ...turnosTarde, horaFim: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="tarde-atendentes">Nº de Atendentes *</Label>
                        <Input
                          id="tarde-atendentes"
                          type="number"
                          min="1"
                          value={turnosTarde.atendentes}
                          onChange={(e) =>
                            setTurnosTarde({ ...turnosTarde, atendentes: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded p-3">
                      <p className="text-sm">
                        <strong>Capacidade Calculada:</strong> {turnosTarde.atendentes}{" "}
                        atendimentos simultâneos • {atendimentosTarde} atendimentos no período
                      </p>
                    </div>
                  </div>

                  {/* Botões */}
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/sistema/agendamentos")}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="gap-2">
                      <Save className="h-4 w-4" />
                      Salvar Configuração
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Informação sobre funcionamento */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Como funciona:</strong> Se você configurar 3 atendentes e o atendimento
                dura 30 minutos, o sistema permitirá até 3 agendamentos simultâneos para o mesmo
                horário (ex: 3 pessoas agendadas para 08h00). Quando a capacidade estiver esgotada,
                o horário ficará indisponível para novos agendamentos.
              </AlertDescription>
            </Alert>
          </div>

          {/* Resumo de Capacidades */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Capacidades Configuradas</CardTitle>
              </CardHeader>
              <CardContent>
                {capacidades.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma capacidade configurada
                  </p>
                ) : (
                  <div className="space-y-4">
                    {capacidades.map((capacidade) => (
                      <div
                        key={capacidade.unidadeId}
                        className="border border-border rounded-lg p-4 space-y-3"
                      >
                        <p className="font-semibold text-sm">
                          {getNomeUnidade(capacidade.unidadeId)}
                        </p>
                        {capacidade.turnos.map((turno, index) => (
                          <div key={index} className="text-sm space-y-1">
                            <p className="font-medium">{turno.periodo}</p>
                            <p className="text-muted-foreground">
                              {turno.horaInicio} - {turno.horaFim}
                            </p>
                            <Badge variant="secondary">
                              {turno.atendimentosSimultaneos} simultâneos
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

