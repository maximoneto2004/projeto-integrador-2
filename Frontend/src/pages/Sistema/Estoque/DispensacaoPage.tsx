import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PackageCheck, ReceiptText, Search } from "lucide-react";
import { PaginaSistema } from "@/components/PaginaSistema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUnidadeTrabalho } from "@/hooks/sistema/useUnidadeTrabalho";
import { receitaService, type Receita, type ReceitaMedicamento } from "@/services/prontuario/receitaService";
import { estoqueService } from "@/services/sistema/estoqueService";
import { formatCpf } from "@/utils/cpfFormater";
import { formatarData } from "@/utils/dataFormater";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";

function LinhaItem({
  item,
  saldo,
  onDispensar,
}: {
  item: ReceitaMedicamento;
  saldo: number | undefined;
  onDispensar: (item: ReceitaMedicamento, quantidade: number) => Promise<void>;
}) {
  const [quantidade, setQuantidade] = useState(String(item.quantidade_restante || ""));
  const [enviando, setEnviando] = useState(false);

  useEffect(() => setQuantidade(String(item.quantidade_restante || "")), [item.quantidade_restante]);

  const qtd = Number(quantidade);
  const semEstoque = saldo !== undefined && saldo < qtd;
  const podeDispensar = !item.legado && item.quantidade_restante > 0;

  const dispensar = async () => {
    setEnviando(true);
    try {
      await onDispensar(item, qtd);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        {item.nome}
        {item.controlado && (
          <Badge variant="destructive" className="ml-2">
            Controlado
          </Badge>
        )}
        <p className="text-xs text-muted-foreground">
          {item.dosagem} · {item.frequencia} · {item.duracao}
        </p>
      </TableCell>
      <TableCell className="text-right">{item.legado ? "—" : item.quantidade_prescrita}</TableCell>
      <TableCell className="text-right">{item.legado ? "—" : item.quantidade_dispensada}</TableCell>
      <TableCell className="text-right">{saldo ?? (item.legado ? "—" : 0)}</TableCell>
      <TableCell className="text-right">
        {item.legado ? (
          <span className="text-xs text-muted-foreground">Item em texto livre</span>
        ) : !podeDispensar ? (
          <Badge variant="secondary">Dispensado</Badge>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <Input
              className="w-20"
              inputMode="numeric"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ""))}
            />
            <Button
              size="sm"
              className="gap-1"
              disabled={enviando || !(qtd > 0) || qtd > item.quantidade_restante || semEstoque}
              title={semEstoque ? "Saldo insuficiente na unidade" : undefined}
              onClick={dispensar}
            >
              <PackageCheck className="h-4 w-4" />
              Dispensar
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

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
        <Card key={r.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              <ReceiptText className="h-5 w-5 text-indigo-700" />
              {r.cidadao_nome}
              <span className="text-sm font-normal text-muted-foreground">CPF {formatCpf(r.cidadao_cpf)}</span>
              {r.status_dispensacao === "PARCIAL" && <Badge variant="secondary">Parcialmente dispensada</Badge>}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Emitida em {formatarData(r.data_emissao)} por {r.profissional_nome || "-"} · válida até {formatarData(r.data_validade)}
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicamento</TableHead>
                  <TableHead className="text-right">Prescrito</TableHead>
                  <TableHead className="text-right">Já dispensado</TableHead>
                  <TableHead className="text-right">Saldo na unidade</TableHead>
                  <TableHead className="text-right">Dispensar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.medicamentos.map((item) => (
                  <LinhaItem
                    key={item.id}
                    item={item}
                    saldo={item.medicamento ? saldos.get(item.medicamento) ?? 0 : undefined}
                    onDispensar={dispensar}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </PaginaSistema>
  );
}
