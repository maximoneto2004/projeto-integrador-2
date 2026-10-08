import type { Receita } from "@/services/prontuario/receitaService";
import { formatCpf } from "@/utils/cpfFormater";
import { formatarData } from "@/utils/dataFormater";

export const ID_AREA_IMPRESSAO_RECEITA = "area-impressao-receita";

/**
 * Receituário em formato A4. Usa só classes do Tailwind (sem estilo inline) para continuar
 * funcionando com a política de segurança de conteúdo (CSP) do ambiente de produção.
 */
export function ReceitaImpressao({ receita }: { receita: Receita }) {
  const emitidaEm = formatarData(receita.data_emissao, true);

  return (
    <article className="mx-auto w-full max-w-[190mm] bg-white p-8 font-sans text-[11pt] leading-snug text-black">
      <header className="border-b-2 border-black pb-3 text-center">
        <p className="text-sm uppercase tracking-widest">Sistema de Postos de Saúde</p>
        <h1 className="mt-1 text-2xl font-bold">{receita.unidade_nome || "Unidade de saúde"}</h1>
        <p className="mt-2 text-lg font-semibold uppercase tracking-wide">Receituário</p>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1">
        <p>
          <strong>Paciente:</strong> {receita.cidadao_nome}
        </p>
        <p>
          <strong>CPF:</strong> {formatCpf(receita.cidadao_cpf) || "-"}
        </p>
        <p>
          <strong>Data de emissão:</strong> {emitidaEm}
        </p>
        <p>
          <strong>Válida até:</strong> {formatarData(receita.data_validade)}
        </p>
        {receita.diagnostico && (
          <p className="col-span-2">
            <strong>Diagnóstico / indicação:</strong> {receita.diagnostico}
          </p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 border-b border-black pb-1 text-base font-bold uppercase">Prescrição</h2>
        <ol className="space-y-4">
          {receita.medicamentos.map((item, indice) => (
            <li key={item.id} className="break-inside-avoid">
              <p className="font-semibold">
                {indice + 1}. {item.nome}
                {item.controlado && <span className="ml-2 border border-black px-1 text-xs uppercase">Controlado</span>}
              </p>
              <p className="pl-5">
                Dosagem: {item.dosagem} · Quantidade: {item.quantidade_prescrita ?? "-"}
              </p>
              <p className="pl-5">
                Posologia: {item.frequencia}, por {item.duracao}
              </p>
              {item.instrucoes && <p className="pl-5 italic">{item.instrucoes}</p>}
            </li>
          ))}
        </ol>
      </section>

      {receita.observacoes && (
        <section className="mt-5">
          <h2 className="mb-1 text-base font-bold uppercase">Observações</h2>
          <p>{receita.observacoes}</p>
        </section>
      )}

      <footer className="mt-16 break-inside-avoid text-center">
        <div className="mx-auto w-80 border-t border-black pt-1">
          <p className="font-semibold">{receita.profissional_nome || "Profissional responsável"}</p>
          <p className="text-sm">Médico(a) prescritor(a)</p>
        </div>
        <p className="mt-8 text-xs text-gray-600">
          Receita nº {receita.id.slice(0, 8).toUpperCase()} · gerada pelo Sistema de Postos de Saúde. Retire os medicamentos
          dentro do prazo de validade.
        </p>
      </footer>
    </article>
  );
}
