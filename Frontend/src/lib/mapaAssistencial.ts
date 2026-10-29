import type { MedicamentoMapa } from "@/types/mapaAssistencial";

export function nomeMedicamento(med: Pick<MedicamentoMapa, "nome" | "concentracao" | "unidade_medida" | "forma_farmaceutica">) {
  return `${med.nome} ${med.concentracao} ${med.unidade_medida.toLowerCase()} · ${med.forma_farmaceutica.toLowerCase().replace(/_/g, " ")}`;
}
