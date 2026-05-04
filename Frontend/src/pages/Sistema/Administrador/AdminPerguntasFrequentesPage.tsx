import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { HoverText } from "@/utils/tooltips";

import { duvidaService } from "@/services/sistema/duvidasService";
import { getApiErrorMessage } from "@/lib/notifications";
import type { DuvidaPergunta as DuvidaApi } from "@/types/duvidaFrequentes";

type Duvida = {
  id: string;
  pergunta: string;
  resposta: string;
  ativo: boolean;
};

const duvidaVazia: Duvida = {
  id: "",
  pergunta: "",
  resposta: "",
  ativo: true,
};

export default function AdminDuvidasPage() {
  const [busca, setBusca] = useState("");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [duvidas, setDuvidas] = useState<Duvida[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);

  const [duvidaForm, setDuvidaForm] = useState<Duvida>(duvidaVazia);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [duvidaExcluirId, setDuvidaExcluirId] = useState<string | null>(null);

  const normalizar = useCallback(
    (d: DuvidaApi): Duvida => ({
      id: String(d.id),
      pergunta: d.pergunta || "",
      resposta: d.resposta || "",
      ativo: d.is_active ?? true,
    }),
    [],
  );

  const carregarDuvidas = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await duvidaService.listar(filtroBusca ? { pergunta: filtroBusca } : undefined);

      const lista = Array.isArray(data?.result) ? data.result : [];
      setDuvidas(lista.map(normalizar));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erro ao carregar dúvidas."));
    } finally {
      setCarregando(false);
    }
  }, [filtroBusca, normalizar]);

  useEffect(() => {
    carregarDuvidas();
  }, [carregarDuvidas]);

  const pageSize = 5;
  const totalItens = duvidas.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize));
  const paginaInicio = totalItens ? (paginaAtual - 1) * pageSize + 1 : 0;
  const paginaFim = Math.min(paginaAtual * pageSize, totalItens);

  const duvidasPaginadas = useMemo(() => duvidas.slice((paginaAtual - 1) * pageSize, paginaAtual * pageSize), [paginaAtual, duvidas]);
  const mostraSkeletonTabela = carregando && duvidas.length === 0;
  const mostraOverlayTabela = carregando && duvidas.length > 0;

  useEffect(() => {
    setPaginaAtual(1);
  }, [totalItens]);

  const abrirEdicao = (d: Duvida) => {
    setDuvidaForm(d);
    setEditandoId(d.id);
    setModalFormAberto(true);
  };

  const abrirNovo = () => {
    setDuvidaForm(duvidaVazia);
    setEditandoId(null);
    setModalFormAberto(true);
  };

  const abrirExcluir = (id: string) => {
    setDuvidaExcluirId(id);
    setModalExcluirAberto(true);
  };

  const confirmarExclusao = async () => {
    if (!duvidaExcluirId) return;

    try {
      await duvidaService.remover(duvidaExcluirId);

      setDuvidas((lista) => lista.filter((item) => item.id !== duvidaExcluirId));

      toast.success("Pergunta excluída com sucesso.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erro ao excluir pergunta."));
    } finally {
      setModalExcluirAberto(false);
      setDuvidaExcluirId(null);
    }
  };
  const handleBuscar = () => {
    setFiltroBusca(busca.trim());
    setPaginaAtual(1);
  };

  const salvar = async () => {
    if (!duvidaForm.pergunta.trim() || !duvidaForm.resposta.trim()) {
      toast.error("Preencha pergunta e resposta.");
      return;
    }

    setSalvando(true);

    try {
      const payload = {
        pergunta: duvidaForm.pergunta.trim(),
        resposta: duvidaForm.resposta.trim(),
        is_active: duvidaForm.ativo,
      };

      if (editandoId) {
        const { data } = await duvidaService.atualizar(editandoId, payload);

        setDuvidas((lista) => lista.map((item) => (item.id === editandoId ? normalizar(data.result) : item)));

        toast.success("Atualizado com sucesso.");
      } else {
        const { data } = await duvidaService.criar(payload);

        setDuvidas((lista) => [...lista, normalizar(data.result)]);

        toast.success("Criado com sucesso.");
      }

      setModalFormAberto(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erro ao salvar."));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <RoleBasedSidebar />

        <main className="flex-1 p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-start gap-4">
              <SidebarTrigger />

              <div className="flex flex-col">
                <h1 className="text-3xl font-bold">Dúvidas Frequentes</h1>
                <p className="text-muted-foreground">Gerencie as dúvidas frequentes</p>
              </div>
            </div>

            <Button onClick={abrirNovo} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Dúvida
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Dúvidas</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex gap-2 w-full ">
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleBuscar();
                  }}
                  placeholder="Buscar por Dúvida..."
                  className="flex-1"
                />
                <Button onClick={handleBuscar}>Pesquisar</Button>
              </div>
            </CardContent>
          </Card>

          <div className="bg-card rounded-2xl shadow-md overflow-hidden">
            <div className="relative overflow-x-auto">
              {mostraOverlayTabela && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando dúvidas...
                  </div>
                </div>
              )}
              <Table className="w-full">
                <TableHeader className="bg-secondary">
                  <TableRow>
                    <TableHead className="px-6 py-4 font-bold text-black">Pergunta</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-black">Resposta</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-black text-right w-[140px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {mostraSkeletonTabela &&
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell colSpan={3} className="px-6 py-4">
                          <div className="grid grid-cols-3 gap-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-16 justify-self-end" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  {!mostraSkeletonTabela &&
                    duvidasPaginadas.map((d, index) => (
                      <TableRow key={d.id} className={`${index % 2 === 0 ? "bg-background" : "bg-muted/30"} hover:bg-muted/50 transition-colors`}>
                        <TableCell className="px-6 py-4">
                          <p className="font-semibold">{d.pergunta}</p>
                        </TableCell>

                        <TableCell className="px-6 py-4 max-w-md">
                          <HoverText text={d.resposta} cellClassName="text-muted-foreground" tooltipClassName="max-w-[420px]" />
                        </TableCell>

                        <TableCell className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="hover:bg-gray-200 text-gray-600" onClick={() => abrirEdicao(d)}>
                              <Pencil className="w-4 h-4" />
                            </Button>

                            <Button variant="ghost" size="icon" className="hover:bg-red-100 text-red-600" onClick={() => abrirExcluir(d.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                  {!carregando && duvidas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                        Nenhuma pergunta cadastrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          {totalItens > 0 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Mostrando {paginaInicio} - {paginaFim} de {totalItens}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded border disabled:opacity-50"
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                >
                  Anterior
                </button>
                <span className="text-sm text-muted-foreground">
                  Página {paginaAtual} / {totalPaginas}
                </span>
                <button
                  className="px-3 py-2 rounded border disabled:opacity-50"
                  onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual >= totalPaginas}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal formulário */}
      <Dialog open={modalFormAberto} onOpenChange={setModalFormAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar Dúvida" : "Nova Dúvida"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Pergunta *</Label>
              <Input
                value={duvidaForm.pergunta}
                onChange={(e) =>
                  setDuvidaForm((v) => ({
                    ...v,
                    pergunta: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Resposta *</Label>
              <Input
                value={duvidaForm.resposta}
                onChange={(e) =>
                  setDuvidaForm((v) => ({
                    ...v,
                    resposta: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={salvar} disabled={salvando}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal exclusão */}
      <Dialog open={modalExcluirAberto} onOpenChange={setModalExcluirAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir pergunta</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">Deseja realmente excluir esta pergunta?</p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalExcluirAberto(false)}>
              Cancelar
            </Button>

            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmarExclusao}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
