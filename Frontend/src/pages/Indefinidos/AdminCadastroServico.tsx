import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { toast } from "@/lib/sonner";
import { ArrowLeft, Save, Pencil, Trash2 } from "lucide-react";

export default function AdminCadastroServico() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    classe: "",
    tipoServico: "",
    tipoMarcacao: "",
    tempoAtendimento: "20",
    ativo: true,
  });

  // Mock de serviços cadastrados
  const [servicos] = useState([
    {
      id: "1",
      nome: "Novo Cadastro no CadÚnico",
      classe: "CadÚnico",
      tipoServico: "Comum",
      tipoMarcacao: "Atendimento por agendamento",
      tempoAtendimento: 20,
      ativo: true,
    },
    {
      id: "2",
      nome: "Atualização Cadastral",
      classe: "CadÚnico",
      tipoServico: "Comum",
      tipoMarcacao: "Atendimento por agendamento",
      tempoAtendimento: 15,
      ativo: true,
    },
    {
      id: "3",
      nome: "Atendimento Psicológico",
      classe: "Atendimento Técnico",
      tipoServico: "Especializado",
      tipoMarcacao: "Atendimento por encaminhamento interno",
      tempoAtendimento: 60,
      ativo: true,
    },
    {
      id: "4",
      nome: "Orientação sobre Benefícios",
      classe: "Benefícios",
      tipoServico: "Comum",
      tipoMarcacao: "Atendimento por agendamento",
      tempoAtendimento: 30,
      ativo: false,
    },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.nome || !formData.classe || !formData.tipoServico || !formData.tipoMarcacao) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Simular salvamento
    toast.success("Serviço cadastrado com sucesso!");
    navigate("/sistema/agendamentos");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-6">
              <SidebarTrigger />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/sistema/agendamentos")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold text-foreground">
                Cadastro de Serviço
              </h1>
            </div>

        <div className="grid gap-6 max-w-5xl mx-auto">
          {/* Lista de Serviços */}
          <Card>
            <CardHeader>
              <CardTitle>Serviços Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Serviço</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servicos.map((servico) => (
                    <TableRow key={servico.id}>
                      <TableCell className="font-medium">{servico.nome}</TableCell>
                      <TableCell>{servico.classe}</TableCell>
                      <TableCell>{servico.tipoServico}</TableCell>
                      <TableCell>{servico.tempoAtendimento} min</TableCell>
                      <TableCell>
                        <Badge variant={servico.ativo ? "default" : "secondary"}>
                          {servico.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toast.info("Editar serviço")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toast.info("Excluir serviço")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Formulário de Cadastro */}
          <Card>
            <CardHeader>
              <CardTitle>Cadastrar Novo Serviço</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados Básicos */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome do Serviço *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Novo Cadastro no CadÚnico"
                    />
                  </div>

                  <div>
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Descreva o serviço oferecido"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="classe">Classe/Grupo do Serviço *</Label>
                    <Select value={formData.classe} onValueChange={(value) => setFormData({ ...formData, classe: value })}>
                      <SelectTrigger id="classe">
                        <SelectValue placeholder="Selecione a classe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cadunico">CadÚnico</SelectItem>
                        <SelectItem value="atendimento_tecnico">Atendimento Técnico</SelectItem>
                        <SelectItem value="beneficios">Benefícios</SelectItem>
                        <SelectItem value="orientacao">Orientação Social</SelectItem>
                        <SelectItem value="documentacao">Documentação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tipoServico">Tipo de Serviço *</Label>
                    <Select value={formData.tipoServico} onValueChange={(value) => setFormData({ ...formData, tipoServico: value })}>
                      <SelectTrigger id="tipoServico">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comum">Comum</SelectItem>
                        <SelectItem value="especializado">Especializado (psicólogo, assistente social)</SelectItem>
                        <SelectItem value="externo">Externo (visita domiciliar)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      Comum: ofertado todos os dias. Especializado: dias específicos
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="tipoMarcacao">Tipo de Marcação *</Label>
                    <Select value={formData.tipoMarcacao} onValueChange={(value) => setFormData({ ...formData, tipoMarcacao: value })}>
                      <SelectTrigger id="tipoMarcacao">
                        <SelectValue placeholder="Selecione o tipo de marcação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agendamento">Atendimento por agendamento</SelectItem>
                        <SelectItem value="encaminhamento">Atendimento por encaminhamento interno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tempoAtendimento">Tempo de Atendimento (minutos) *</Label>
                    <Input
                      id="tempoAtendimento"
                      type="number"
                      min="10"
                      step="5"
                      value={formData.tempoAtendimento}
                      onChange={(e) => setFormData({ ...formData, tempoAtendimento: e.target.value })}
                      placeholder="20"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Padrão: 20 minutos
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label htmlFor="ativo">Serviço ativo</Label>
                </div>

                {/* Botões */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/sistema/agendamentos")}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="gap-2">
                    <Save className="h-4 w-4" />
                    Salvar Serviço
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

