import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { PaginaSistema } from "@/components/PaginaSistema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CartaoReceitaDispensacao } from "@/components/medicamentos/CartaoReceitaDispensacao";
import { useUnidadeTrabalho } from "@/hooks/sistema/useUnidadeTrabalho";
import { receitaService, type Receita, type ReceitaMedicamento } from "@/services/prontuario/receitaService";
import { estoqueService } from "@/services/sistema/estoqueService";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";

export default function DispensacaoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const cidadaoId = searchParams.get("cidadao") || "";
  const { unidadeId, unidades } = useUnidadeTrabalho();
  const unidadeNome = unidades.find((u) => u.id === unidadeId)?.nome;

  const [termo, setTermo] = useState("");
  const [receitas, setReceitas] = useState<Receita[] | null>(null);
  const [saldos, setSaldos] = useState<Map<string, number>>(new Map());
  const [carregando, setCarregando] = useState(false);

  const carregarSaldos = useCallback(async () => {
    if (!unidadeId) return;
    const lista = await estoqueService.saldo({ unidade: unidadeId });
    setSaldos(new Map(lista.map((s) => [s.medicamento_id, s.saldo_disponivel])));
  }, [unidadeId]);

  const buscar = useCallback(
    async (filtro: { cidadao?: string; search?: string }) => {
      setCarregando(true);
      try {
        const [{ data }] = await Promise.all([
          receitaService.listar({ ...filtro, vigente: true, pendente_dispensacao: true, limit: 50 }),
          carregarSaldos(),
        ]);
        setReceitas(data.result ?? []);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Não foi possível buscar as receitas."));
      } finally {
        setCarregando(false);
      }
    },
    [carregarSaldos],
  );

  useEffect(() => {
    if (cidadaoId) buscar({ cidadao: cidadaoId });
  }, [cidadaoId, buscar]);

  const pesquisar = () => {
    const busca = termo.trim();
    if (busca.length < 3) {
      toast.error("Digite pelo menos 3 caracteres.");
      return;
    }
    if (cidadaoId) setSearchParams({});
    buscar({ search: /^[\d.\-\s]+$/.test(busca) ? busca.replace(/\D/g, "") : busca });
  };

  const dispensar = async (item: ReceitaMedicamento, quantidade: number) => {
    try {
      const movimentacoes = await estoqueService.dispensar({ unidade: unidadeId, receita_item: item.id, quantidade });
      const lotes = movimentacoes.map((m) => `lote ${m.lote_numero} (${Math.abs(m.quantidade)})`).join(", ");
      toast.success(`Dispensado: ${item.nome} — ${lotes}`);
      await buscar(cidadaoId ? { cidadao: cidadaoId } : { search: termo.trim() });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível dispensar."));
    }
  };

  const vazio = useMemo(() => receitas !== null && receitas.length === 0, [receitas]);

  return (
    <PaginaSistema titulo="Dispensação de medicamentos" subtitulo={unidadeNome ? `Estoque da unidade ${unidadeNome}` : undefined}>
      <div className="flex flex-wrap gap-2">
        <Input
          className="min-w-[240px] flex-1"
          placeholder="Nome ou CPF do paciente"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && pesquisar()}
        />
        <Button className="gap-2" onClick={pesquisar} disabled={carregando}>
          <Search className="h-4 w-4" />
          {carregando ? "Buscando..." : "Buscar receitas"}
        </Button>
      </div>

      {!unidadeId && <p className="text-sm text-destructive">Você não tem unidade ativa; não é possível dispensar.</p>}
      {vazio && <p className="text-sm text-muted-foreground">Nenhuma receita vigente com medicamentos pendentes.</p>}

      {receitas?.map((r) => (
        <CartaoReceitaDispensacao key={r.id} receita={r} saldos={saldos} onDispensar={dispensar} />
      ))}
    </PaginaSistema>
  );
}
