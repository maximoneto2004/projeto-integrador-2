import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TIPOS_MOVIMENTACAO, type TipoMovimentacao } from "@/constants/medicamentos";
import { estoqueService, type Lote } from "@/services/sistema/estoqueService";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";

type Props = {
  lote: Lote | null;
  tipoInicial?: TipoMovimentacao;
  onOpenChange: (open: boolean) => void;
  onSalvo: () => void;
};

const EXIGE_MOTIVO: TipoMovimentacao[] = ["AJUSTE", "PERDA"];

export function DialogMovimentarLote({ lote, tipoInicial = "PERDA", onOpenChange, onSalvo }: Props) {
  const [tipo, setTipo] = useState<TipoMovimentacao>(tipoInicial);
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!lote) return;
    setTipo(tipoInicial);
    setQuantidade(tipoInicial === "PERDA" && lote.vencido ? String(lote.quantidade_atual) : "");
    setMotivo(tipoInicial === "PERDA" && lote.vencido ? "Lote vencido" : "");
  }, [lote, tipoInicial]);

  const ajuste = tipo === "AJUSTE";
  const descricao = TIPOS_MOVIMENTACAO.find((t) => t.value === tipo)?.descricao;

  const salvar = async () => {
    if (!lote) return;
    const qtd = Number(quantidade);
    if (!Number.isInteger(qtd) || qtd === 0 || (!ajuste && qtd < 0)) {
      toast.error(ajuste ? "Informe um ajuste diferente de zero." : "Informe uma quantidade maior que zero.");
      return;
    }
    if (EXIGE_MOTIVO.includes(tipo) && !motivo.trim()) {
      toast.error("Informe o motivo.");
      return;
    }
    setSalvando(true);
    try {
      await estoqueService.movimentar({ lote: lote.id, tipo, quantidade: qtd, motivo: motivo.trim() || null });
      toast.success("Movimentação registrada.");
      onOpenChange(false);
      onSalvo();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível registrar a movimentação."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={!!lote} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Movimentar lote</DialogTitle>
          <DialogDescription>
            {lote && `${lote.medicamento_descricao} · lote ${lote.numero_lote} · saldo atual ${lote.quantidade_atual}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoMovimentacao)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_MOVIMENTACAO.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {descricao && <p className="text-xs text-muted-foreground">{descricao}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="qtd-mov">Quantidade</Label>
            <Input
              id="qtd-mov"
              inputMode="numeric"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value.replace(ajuste ? /[^\d-]/g : /\D/g, ""))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="motivo-mov">Motivo{EXIGE_MOTIVO.includes(tipo) ? " *" : ""}</Label>
            <Textarea id="motivo-mov" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
