import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { toast } from "@/lib/sonner";
import { ArrowLeft, Save } from "lucide-react";

export default function AdminCadastroUnidade() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nome: "",
    endereco: "",
    bairro: "",
    telefone: "",
    email: "",
    turno1Inicio: "",
    turno1Fim: "",
    turno2Inicio: "",
    turno2Fim: "",
    ativo: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.nome || !formData.endereco || !formData.bairro || !formData.telefone) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Simular salvamento
    toast.success("Unidade cadastrada com sucesso!");
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
                Cadastro de Unidade CRAS
              </h1>
            </div>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Informações da Unidade</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados Básicos */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome da Unidade *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: CRAS Messejana"
                  />
                </div>

                <div>
                  <Label htmlFor="endereco">Endereço Completo *</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua, número, complemento"
                  />
                </div>

                <div>
                  <Label htmlFor="bairro">Bairro *</Label>
                  <Input
                    id="bairro"
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    placeholder="Ex: Messejana"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      placeholder="(85) 9 9999-9999"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="cras@fortaleza.ce.gov.br"
                    />
                  </div>
                </div>
              </div>

              {/* Horário de Expediente */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Horário de Expediente</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="turno1Inicio">Turno 1 - Início</Label>
                    <Input
                      id="turno1Inicio"
                      type="time"
                      value={formData.turno1Inicio}
                      onChange={(e) => setFormData({ ...formData, turno1Inicio: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="turno1Fim">Turno 1 - Fim</Label>
                    <Input
                      id="turno1Fim"
                      type="time"
                      value={formData.turno1Fim}
                      onChange={(e) => setFormData({ ...formData, turno1Fim: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="turno2Inicio">Turno 2 - Início</Label>
                    <Input
                      id="turno2Inicio"
                      type="time"
                      value={formData.turno2Inicio}
                      onChange={(e) => setFormData({ ...formData, turno2Inicio: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="turno2Fim">Turno 2 - Fim</Label>
                    <Input
                      id="turno2Fim"
                      type="time"
                      value={formData.turno2Fim}
                      onChange={(e) => setFormData({ ...formData, turno2Fim: e.target.value })}
                    />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Exemplo: Turno 1 (07:00 às 12:00) e Turno 2 (13:00 às 17:00)
                </p>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status da Unidade</Label>
                <Select
                  value={formData.ativo ? "Ativo" : "Inativo"}
                  onValueChange={(v) => setFormData({ ...formData, ativo: v === "Ativo" })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
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
                  Salvar Unidade
                </Button>
              </div>
            </form>
          </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

