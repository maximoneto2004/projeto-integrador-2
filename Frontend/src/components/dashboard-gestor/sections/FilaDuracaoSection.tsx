import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UnidadeFilaDuracao = {
  nome: string;
  fila: number;
  esperaMedia: number;
};

type FilaDuracaoSectionProps = {
  unidades: UnidadeFilaDuracao[];
};

type Ordenacao = "fila_desc" | "espera_desc" | "nome_asc";

function ordenarUnidades(unidades: UnidadeFilaDuracao[], ordenacao: Ordenacao) {
  const base = [...unidades];

  if (ordenacao === "fila_desc") {
    return base.sort((a, b) => {
      if (b.fila !== a.fila) return b.fila - a.fila;
      return b.esperaMedia - a.esperaMedia;
    });
  }

  if (ordenacao === "espera_desc") {
    return base.sort((a, b) => {
      if (b.esperaMedia !== a.esperaMedia) return b.esperaMedia - a.esperaMedia;
      return b.fila - a.fila;
    });
  }

  return base.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function UnidadeFilaDuracaoItem({ unidade }: { unidade: UnidadeFilaDuracao }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{unidade.nome}</div>
        <div className="text-sm text-muted-foreground">Fila: {unidade.fila} pessoas</div>
      </div>

      <Badge variant={unidade.esperaMedia > 25 ? "destructive" : "secondary"}>{Math.round(unidade.esperaMedia)} min</Badge>
    </div>
  );
}

export function FilaDuracaoSection({ unidades }: FilaDuracaoSectionProps) {
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("fila_desc");

  const resumo = useMemo(() => ordenarUnidades(unidades, "fila_desc").slice(0, 5), [unidades]);

  const listaExpandida = useMemo(() => {
    const filtradas = unidades.filter((item) => item.nome.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR")));

    return ordenarUnidades(filtradas, ordenacao);
  }, [busca, ordenacao, unidades]);

  const possuiMaisUnidades = unidades.length > resumo.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Fila e duração</CardTitle>
          <CardDescription>Duração média por unidade (top 5 por fila)</CardDescription>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={!possuiMaisUnidades}>
              Expandir
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-[96vw] w-[1000px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Fila e duração (todas)</DialogTitle>
              <DialogDescription>Busca e ordenação para visualizar todas as unidades.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-[1fr_260px]">
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar unidade..." />

              <Select value={ordenacao} onValueChange={(value) => setOrdenacao(value as Ordenacao)}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fila_desc">Fila (maior para menor)</SelectItem>
                  <SelectItem value="espera_desc">Duração (maior para menor)</SelectItem>
                  <SelectItem value="nome_asc">Nome (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border p-3 max-h-[58vh] overflow-auto space-y-3">
              {listaExpandida.length ? (
                listaExpandida.map((unidade) => <UnidadeFilaDuracaoItem key={unidade.nome} unidade={unidade} />)
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma unidade encontrada.</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {resumo.map((unidade) => (
            <UnidadeFilaDuracaoItem key={unidade.nome} unidade={unidade} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
