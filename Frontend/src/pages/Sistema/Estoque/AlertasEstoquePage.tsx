import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { PaginaSistema } from "@/components/PaginaSistema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogMovimentarLote } from "@/components/estoque/DialogMovimentarLote";
import { SeletorUnidadeTrabalho } from "@/components/estoque/SeletorUnidadeTrabalho";
import { useUnidadeTrabalho } from "@/hooks/sistema/useUnidadeTrabalho";
import { useAuth } from "@/contexts/AuthContext";
import { deriveRoleFromGroups } from "@/lib/authHelpers";
import { estoqueService, type Alertas, type Lote } from "@/services/sistema/estoqueService";
import { diasAte, formatarData } from "@/utils/dataFormater";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";

export default function AlertasEstoquePage() {
  const { user } = useAuth();
  // O administrador só consulta; o backend libera escrita apenas ao supervisor.
  const podeGerenciar = deriveRoleFromGroups(user?.grupos) === "supervisor";
  const unidadeTrabalho = useUnidadeTrabalho();
  const { unidadeId } = unidadeTrabalho;

  const [alertas, setAlertas] = useState<Alertas | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [diasAlerta, setDiasAlerta] = useState("30");
  const [loteDescartar, setLoteDescartar] = useState<Lote | null>(null);

  const carregar = useCallback(async () => {
    if (!unidadeId) return;
    setCarregando(true);
    try {
      setAlertas(await estoqueService.alertas({ unidade: unidadeId, dias: diasAlerta }));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível carregar os alertas."));
    } finally {
      setCarregando(false);
    }
  }, [unidadeId, diasAlerta]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const totalAlertas = alertas ? alertas.estoque_baixo.length + alertas.vencendo.length + alertas.vencidos.length : 0;

  return (
    <PaginaSistema
      titulo="Alertas de estoque"
      subtitulo="Lotes vencidos, próximos do vencimento e medicamentos abaixo do mínimo"
      acoes={
        <Button variant="outline" className="gap-2" onClick={carregar} disabled={carregando}>
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      }
    >
      <SeletorUnidadeTrabalho {...unidadeTrabalho} />

      <div className="flex items-center gap-3">
        <Label>Lotes que vencem em até</Label>
        <Select value={diasAlerta} onValueChange={setDiasAlerta}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["15", "30", "60", "90"].map((d) => (
              <SelectItem key={d} value={d}>
                {d} dias
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {carregando && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {!carregando && alertas && totalAlertas === 0 && <p className="text-sm text-muted-foreground">Nenhum alerta para esta unidade.</p>}

      {!carregando && alertas && alertas.vencidos.length > 0 && (
        <Card className="border-red-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Lotes vencidos com saldo ({alertas.vencidos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertas.vencidos.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <strong>{l.medicamento_descricao}</strong> · lote {l.numero_lote} · venceu em {formatarData(l.validade)} ·{" "}
                  {l.quantidade_atual} un.
                </span>
                {podeGerenciar && (
                  <Button size="sm" variant="outline" onClick={() => setLoteDescartar(l)}>
                    Registrar descarte
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!carregando && alertas && alertas.vencendo.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader>
            <CardTitle className="text-amber-700">
              Vencendo em até {diasAlerta} dias ({alertas.vencendo.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {alertas.vencendo.map((l) => (
              <p key={l.id}>
                <strong>{l.medicamento_descricao}</strong> · lote {l.numero_lote} · vence em {formatarData(l.validade)} (
                {diasAte(l.validade)} dias) · {l.quantidade_atual} un.
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {!carregando && alertas && alertas.estoque_baixo.length > 0 && (
        <Card className="border-orange-300">
          <CardHeader>
            <CardTitle className="text-orange-700">Abaixo do estoque mínimo ({alertas.estoque_baixo.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {alertas.estoque_baixo.map((s) => (
              <p key={`${s.medicamento_id}-${s.unidade_id}`}>
                <strong>{s.medicamento}</strong> · disponível {s.saldo_disponivel} de mínimo {s.estoque_minimo}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <DialogMovimentarLote
        lote={loteDescartar}
        tipoInicial="PERDA"
        onOpenChange={(open) => !open && setLoteDescartar(null)}
        onSalvo={carregar}
      />
    </PaginaSistema>
  );
}
