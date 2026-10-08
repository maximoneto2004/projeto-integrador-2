import { useEffect, useState } from "react";
import { PackageCheck, Printer, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Receita, ReceitaMedicamento } from "@/services/prontuario/receitaService";
import { formatCpf } from "@/utils/cpfFormater";
import { formatarData } from "@/utils/dataFormater";
import { imprimirReceita } from "@/utils/imprimirReceita";

type OnDispensar = (item: ReceitaMedicamento, quantidade: number) => Promise<void>;

function LinhaItem({
  item,
  saldo,
  onDispensar,
}: {
  item: ReceitaMedicamento;
  saldo: number | undefined;
  onDispensar: OnDispensar;
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

/** Receita com os itens a dispensar, saldo da unidade e baixa de estoque por item. */
export function CartaoReceitaDispensacao({
  receita,
  saldos,
  onDispensar,
}: {
  receita: Receita;
  saldos: Map<string, number>;
  onDispensar: OnDispensar;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            <ReceiptText className="h-5 w-5 text-indigo-700" />
            {receita.cidadao_nome}
            <span className="text-sm font-normal text-muted-foreground">CPF {formatCpf(receita.cidadao_cpf)}</span>
            {receita.status_dispensacao === "PARCIAL" && <Badge variant="secondary">Parcialmente dispensada</Badge>}
          </CardTitle>
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => imprimirReceita(receita)}>
            <Printer className="h-4 w-4" />
            Imprimir receita
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Emitida em {formatarData(receita.data_emissao)} por {receita.profissional_nome || "-"} · válida até{" "}
          {formatarData(receita.data_validade)}
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
            {receita.medicamentos.map((item) => (
              <LinhaItem
                key={item.id}
                item={item}
                saldo={item.medicamento ? saldos.get(item.medicamento) ?? 0 : undefined}
                onDispensar={onDispensar}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
