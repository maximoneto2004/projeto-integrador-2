import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Appointment } from "@/types/agenda";
import { receitaService, type ReceitaMedicamentoPayload } from "@/services/prontuario/receitaService";
import { toast } from "@/lib/sonner";

interface ModalRegistrarReceitaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  profissional?: string;
}

const emptyMedicamento = (): ReceitaMedicamentoPayload => ({
  nome: "",
  dosagem: "",
  frequencia: "",
  duracao: "",
  instrucoes: "",
});

export function ModalRegistrarReceita({ open, onOpenChange, appointment }: ModalRegistrarReceitaProps) {
  const [diagnostico, setDiagnostico] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [medicamentos, setMedicamentos] = useState<ReceitaMedicamentoPayload[]>([emptyMedicamento()]);
  const [salvando, setSalvando] = useState(false);

  const reset = () => {
    setDiagnostico("");
    setObservacoes("");
    setMedicamentos([emptyMedicamento()]);
  };

  const updateMedicamento = (index: number, field: keyof ReceitaMedicamentoPayload, value: string) => {
    setMedicamentos((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const adicionarMedicamento = () => setMedicamentos((prev) => [...prev, emptyMedicamento()]);
  const removerMedicamento = (index: number) => setMedicamentos((prev) => prev.filter((_, i) => i !== index));

  const salvar = async () => {
    if (!appointment) return;

    const medsValidos = medicamentos.filter(
      (m) => m.nome.trim() && m.dosagem.trim() && m.frequencia.trim() && m.duracao.trim()
    );
    if (!medsValidos.length) {
      toast.error("Informe pelo menos um medicamento com nome, dosagem, frequência e duração.");
      return;
    }

    setSalvando(true);
    try {
      await receitaService.criar({
        agendamento: appointment.id,
        diagnostico: diagnostico.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        medicamentos: medsValidos,
      });
      toast.success("Receita registrada com sucesso.");
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao registrar receita. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar receita</DialogTitle>
        </DialogHeader>

        {appointment && (
          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Cidadão:</strong> {appointment.nomeCidadao || "-"}
            </p>
            <p>
              <strong>CPF:</strong> {appointment.cpfCidadao || "-"}
            </p>
            <p>
              <strong>Serviço:</strong> {appointment.servico}
            </p>
          </div>
        )}

        <div className="space-y-3 mt-3">
          <Input placeholder="Diagnóstico / indicação clínica" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
          <Textarea placeholder="Observações gerais da receita" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>

        <div className="mt-4 space-y-4">
          {medicamentos.map((m, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input placeholder="Medicamento" value={m.nome} onChange={(e) => updateMedicamento(index, "nome", e.target.value)} />
                <Input placeholder="Dosagem (ex: 500mg)" value={m.dosagem} onChange={(e) => updateMedicamento(index, "dosagem", e.target.value)} />
                <Input
                  placeholder="Frequência (ex: 8/8h)"
                  value={m.frequencia}
                  onChange={(e) => updateMedicamento(index, "frequencia", e.target.value)}
                />
                <Input placeholder="Duração (ex: 7 dias)" value={m.duracao} onChange={(e) => updateMedicamento(index, "duracao", e.target.value)} />
              </div>
              <Textarea
                placeholder="Instruções adicionais (ex: após refeição, evitar álcool)"
                value={m.instrucoes || ""}
                onChange={(e) => updateMedicamento(index, "instrucoes", e.target.value)}
              />
              {medicamentos.length > 1 && (
                <Button type="button" variant="outline" onClick={() => removerMedicamento(index)}>
                  Remover medicamento
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <Button type="button" variant="outline" onClick={adicionarMedicamento}>
            Adicionar medicamento
          </Button>
          <Button type="button" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar receita"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
