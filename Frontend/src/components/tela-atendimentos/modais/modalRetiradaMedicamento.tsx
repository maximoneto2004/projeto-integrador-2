import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Search, Undo2 } from "lucide-react";
import type { Appointment } from "@/types/agenda";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CartaoReceitaDispensacao } from "@/components/medicamentos/CartaoReceitaDispensacao";
import { useUnidadeTrabalho } from "@/hooks/sistema/useUnidadeTrabalho";
import { receitaService, type Receita, type ReceitaMedicamento } from "@/services/prontuario/receitaService";
import { estoqueService } from "@/services/sistema/estoqueService";
import { formatCpf } from "@/utils/cpfFormater";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";

interface ModalRetiradaMedicamentoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  /** Conclui a retirada (o agendamento passa a Finalizado). */
  onConcluir: () => Promise<void> | void;
  /** Volta o cidadão para a fila da farmácia, liberando a chamada. */
  onDevolver: () => Promise<void> | void;
}

/**
 * Aberto logo depois de o farmacêutico chamar o cidadão: mostra a(s) receita(s) do atendimento
 * e permite dispensar item a item (com baixa de estoque) antes de concluir a retirada.
 */
export function ModalRetiradaMedicamento({ open, onOpenChange, appointment, onConcluir, onDevolver }: ModalRetiradaMedicamentoProps) {
  const navigate = useNavigate();
  const { unidadeId } = useUnidadeTrabalho();
  const [receitas, setReceitas] = useState<Receita[] | null>(null);
  const [saldos, setSaldos] = useState<Map<string, number>>(new Map());
  const [encerrando, setEncerrando] = useState(false);

  const carregar = useCallback(async () => {
    if (!appointment) return;
    try {
      const [{ data }, saldoLista] = await Promise.all([
        receitaService.listar({ agendamento: appointment.id }),
        unidadeId ? estoqueService.saldo({ unidade: unidadeId }) : Promise.resolve([]),
      ]);
      setReceitas(data.result ?? []);
      setSaldos(new Map(saldoLista.map((s) => [s.medicamento_id, s.saldo_disponivel])));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível carregar a receita."));
      setReceitas([]);
    }
  }, [appointment, unidadeId]);

  useEffect(() => {
    if (!open) {
      setReceitas(null);
      return;
    }
    carregar();
  }, [open, carregar]);

  const dispensar = async (item: ReceitaMedicamento, quantidade: number) => {
    try {
      const movimentacoes = await estoqueService.dispensar({ unidade: unidadeId, receita_item: item.id, quantidade });
      const lotes = movimentacoes.map((m) => `lote ${m.lote_numero} (${Math.abs(m.quantidade)})`).join(", ");
      toast.success(`Dispensado: ${item.nome} — ${lotes}`);
      await carregar();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível dispensar."));
    }
  };

  const pendentes = useMemo(
    () => (receitas ?? []).some((r) => r.medicamentos.some((m) => !m.legado && m.quantidade_restante > 0)),
    [receitas],
  );

  const encerrar = async (acao: () => Promise<void> | void) => {
    setEncerrando(true);
    try {
      await acao();
    } finally {
      setEncerrando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Retirada de medicamento</DialogTitle>
          {appointment && (
            <DialogDescription>
              {appointment.nomeCidadao}
              {appointment.cpfCidadao ? ` · CPF ${formatCpf(appointment.cpfCidadao)}` : ""}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {receitas === null && <p className="text-sm text-muted-foreground">Carregando receita...</p>}
          {receitas?.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma receita encontrada para este atendimento.</p>
          )}
          {receitas?.map((receita) => (
            <CartaoReceitaDispensacao key={receita.id} receita={receita} saldos={saldos} onDispensar={dispensar} />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            className="gap-2"
            onClick={() => navigate(`/sistema/dispensacao?cidadao=${appointment?.cidadaoId ?? ""}`)}
          >
            <Search className="h-4 w-4" />
            Buscar outras receitas do cidadão
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="gap-2" disabled={encerrando} onClick={() => encerrar(onDevolver)}>
              <Undo2 className="h-4 w-4" />
              Devolver à fila
            </Button>
            <Button type="button" className="gap-2" disabled={encerrando} onClick={() => encerrar(onConcluir)}>
              <CheckCircle2 className="h-4 w-4" />
              {pendentes ? "Encerrar (retira depois)" : "Concluir retirada"}
            </Button>
          </div>
        </div>
        {pendentes && (
          <p className="text-xs text-muted-foreground">
            Ainda há medicamentos não dispensados. Ao encerrar, a receita continua válida e pode ser dispensada depois em
            “Dispensação”.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
