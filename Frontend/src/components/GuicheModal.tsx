import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { guicheService } from "@/services/sistema/guicheService";
import type { Guiche, GuicheDefineResponse } from "@/types/api";

interface GuicheModalProps {
  open: boolean;
  onConfirm: (guiche: GuicheDefineResponse) => void;
}

export function GuicheModal({ open, onConfirm }: GuicheModalProps) {
  const [guiches, setGuiches] = useState<Guiche[]>([]);
  const [selectedGuicheId, setSelectedGuicheId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setOptionsLoading(true);
    setOptionsError(null);

    guicheService
      .listar()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data.results;
        const disponiveis = (list ?? []).filter((guiche) => !guiche.ocupado);
        setGuiches(disponiveis);
        setSelectedGuicheId("");

        if (!disponiveis.length) {
          setOptionsError(
            "Todos os guichês estao ocupados no momento. Fale com um coordenador para criar outro guichê ou com um supervisor para liberar um guichê ocupado."
          );
        }
      })
      .catch(() => setOptionsError("Não foi possível carregar os guichês."))
      .finally(() => setOptionsLoading(false));
  }, [open]);

  const handleConfirm = async () => {
    if (!selectedGuicheId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await guicheService.definir({ guiche_id: selectedGuicheId });
      onConfirm(res.data);
    } catch {
      setError("Não foi possível definir o guichê. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} modal={true}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Selecione seu guichê de atendimento</DialogTitle>
          <DialogDescription>Escolha o guichê onde você irá realizar os atendimentos hoje.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="guiche">Guichê/Mesa</Label>
            <Select value={selectedGuicheId} onValueChange={setSelectedGuicheId} disabled={optionsLoading || guiches.length === 0}>
              <SelectTrigger id="guiche">
                <SelectValue
                  placeholder={optionsLoading ? "Carregando..." : guiches.length === 0 ? "Nenhum guichê disponivel" : "Selecione um guichê"}
                />
              </SelectTrigger>
              <SelectContent>
                {guiches.map((guiche) => (
                  <SelectItem key={guiche.id} value={guiche.id}>
                    {guiche.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {optionsError && <p className="text-sm text-destructive">{optionsError}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Button onClick={handleConfirm} disabled={!selectedGuicheId || loading} className="w-full">
          {loading ? "Confirmando..." : "Confirmar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
