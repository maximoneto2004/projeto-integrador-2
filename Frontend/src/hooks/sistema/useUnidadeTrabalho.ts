import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { deriveRoleFromGroups } from "@/lib/authHelpers";
import { unidadePostoService } from "@/services/sistema/unidadePostoService";
import { toast } from "@/lib/sonner";

type Unidade = { id: string; nome: string };

/**
 * Unidade usada nas telas de estoque: o administrador escolhe entre todas;
 * os demais perfis trabalham na unidade ativa (o backend limita às unidades de lotação).
 */
export function useUnidadeTrabalho() {
  const { user } = useAuth();
  const isAdmin = deriveRoleFromGroups(user?.grupos) === "admin";
  const unidadeAtiva = user?.unidade_ativa ? { id: String(user.unidade_ativa.id), nome: user.unidade_ativa.nome } : null;

  const [unidades, setUnidades] = useState<Unidade[]>(unidadeAtiva ? [unidadeAtiva] : []);
  const [unidadeId, setUnidadeId] = useState<string>(unidadeAtiva?.id ?? "");

  useEffect(() => {
    if (!isAdmin) return;
    unidadePostoService
      .listar()
      .then((lista) => {
        const opcoes = lista.map((u) => ({ id: String(u.id), nome: u.nome }));
        setUnidades(opcoes);
        setUnidadeId((atual) => atual || opcoes[0]?.id || "");
      })
      .catch(() => toast.error("Não foi possível carregar as unidades."));
  }, [isAdmin]);

  return { unidadeId, setUnidadeId, unidades, podeEscolherUnidade: isAdmin };
}
