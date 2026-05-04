import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { toast } from "@/lib/sonner";
import { ArrowLeft, Plus, Edit, Eye, MapPin, Clock, Phone, Mail } from "lucide-react";

interface Unidade {
  id: string;
  nome: string;
  endereco: string;
  bairro: string;
  telefone: string;
  email: string;
  turno1Inicio: string;
  turno1Fim: string;
  turno2Inicio: string;
  turno2Fim: string;
  ativo: boolean;
  servicosConfigurados: number;
}

interface ServicoConfigurado {
  nome: string;
  diasSemana: string[];
  horario: string;
  ativo: boolean;
}

const unidadesMock: Unidade[] = [
  {
    id: "1",
    nome: "CRAS Messejana",
    endereco: "Rua das Flores, 123",
    bairro: "Messejana",
    telefone: "(85) 3234-5678",
    email: "cras.messejana@fortaleza.ce.gov.br",
    turno1Inicio: "08:00",
    turno1Fim: "12:00",
    turno2Inicio: "14:00",
    turno2Fim: "18:00",
    ativo: true,
    servicosConfigurados: 5,
  },
  {
    id: "2",
    nome: "CRAS Centro",
    endereco: "Av. Central, 456",
    bairro: "Centro",
    telefone: "(85) 3234-5679",
    email: "cras.centro@fortaleza.ce.gov.br",
    turno1Inicio: "08:00",
    turno1Fim: "12:00",
    turno2Inicio: "14:00",
    turno2Fim: "17:00",
    ativo: true,
    servicosConfigurados: 4,
  },
  {
    id: "3",
    nome: "CRAS Aldeota",
    endereco: "Rua da Praia, 789",
    bairro: "Aldeota",
    telefone: "(85) 3234-5680",
    email: "cras.aldeota@fortaleza.ce.gov.br",
    turno1Inicio: "07:00",
    turno1Fim: "12:00",
    turno2Inicio: "13:00",
    turno2Fim: "17:00",
    ativo: false,
    servicosConfigurados: 3,
  },
];

const servicosMock: ServicoConfigurado[] = [
  {
    nome: "Novo Cadastro no CadÚnico",
    diasSemana: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"],
    horario: "08:00 às 18:00",
    ativo: true,
  },
  {
    nome: "Atendimento Psicológico",
    diasSemana: ["Quarta"],
    horario: "08:00 às 12:00",
    ativo: true,
  },
  {
    nome: "Atendimento Assistente Social",
    diasSemana: ["Segunda", "Quinta"],
    horario: "14:00 às 17:00",
    ativo: true,
  },
  {
    nome: "Benefício de Prestação Continuada",
    diasSemana: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"],
    horario: "08:00 às 18:00",
    ativo: true,
  },
  {
    nome: "Atualização Cadastral",
    diasSemana: ["Terça", "Quinta"],
    horario: "08:00 às 12:00",
    ativo: false,
  },
];

