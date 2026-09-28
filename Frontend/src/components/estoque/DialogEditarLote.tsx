import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { estoqueService, type Lote } from "@/services/sistema/estoqueService";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";

type Props = {
  lote: Lote | null;
  onOpenChange: (open: boolean) => void;
  onSalvo: () => void;
};

export function DialogEditarLote({ lote, onOpenChange, onSalvo }: Props) {
  const [numero, setNumero] = useState("");
  const [validade, setValidade] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!lote) return;
    setNumero(lote.numero_lote);
    setValidade(lote.validade);
    setFornecedor(lote.fornecedor ?? "");
    setAtivo(lote.is_active);
  }, [lote]);

  const salvar = async () => {
    if (!lote) return;
    if (!numero.trim() || !validade) {
      toast.error("Informe número do lote e validade.");
      return;
    }
    setSalvando(true);
    try {
      await estoqueService.atualizarLote(lote.id, {
        numero_lote: numero.trim(),
        validade,
        fornecedor: fornecedor.trim() || null,
        is_active: ativo,
      });
      toast.success("Lote atualizado.");
      onOpenChange(false);
      onSalvo();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível atualizar o lote."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={!!lote} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar lote</DialogTitle>
          <DialogDescription>
            {lote?.medicamento_descricao}. Quantidades só mudam por movimentação.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="edit-numero">Número do lote</Label>
            <Input id="edit-numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-validade">Validade</Label>
            <Input id="edit-validade" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="edit-fornecedor">Fornecedor</Label>
            <Input id="edit-fornecedor" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
          </div>
          <label className="flex items-center gap-3 md:col-span-2">
            <Switch checked={ativo} onCheckedChange={setAtivo} />
            <span className="text-sm">Lote ativo (inativo não entra no saldo nem na dispensação)</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
