import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAtivarProfissional, useAtualizarProfissional, useDesativarProfissional, useProfissionais } from "@/hooks/sistema/useProfissionais";
import { useAuth } from "@/contexts/AuthContext";
import type { Professional } from "@/types/professional";
import { Plus, MoreVertical, Eye, Pencil, Trash2, Search } from "lucide-react";

const AdminGerenciarProfissionais = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isCoordinator = user?.grupos?.includes("coordenador");
  const unidadeId = user?.unidade_ativa?.id ? String(user.unidade_ativa.id) : null;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const buildSearchParams = (termo: string) => {
    const limpo = termo.trim();
    if (!limpo) return null;
    if (!/[A-Za-z]/.test(limpo)) {
      return { cpf: limpo };
    }
    return { nome_completo: limpo };
  };

  const searchParams = useMemo(() => {
    const trimmed = searchTerm.trim();
    if (trimmed) return buildSearchParams(trimmed);
    if (isCoordinator && unidadeId) return { unidade: unidadeId };
    return {};
  }, [isCoordinator, searchTerm, unidadeId]);

  const { data: usuarios = [] } = useProfissionais(searchParams ?? undefined, Boolean(searchParams));
  const atualizarProfissional = useAtualizarProfissional();
  const ativarProfissional = useAtivarProfissional();
  const desativarProfissional = useDesativarProfissional();

  const normalizeUnidades = (unidades: any) => {
    const nomes: string[] = [];
    const ids: string[] = [];

    if (!Array.isArray(unidades)) return { nomes, ids };

    unidades.forEach((unidade) => {
      if (typeof unidade === "string") {
        nomes.push(unidade);
        return;
      }

      if (unidade && typeof unidade === "object") {
        if (typeof unidade.nome === "string") nomes.push(unidade.nome);
        if (unidade.id !== undefined && unidade.id !== null) ids.push(String(unidade.id));
      }
    });

    return { nomes, ids };
  };

  const mapUsuarioToProfessional = (u: any): Professional => {
    const { nomes, ids } = normalizeUnidades(u.unidades);
    return {
      id: u.id,
      nome: u.nome_completo,
      cpf: u.cpf,
      cargo: u.groups[0]?.name ?? "Sem cargo",
      unidades: nomes,
      unidadeIds: ids,
      telefone: u.telefone,
      email: u.email,
      status: u.is_active ? "Ativo" : "Inativo",
      dataAdmissao: u.created_at,
      servico: u.tipo_ofertados?.map((s: any) => s.nome) ?? [],
      servicoIds: u.tipo_ofertados?.map((s: any) => String(s.id)) ?? [],
    };
  };

  const professionals = useMemo(() => usuarios.map(mapUsuarioToProfessional), [usuarios]);
  const filteredProfessionals = professionals;

  const handleView = (professional: Professional) => {
    setSelectedProfessional(professional);

    setViewDialogOpen(true);
  };

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Professional | null>(null);

  const handleEdit = (id: string) => {
    const professional = professionals.find((p) => p.id === id);
    if (!professional) return;

    setEditFormData(professional);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;

    await atualizarProfissional.mutateAsync({
      id: editFormData.id,
      payload: {
        nome_completo: editFormData.nome,
        telefone: editFormData.telefone,
        email: editFormData.email,
      },
    });

    setEditDialogOpen(false);

    toast({
      title: "Sucesso",
      description: "Profissional atualizado com sucesso!",
    });
  };

  const handleToggleStatus = async (professional: Professional) => {
    if (professional.status === "Ativo") {
      await desativarProfissional.mutateAsync(professional.id);
    } else {
      await ativarProfissional.mutateAsync(professional.id);
    }

    toast({
      title: "Status atualizado",
      description: "Status alterado com sucesso!",
    });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <RoleBasedSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-3xl font-bold">Gerenciar Profissionais</h1>
                  <p className="text-muted-foreground">Visualize e gerencie todos os profissionais</p>
                </div>
              </div>
              <Button onClick={() => navigate("/sistema/cadastro/profissional")}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Profissional
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Lista de Profissionais</CardTitle>
                <CardDescription>Total de {filteredProfessionals.length} profissionais cadastrados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou CPF..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Cargo</TableHead>
                        {/* <TableHead>Unidade(s)</TableHead> */}
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProfessionals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhum profissional encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProfessionals.map((professional) => (
                          <TableRow key={professional.id}>
                            <TableCell className="font-medium">{professional.nome}</TableCell>

                            <TableCell>{professional.cargo}</TableCell>
                            {/* <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {professional.unidades.map((unidade, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {unidade.split(" - ")[0]}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell> */}
                            <TableCell>
                              <Badge variant={professional.status === "Ativo" ? "default" : "secondary"}>{professional.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleView(professional)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Visualizar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(professional.id)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleStatus(professional)}>
                                    {professional.status === "Ativo" ? "Desativar" : "Ativar"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Profissional</DialogTitle>
            <DialogDescription>Informações completas do profissional</DialogDescription>
          </DialogHeader>
          {selectedProfessional && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 font-semibold">Dados Pessoais</h3>
                <div className="grid gap-3 text-sm">
                  <div className="grid grid-cols-3">
                    <span className="text-muted-foreground">Nome:</span>
                    <span className="col-span-2 font-medium">{selectedProfessional.nome}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-muted-foreground">CPF:</span>
                    <span className="col-span-2">{selectedProfessional.cpf}</span>
                  </div>

                  <div className="grid grid-cols-3">
                    <span className="text-muted-foreground">Cargo:</span>
                    <span className="col-span-2">{selectedProfessional.cargo}</span>
                  </div>
                </div>
              </div>

              {/* <div>
                <h3 className="mb-3 font-semibold">Unidade(s) CRAS</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProfessional.unidades.map((unidade, idx) => (
                    <Badge key={idx} variant="outline">
                      {unidade}
                    </Badge>
                  ))}
                </div>
              </div> */}

              <div>
                <h3 className="mb-3 font-semibold">Contato</h3>
                <div className="grid gap-3 text-sm">
                  <div className="grid grid-cols-3">
                    <span className="text-muted-foreground">Telefone:</span>
                    <span className="col-span-2">{selectedProfessional.telefone || "Não informado"}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-muted-foreground">E-mail:</span>
                    <span className="col-span-2">{selectedProfessional.email || "Não informado"}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">Informações Administrativas</h3>
                <div className="grid gap-3 text-sm">
                  <div className="grid grid-cols-3">
                    <span className="text-muted-foreground">Data de Admissão:</span>
                    <span className="col-span-2">
                      {selectedProfessional.dataAdmissao ? new Date(selectedProfessional.dataAdmissao).toLocaleDateString("pt-BR") : "Não informado"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-muted-foreground">Escala de Trabalho:</span>
                    <span className="col-span-2">{selectedProfessional.escalaTrabalho || "Não informado"}</span>
                  </div>
                  {selectedProfessional.cargo === "Atendente" && (
                    <div className="grid grid-cols-3">
                      <span className="text-muted-foreground">Tipos de Serviço:</span>
                      <span className="col-span-2">
                        {selectedProfessional.servico.length ? selectedProfessional.servico.join(", ") : "Não informado"}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-3">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="col-span-2">
                      <Badge variant={selectedProfessional.status === "Ativo" ? "default" : "secondary"}>{selectedProfessional.status}</Badge>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Profissional</DialogTitle>
            <DialogDescription>Atualize as informações do profissional</DialogDescription>
          </DialogHeader>
          {editFormData && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Completo *</label>
                <Input
                  value={editFormData.nome}
                  onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                  placeholder="Nome completo do profissional"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">CPF *</label>
                  <Input
                    value={editFormData.cpf}
                    onChange={(e) => setEditFormData({ ...editFormData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cargo *</label>
                <Input value={editFormData.cargo} disabled placeholder="Cargo do profissional" />
              </div>

              {/* <div className="space-y-2">
                <label className="text-sm font-medium">Tipos de Serviço *</label>
                <Input value={editFormData.servico} placeholder="Servico do Atendente" />
              </div> */}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telefone</label>
                  <Input
                    value={editFormData.telefone}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        telefone: e.target.value,
                      })
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail</label>
                  <Input
                    value={editFormData.email}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        email: e.target.value,
                      })
                    }
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Escala de Trabalho</label>
                <Input
                  value={editFormData.escalaTrabalho}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      escalaTrabalho: e.target.value.split(","),
                    })
                  }
                  placeholder="Ex: Segunda a Sexta, 8h às 17h"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} className="flex-1">
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default AdminGerenciarProfissionais;