export default function AdminGerenciarUnidades() {
  const navigate = useNavigate();
  const [unidades, setUnidades] = useState<Unidade[]>(unidadesMock);
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<Unidade | null>(null);
  const [unidadeEditando, setUnidadeEditando] = useState<Unidade | null>(null);

  const abrirModalVisualizar = (unidade: Unidade) => {
    setUnidadeSelecionada(unidade);
    setModalVisualizarAberto(true);
  };

  const abrirModalEditar = (unidade: Unidade) => {
    setUnidadeEditando({ ...unidade });
    setModalEditarAberto(true);
  };

  const salvarEdicao = () => {
    if (!unidadeEditando) return;

    setUnidades(
      unidades.map((u) =>
        u.id === unidadeEditando.id ? unidadeEditando : u
      )
    );

    toast.success("Unidade atualizada com sucesso!");
    setModalEditarAberto(false);
    setUnidadeEditando(null);
  };

  const toggleStatus = (id: string) => {
    setUnidades(
      unidades.map((u) =>
        u.id === id ? { ...u, ativo: !u.ativo } : u
      )
    );
    toast.success("Status da unidade atualizado!");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/sistema/agendamentos")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-3xl font-bold text-foreground">Gerenciar Unidades</h1>
              </div>
              <Button onClick={() => navigate("/sistema/cadastro/unidade")} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Unidade
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Unidades Cadastradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Bairro</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Serviços</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unidades.map((unidade) => (
                        <TableRow key={unidade.id}>
                          <TableCell className="font-medium">{unidade.nome}</TableCell>
                          <TableCell>{unidade.bairro}</TableCell>
                          <TableCell>{unidade.telefone}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {unidade.servicosConfigurados} configurados
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {unidade.ativo ? (
                              <Badge className="bg-green-600 text-white">Ativo</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-400 text-white">
                                Inativo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => abrirModalVisualizar(unidade)}
                                title="Visualizar"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => abrirModalEditar(unidade)}
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Modal Visualizar */}
            <Dialog open={modalVisualizarAberto} onOpenChange={setModalVisualizarAberto}>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Detalhes da Unidade</DialogTitle>
                </DialogHeader>
                {unidadeSelecionada && (
                  <div className="space-y-6">
                    {/* Informações Básicas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Nome da Unidade</Label>
                        <p className="font-medium">{unidadeSelecionada.nome}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Bairro</Label>
                        <p className="font-medium">{unidadeSelecionada.bairro}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-muted-foreground">Endereço</Label>
                        <p className="font-medium flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {unidadeSelecionada.endereco}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Telefone</Label>
                        <p className="font-medium flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {unidadeSelecionada.telefone}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">E-mail</Label>
                        <p className="font-medium flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {unidadeSelecionada.email}
                        </p>
                      </div>
                    </div>

                    {/* Horário de Expediente */}
                    <div>
                      <Label className="text-muted-foreground mb-2 block">
                        <Clock className="h-4 w-4 inline mr-2" />
                        Horário de Expediente
                      </Label>
                      <div className="grid grid-cols-2 gap-2 bg-muted/30 p-4 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">Turno 1</p>
                          <p className="text-sm">
                            {unidadeSelecionada.turno1Inicio} às {unidadeSelecionada.turno1Fim}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Turno 2</p>
                          <p className="text-sm">
                            {unidadeSelecionada.turno2Inicio} às {unidadeSelecionada.turno2Fim}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Serviços Configurados */}
                    <div>
                      <Label className="text-muted-foreground mb-3 block">
                        Serviços Configurados ({servicosMock.length})
                      </Label>
                      <div className="space-y-3">
                        {servicosMock.map((servico, index) => (
                          <div
                            key={index}
                            className="border border-border rounded-lg p-4 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{servico.nome}</p>
                              <Badge variant={servico.ativo ? "default" : "secondary"}>
                                {servico.ativo ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <p>
                                <strong>Dias:</strong> {servico.diasSemana.join(", ")}
                              </p>
                              <p>
                                <strong>Horário:</strong> {servico.horario}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Modal Editar */}
            <Dialog open={modalEditarAberto} onOpenChange={setModalEditarAberto}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Editar Unidade</DialogTitle>
                </DialogHeader>
                {unidadeEditando && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-nome">Nome da Unidade</Label>
                      <Input
                        id="edit-nome"
                        value={unidadeEditando.nome}
                        onChange={(e) =>
                          setUnidadeEditando({ ...unidadeEditando, nome: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-endereco">Endereço</Label>
                      <Input
                        id="edit-endereco"
                        value={unidadeEditando.endereco}
                        onChange={(e) =>
                          setUnidadeEditando({ ...unidadeEditando, endereco: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-bairro">Bairro</Label>
                      <Input
                        id="edit-bairro"
                        value={unidadeEditando.bairro}
                        onChange={(e) =>
                          setUnidadeEditando({ ...unidadeEditando, bairro: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-telefone">Telefone</Label>
                        <Input
                          id="edit-telefone"
                          value={unidadeEditando.telefone}
                          onChange={(e) =>
                            setUnidadeEditando({ ...unidadeEditando, telefone: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-email">E-mail</Label>
                        <Input
                          id="edit-email"
                          type="email"
                          value={unidadeEditando.email}
                          onChange={(e) =>
                            setUnidadeEditando({ ...unidadeEditando, email: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-turno1-inicio">Turno 1 - Início</Label>
                        <Input
                          id="edit-turno1-inicio"
                          type="time"
                          value={unidadeEditando.turno1Inicio}
                          onChange={(e) =>
                            setUnidadeEditando({
                              ...unidadeEditando,
                              turno1Inicio: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-turno1-fim">Turno 1 - Fim</Label>
                        <Input
                          id="edit-turno1-fim"
                          type="time"
                          value={unidadeEditando.turno1Fim}
                          onChange={(e) =>
                            setUnidadeEditando({ ...unidadeEditando, turno1Fim: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-turno2-inicio">Turno 2 - Início</Label>
                        <Input
                          id="edit-turno2-inicio"
                          type="time"
                          value={unidadeEditando.turno2Inicio}
                          onChange={(e) =>
                            setUnidadeEditando({
                              ...unidadeEditando,
                              turno2Inicio: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-turno2-fim">Turno 2 - Fim</Label>
                        <Input
                          id="edit-turno2-fim"
                          type="time"
                          value={unidadeEditando.turno2Fim}
                          onChange={(e) =>
                            setUnidadeEditando({ ...unidadeEditando, turno2Fim: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setModalEditarAberto(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={salvarEdicao}>Salvar Alterações</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

