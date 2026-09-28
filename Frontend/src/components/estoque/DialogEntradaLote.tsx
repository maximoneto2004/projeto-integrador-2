import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SeletorMedicamento } from "@/components/medicamentos/SeletorMedicamento";
import { medicamentoService, type Medicamento } from "@/services/sistema/medicamentoService";
import { estoqueService } from "@/services/sistema/estoqueService";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unidadeId: string;
  unidadeNome?: string;
  onSalvo: () => void;
};

const hojeISO = () => new Date().toLocaleDateString("en-CA");

export function DialogEntradaLote({ open, onOpenChange, unidadeId, unidadeNome, onSalvo }: Props) {
  const [catalogo, setCatalogo] = useState<Medicamento[]>([]);
  const [medicamento, setMedicamento] = useState("");
  const [numero, setNumero] = useState("");
  const [validade, setValidade] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [dataEntrada, setDataEntrada] = useState(hojeISO());
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMedicamento("");
    setNumero("");
    setValidade("");
    setQuantidade("");
    setFornecedor("");
    setDataEntrada(hojeISO());
    medicamentoService
      .listar({ is_active: true })
      .then(setCatalogo)
      .catch(() => toast.error("Não foi possível carregar os medicamentos."));
  }, [open]);

  const salvar = async () => {
    const qtd = Number(quantidade);
    if (!medicamento || !numero.trim() || !validade || !(qtd > 0)) {
      toast.error("Informe medicamento, número do lote, validade e quantidade.");
      return;
    }
    if (validade < hojeISO()) {
      toast.error("Não é possível dar entrada em um lote já vencido.");
      return;
    }
    setSalvando(true);
    try {
      await estoqueService.criarLote({
        medicamento,
        unidade: unidadeId,
        numero_lote: numero.trim(),
        validade,
        quantidade_inicial: qtd,
        fornecedor: fornecedor.trim() || null,
        data_entrada: dataEntrada,
      });
      toast.success("Entrada de lote registrada.");
      onOpenChange(false);
      onSalvo();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível registrar a entrada."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Entrada de lote</DialogTitle>
          <DialogDescription>{unidadeNome ? `Unidade: ${unidadeNome}` : "Selecione a unidade antes."}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <Label>Medicamento *</Label>
            <SeletorMedicamento medicamentos={catalogo} value={medicamento} onChange={(m) => setMedicamento(m.id)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="numero-lote">Número do lote *</Label>
            <Input id="numero-lote" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="validade-lote">Validade *</Label>
            <Input id="validade-lote" type="date" min={hojeISO()} value={validade} onChange={(e) => setValidade(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qtd-lote">Quantidade *</Label>
            <Input
              id="qtd-lote"
              inputMode="numeric"
              placeholder="em unidades de dispensação"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="entrada-lote">Data de entrada</Label>
            <Input id="entrada-lote" type="date" max={hojeISO()} value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="fornecedor-lote">Fornecedor</Label>
            <Input id="fornecedor-lote" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando || !unidadeId}>
            {salvando ? "Salvando..." : "Registrar entrada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
