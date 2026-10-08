import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { ID_AREA_IMPRESSAO_RECEITA, ReceitaImpressao } from "@/components/receita/ReceitaImpressao";
import type { Receita } from "@/services/prontuario/receitaService";

const CLASSE_IMPRIMINDO = "imprimindo-receita";

/**
 * Imprime a receita na própria página: monta o receituário numa área só visível na impressão
 * (veja `index.css`) e abre o diálogo de impressão do navegador.
 */
export function imprimirReceita(receita: Receita) {
  document.getElementById(ID_AREA_IMPRESSAO_RECEITA)?.remove();

  const area = document.createElement("div");
  area.id = ID_AREA_IMPRESSAO_RECEITA;
  document.body.appendChild(area);

  const raiz = createRoot(area);
  flushSync(() => raiz.render(<ReceitaImpressao receita={receita} />));
  document.body.classList.add(CLASSE_IMPRIMINDO);

  const limpar = () => {
    window.removeEventListener("afterprint", limpar);
    document.body.classList.remove(CLASSE_IMPRIMINDO);
    raiz.unmount();
    area.remove();
  };
  window.addEventListener("afterprint", limpar);
  window.print();
}
