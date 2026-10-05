type PaginacaoProps = {
  paginaAtual: number;
  totalItens: number;
  tamanhoPagina: number;
  onMudarPagina: (pagina: number) => void;
  desabilitado?: boolean;
};

// Mesmo rodapé de paginação usado nas demais tabelas do sistema.
export function Paginacao({ paginaAtual, totalItens, tamanhoPagina, onMudarPagina, desabilitado }: PaginacaoProps) {
  if (!totalItens) return null;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / tamanhoPagina));
  const inicio = (paginaAtual - 1) * tamanhoPagina + 1;
  const fim = Math.min(paginaAtual * tamanhoPagina, totalItens);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">
        Mostrando {inicio} - {fim} de {totalItens}
      </span>
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-2 rounded border disabled:opacity-50"
          onClick={() => onMudarPagina(paginaAtual - 1)}
          disabled={desabilitado || paginaAtual <= 1}
        >
          Anterior
        </button>
        <span className="text-sm text-muted-foreground">
          Página {paginaAtual} / {totalPaginas}
        </span>
        <button
          className="px-3 py-2 rounded border disabled:opacity-50"
          onClick={() => onMudarPagina(paginaAtual + 1)}
          disabled={desabilitado || paginaAtual >= totalPaginas}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
