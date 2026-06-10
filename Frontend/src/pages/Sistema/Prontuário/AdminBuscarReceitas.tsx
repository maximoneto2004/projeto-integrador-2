import { useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Eye } from "lucide-react";
import { formatCpf } from "@/utils/cpfFormater";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { receitaService, type Receita } from "@/services/prontuario/receitaService";
import { toast } from "@/lib/sonner";

const PAGE_SIZE = 10;

function toDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

export default function AdminBuscarReceitas() {
  const [termo, setTermo] = useState("");
  const [buscaRealizada, setBuscaRealizada] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<Receita[]>([]);
  const [total, setTotal] = useState(0);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [receitaSelecionada, setReceitaSelecionada] = useState<Receita | null>(null);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paginaInicio = total ? (paginaAtual - 1) * PAGE_SIZE + 1 : 0;
  const paginaFim = Math.min(paginaAtual * PAGE_SIZE, total);

  const buscar = async (pagina = 1) => {
    setCarregando(true);
    try {
      const res = await receitaService.listar({
        search: termo.trim() || undefined,
        limit: PAGE_SIZE,
        offset: (pagina - 1) * PAGE_SIZE,
      });
      const data = res.data;
      setResultado(data.result ?? []);
      setTotal(data.count ?? 0);
      setPaginaAtual(pagina);
      setBuscaRealizada(true);
    } catch {
      toast.error("Erro ao buscar receitas.");
    } finally {
      setCarregando(false);
    }
  };

  const handleBuscar = () => buscar(1);

  const irPagina = (pagina: number) => buscar(pagina);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />

        <div className="flex-1 flex flex-col">
          <SidebarInset>
            <div className="container mx-auto p-6">
              <div className="mb-6">
                <h1 className="text-3xl font-bold">Receitas</h1>
                <p className="text-muted-foreground">Busque receitas associadas ao cidadão</p>
              </div>

              <div className="bg-card border rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Buscar Receitas</h2>
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Digite CPF, nome do cidadão ou medicamento"
                    value={termo}
                    onChange={(e) => setTermo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBuscar();
                    }}
                  />
                  <Button onClick={handleBuscar} className="gap-2" disabled={carregando}>
                    <Search className="h-4 w-4" />
                    {carregando ? "Buscando..." : "Pesquisar"}
                  </Button>
                </div>
              </div>

              {buscaRealizada && (
                <div className="bg-card border rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Resultado da Pesquisa</h2>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cidadão</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Qtd. medicamentos</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultado.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                            Nenhuma receita encontrada.
                          </TableCell>
                        </TableRow>
                      ) : (
                        resultado.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-semibold">{r.cidadao_nome || "-"}</TableCell>
                            <TableCell>{formatCpf(r.cidadao_cpf) || "-"}</TableCell>
                            <TableCell>{toDateLabel(r.data_emissao)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{r.medicamentos.length}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => setReceitaSelecionada(r)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>

                  {total > 0 && (
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Mostrando {paginaInicio} - {paginaFim} de {total}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => irPagina(paginaAtual - 1)}
                          disabled={paginaAtual === 1 || carregando}
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Página {paginaAtual} / {totalPaginas}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => irPagina(paginaAtual + 1)}
                          disabled={paginaAtual >= totalPaginas || carregando}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </SidebarInset>
        </div>
      </div>

      <Dialog open={!!receitaSelecionada} onOpenChange={(open) => !open && setReceitaSelecionada(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da receita</DialogTitle>
          </DialogHeader>
          {receitaSelecionada && (
            <div className="space-y-3">
              <p>
                <strong>Cidadão:</strong> {receitaSelecionada.cidadao_nome}
              </p>
              <p>
                <strong>CPF:</strong> {formatCpf(receitaSelecionada.cidadao_cpf)}
              </p>
              <p>
                <strong>Profissional:</strong> {receitaSelecionada.profissional_nome || "-"}
              </p>
              <p>
                <strong>Diagnóstico:</strong> {receitaSelecionada.diagnostico || "-"}
              </p>
              <p>
                <strong>Observações:</strong> {receitaSelecionada.observacoes || "-"}
              </p>

              <div className="space-y-2">
                <h3 className="font-semibold">Medicamentos</h3>
                {receitaSelecionada.medicamentos.map((m) => (
                  <div key={m.id} className="border rounded-md p-3 text-sm">
                    <p>
                      <strong>Nome:</strong> {m.nome}
                    </p>
                    <p>
                      <strong>Dosagem:</strong> {m.dosagem}
                    </p>
                    <p>
                      <strong>Frequência:</strong> {m.frequencia}
                    </p>
                    <p>
                      <strong>Duração:</strong> {m.duracao}
                    </p>
                    <p>
                      <strong>Instruções:</strong> {m.instrucoes || "-"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
