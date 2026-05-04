import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react";
import { toast } from "@/lib/sonner";
import { servicos as servicosGlobais } from "@/lib/appointmentStore";
import { appointmentStore } from "@/lib/appointmentStore";
// cronômetro removido

export interface ServicoRegistrado {
  id: string;
  servico: string;
  categoria: string;
  status:
    | "Realizado"
    | "Não Realizado - Pré-requisito"
    | "Não Realizado - Recusa do Cidadão"
    | "Não Realizado - Indisponibilidade de Recurso"
    | "Cancelado";
  observacoes: string;
}

export default function AdminRegistrarServicosPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const agendamentoId = searchParams.get("id");
  const categoria = searchParams.get("categoria") || "";
  const servico = searchParams.get("servico") || "";

  const [servicos, setServicos] = useState<ServicoRegistrado[]>([]);
  // cronômetro removido

  // cronômetro removido
  useEffect(() => {
    // Inicializar com o serviÃƒÂ§o principal
    setServicos([
      {
        id: "principal",
        servico: servico,
        categoria: categoria,
        status: "Realizado",
        observacoes: "",
      },
    ]);
  }, [servico, categoria]);

  const adicionarServico = () => {
    const novoServico: ServicoRegistrado = {
      id: Date.now().toString(),
      servico: "",
      categoria: "",
      status: "Realizado",
      observacoes: "",
    };
    setServicos([...servicos, novoServico]);
  };

  const removerServico = (id: string) => {
    if (id === "principal") {
      toast.error("O serviço principal não pode ser removido");
      return;
    }
    setServicos(servicos.filter((s) => s.id !== id));
  };

  const atualizarServico = (id: string, campo: keyof ServicoRegistrado, valor: any) => {
    setServicos(servicos.map((s) => (s.id === id ? { ...s, [campo]: valor } : s)));
  };

  const validarServicos = () => {
    // Verificar se o serviÃƒÂ§o principal estÃƒÂ¡ preenchido corretamente
    const principal = servicos.find((s) => s.id === "principal");
    if (!principal) {
      toast.error("Serviço principal não encontrado");
      return false;
    }

    // Validar todos os serviÃƒÂ§os
    for (const servico of servicos) {
      if (!servico.servico || !servico.categoria) {
        toast.error("Todos os serviços devem ter categoria e nome preenchidos");
        return false;
      }
    }

    // Verificar duplicidade
    const servicosUnicos = new Set(servicos.map((s) => `${s.categoria}-${s.servico}`));
    if (servicosUnicos.size !== servicos.length) {
      toast.error("Não pode haver serviços duplicados no mesmo atendimento");
      return false;
    }

    return true;
  };

  // cronômetro removido

  const handleSalvar = () => {
    if (!validarServicos()) {
      return;
    }

    // Salvar servicos registrados (sem finalizar)
    if (agendamentoId) {
      appointmentStore.updateAppointment(agendamentoId, {
        servicosRegistrados: servicos,
      });
    }

    toast.success("Serviços registrados!");

    navigate("/sistema/agendamentos");
  };

  const todasCategorias = Object.keys(servicosGlobais);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <RoleBasedSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-6 gap-4">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Registrar Serviços do Atendimento</h1>
          </header>

          <main className="flex-1 p-6 space-y-6 max-w-5xl mx-auto w-full">
            <Button variant="outline" onClick={() => navigate("/sistema/agendamentos")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            {/* cronômetro removido */}

            <div className="space-y-6">
              {servicos.map((servico, index) => (
                <Card key={servico.id} className={servico.id === "principal" ? "border-primary bg-primary/5" : "bg-muted/30"}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{servico.id === "principal" ? "Serviço Principal" : `Serviço Adicional ${index}`}</CardTitle>
                      {servico.id !== "principal" && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removerServico(servico.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Categoria *</Label>
                        <Select
                          value={servico.categoria}
                          onValueChange={(val) => atualizarServico(servico.id, "categoria", val)}
                          disabled={servico.id === "principal"}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {todasCategorias.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Serviço *</Label>
                        <Select
                          value={servico.servico}
                          onValueChange={(val) => atualizarServico(servico.id, "servico", val)}
                          disabled={servico.id === "principal" || !servico.categoria}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o serviço" />
                          </SelectTrigger>
                          <SelectContent>
                            {servico.categoria &&
                              servicosGlobais[servico.categoria]?.map((serv) => (
                                <SelectItem key={serv} value={serv}>
                                  {serv}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Status *</Label>
                        <Select value={servico.status} onValueChange={(val) => atualizarServico(servico.id, "status", val)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Realizado">Realizado</SelectItem>
                            <SelectItem value="Não Realizado - Pré-requisito">Não Realizado - Pré-requisito</SelectItem>
                            <SelectItem value="Não Realizado - Recusa do Cidadão">Não Realizado - Recusa do Cidadão</SelectItem>
                            <SelectItem value="Não Realizado - Indisponibilidade de Recurso">Não Realizado - Indisponibilidade de Recurso</SelectItem>
                            <SelectItem value="Cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Observações</Label>
                        <Textarea
                          value={servico.observacoes}
                          onChange={(e) => atualizarServico(servico.id, "observacoes", e.target.value)}
                          placeholder="Observações sobre este serviço..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button type="button" variant="outline" onClick={adicionarServico} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Serviço
              </Button>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => navigate("/sistema/agendamentos")} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSalvar} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                Salvar Registro
              </Button>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
