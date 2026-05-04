import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/sonner";
import { servicos as servicosGlobais } from "@/lib/appointmentStore";

export interface ServicoRegistrado {
  id: string;
  servico: string;
  categoria: string;
  status: "Realizado" | "Não Realizado - Pré-requisito" | "Não Realizado - Recusa do Cidadão" | "Não Realizado - Indisponibilidade de Recurso" | "Cancelado";
  observacoes: string;
}

interface RegistrarServicosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicoPrincipal: { categoria: string; servico: string };
  onSalvar: (servicos: ServicoRegistrado[]) => void;
}

export function RegistrarServicosModal({
  open,
  onOpenChange,
  servicoPrincipal,
  onSalvar,
}: RegistrarServicosModalProps) {
  const [servicos, setServicos] = useState<ServicoRegistrado[]>([]);

  useEffect(() => {
    if (open) {
      // Inicializar com o serviço principal
      setServicos([
        {
          id: "principal",
          servico: servicoPrincipal.servico,
          categoria: servicoPrincipal.categoria,
          status: "Realizado",
          observacoes: "",
        },
      ]);
    }
  }, [open, servicoPrincipal]);

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
    setServicos(
      servicos.map((s) =>
        s.id === id ? { ...s, [campo]: valor } : s
      )
    );
  };

  const validarServicos = () => {
    // Verificar se o serviço principal está preenchido corretamente
    const principal = servicos.find((s) => s.id === "principal");
    if (!principal) {
      toast.error("Serviço principal não encontrado");
      return false;
    }

    // Validar todos os serviços
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

  const handleSalvar = () => {
    if (!validarServicos()) {
      return;
    }

    onSalvar(servicos);
    onOpenChange(false);
  };

  const todasCategorias = Object.keys(servicosGlobais);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Serviços do Atendimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {servicos.map((servico, index) => (
            <div
              key={servico.id}
              className={`border rounded-lg p-4 space-y-4 ${
                servico.id === "principal" ? "bg-primary/5 border-primary" : "bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">
                  {servico.id === "principal" ? "Serviço Principal" : `Serviço Adicional ${index}`}
                </h4>
                {servico.id !== "principal" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removerServico(servico.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

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
                  <Select
                    value={servico.status}
                    onValueChange={(val) => atualizarServico(servico.id, "status", val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Realizado">Realizado</SelectItem>
                      <SelectItem value="Não Realizado - Pré-requisito">
                        Não Realizado - Pré-requisito
                      </SelectItem>
                      <SelectItem value="Não Realizado - Recusa do Cidadão">
                        Não Realizado - Recusa do Cidadão
                      </SelectItem>
                      <SelectItem value="Não Realizado - Indisponibilidade de Recurso">
                        Não Realizado - Indisponibilidade de Recurso
                      </SelectItem>
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
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={adicionarServico}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Serviço
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar}>Salvar Registro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
