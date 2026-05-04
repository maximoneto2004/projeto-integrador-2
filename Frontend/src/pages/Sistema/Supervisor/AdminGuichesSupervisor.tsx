import { useCallback, useEffect, useMemo, useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { guicheService } from "@/services/sistema/guicheService";
import { usuarioService } from "@/services/sistema/profissionalService";
import type { Guiche } from "@/types/api";
import type { UsuarioApi } from "@/types/professional";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";
import { RefreshCw, Unlock } from "lucide-react";

type UsuarioComGuiche = UsuarioApi & {
  guiche_atual?: { id: string; nome?: string } | string | null;
  nome?: string;
};

const PAGE_SIZE = 5;

const AdminGuichesSupervisor = () => {
  const [guiches, setGuiches] = useState<Guiche[]>([]);
  const [ocupantes, setOcupantes] = useState<Record<string, UsuarioComGuiche>>({});
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [liberandoGuiche, setLiberandoGuiche] = useState<string | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(1);



  const carregarGuiches = useCallback(async (refresh = false) => {
    if (refresh) setAtualizando(true);
    else setCarregando(true);

    try {
      const [guichesResponse, usuarios] = await Promise.all([guicheService.listar(), usuarioService.listar()]);
      const lista = Array.isArray(guichesResponse.data) ? guichesResponse.data : guichesResponse.data?.results || [];
      setGuiches(lista);

      const mapaOcupantes = (usuarios as UsuarioComGuiche[]).reduce((acc, usuario) => {
        const guicheAtual = usuario.guiche_atual;
        if (!guicheAtual) return acc;
        const guicheId = typeof guicheAtual === "string" ? guicheAtual : guicheAtual.id;
        if (guicheId) acc[guicheId] = usuario;
        return acc;
      }, {} as Record<string, UsuarioComGuiche>);
      setOcupantes(mapaOcupantes);

      setPaginaAtual(1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível carregar os guichês."));
      setGuiches([]);
      setOcupantes({});
      setPaginaAtual(1);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    carregarGuiches(false);
  }, [carregarGuiches]);

  const handleLiberar = async (guiche: Guiche) => {
    const ocupante = ocupantes[guiche.id];
    if (!ocupante) {
      toast.error("Nenhum atendente associado a este guichê.");
      return;
    }

    setLiberandoGuiche(guiche.id);
    try {
      await usuarioService.atualizar(ocupante.id, { guiche_atual: null });
      toast.success(`Guichê ${guiche.nome} liberado.`);
      await carregarGuiches(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível liberar o guichê."));
    } finally {
      setLiberandoGuiche(null);
    }
  };

  const guichesOrdenados = useMemo(() => [...guiches].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [guiches]);

  const totalGuiches = guiches.length;
  const ocupados = useMemo(
    () => guiches.filter((guiche) => Boolean(ocupantes[guiche.id]) || guiche.ocupado).length,
    [guiches, ocupantes]
  );
  const livres = totalGuiches - ocupados;

  const pageSize = 10;
  const totalItens = guichesOrdenados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize));
  const paginaInicio = totalItens ? (paginaAtual - 1) * pageSize + 1 : 0;
  const paginaFim = Math.min(paginaAtual * pageSize, totalItens);
  const guichesPaginados = useMemo(
    () => guichesOrdenados.slice((paginaAtual - 1) * pageSize, paginaAtual * pageSize),
    [guichesOrdenados, paginaAtual]
  );

  useEffect(() => {
    setPaginaAtual(1);
  }, [totalItens]);

  return (
    <SidebarProvider>
      <RoleBasedSidebar />
      <SidebarInset>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Guichês da Unidade</h1>
              <p className="text-muted-foreground">Acompanhe ocupação, atendentes e libere guichês quando necessário.</p>
            </div>

            <Button variant="outline" size="sm" onClick={() => carregarGuiches(true)} disabled={atualizando}>
              <RefreshCw className={`mr-2 h-4 w-4 ${atualizando ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="space-y-0 pb-2">
                <CardDescription>Total de guichês</CardDescription>
                <CardTitle className="text-2xl">{totalGuiches}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="space-y-0 pb-2">
                <CardDescription>Ocupados</CardDescription>
                <CardTitle className="text-2xl text-destructive">{ocupados}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="space-y-0 pb-2">
                <CardDescription>Livres</CardDescription>
                <CardTitle className="text-2xl text-emerald-600">{livres}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="bg-card rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader className="bg-secondary">
                  <TableRow>
                    <TableHead className="px-6 py-4 text-left font-bold text-foreground">Guichê</TableHead>
                    <TableHead className="px-6 py-4 text-left font-bold text-foreground">Status</TableHead>
                    <TableHead className="px-6 py-4 text-left font-bold text-foreground">Atendente</TableHead>
                    <TableHead className="px-6 py-4 text-right font-bold text-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carregando ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        Carregando guichês...
                      </TableCell>
                    </TableRow>
                  ) : guichesPaginados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        Nenhum guichê encontrado para a unidade.
                      </TableCell>
                    </TableRow>
                  ) : (
                    guichesPaginados.map((guiche, index) => {
                      const ocupante = ocupantes[guiche.id];
                      const atendenteNome = ocupante?.nome_completo || ocupante?.nome || (guiche.ocupado ? "Atendente não informado" : "--");
                      const ocupado = Boolean(ocupante) || Boolean(guiche.ocupado);
                      return (
                        <TableRow key={guiche.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <TableCell className="px-6 py-4 font-medium text-foreground">{guiche.nome}</TableCell>
                          <TableCell className="px-6 py-4 text-foreground">
                            <Badge variant={ocupado ? "destructive" : "secondary"}>{ocupado ? "Ocupado" : "Livre"}</Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-foreground">{atendenteNome}</TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLiberar(guiche)}
                              disabled={!ocupado || liberandoGuiche === guiche.id}
                            >
                              <Unlock className="mr-2 h-4 w-4" />
                              {liberandoGuiche === guiche.id ? "Liberando..." : "Liberar"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          {guichesOrdenados.length > 0 && (
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
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AdminGuichesSupervisor;
