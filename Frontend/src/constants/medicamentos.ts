// Espelha as opções de app/static_data.py (FORMA_FARMACEUTICA, UNIDADE_MEDIDA, VIA_ADMINISTRACAO, TIPO_MOVIMENTACAO).
type Opcao = { value: string; label: string };

export const FORMAS_FARMACEUTICAS: Opcao[] = [
  { value: "COMPRIMIDO", label: "Comprimido" },
  { value: "COMPRIMIDO_ORODISPERSIVEL", label: "Comprimido orodispersível" },
  { value: "COMPRIMIDO_SOLUVEL", label: "Comprimido solúvel" },
  { value: "COMPRIMIDO_LIB_RETARDADA", label: "Comprimido de liberação retardada" },
  { value: "CAPSULA", label: "Cápsula" },
  { value: "DRAGEA", label: "Drágea" },
  { value: "SOLUCAO_ORAL", label: "Solução oral" },
  { value: "SUSPENSAO_ORAL", label: "Suspensão oral" },
  { value: "XAROPE", label: "Xarope" },
  { value: "GOTAS", label: "Gotas" },
  { value: "SOLUCAO_INJETAVEL", label: "Solução injetável" },
  { value: "PO_SOLUCAO_INJETAVEL", label: "Pó para solução injetável" },
  { value: "SUSPENSAO_INJETAVEL", label: "Suspensão injetável" },
  { value: "PO_SUSP_INJETAVEL", label: "Pó para suspensão injetável" },
  { value: "SOL_INJETAVEL_5ML", label: "Solução injetável 5 mL" },
  { value: "SOL_INJETAVEL_10ML", label: "Solução injetável 10 mL" },
  { value: "SOL_INJETAVEL_100ML", label: "Solução injetável 100 mL" },
  { value: "SOL_INJETAVEL_500ML", label: "Solução injetável 500 mL" },
  { value: "POMADA", label: "Pomada" },
  { value: "CREME", label: "Creme" },
  { value: "CREME_VAGINAL", label: "Creme vaginal" },
  { value: "GEL", label: "Gel" },
  { value: "COLIRIO", label: "Colírio" },
  { value: "SPRAY", label: "Spray" },
  { value: "AEROSSOL", label: "Aerossol" },
  { value: "SUPOSITORIO", label: "Supositório" },
  { value: "ADESIVO", label: "Adesivo" },
  { value: "PO", label: "Pó" },
  { value: "GOMA_MASCAR", label: "Goma de mascar" },
  { value: "PASTILHA", label: "Pastilha" },
  { value: "PRESERVATIVO_160X49", label: "Preservativo 160 mm x 49 mm" },
  { value: "PRESERVATIVO_160X52", label: "Preservativo 160 mm x 52 mm" },
  { value: "OUTRO", label: "Outro" },
];

export const UNIDADES_MEDIDA: Opcao[] = [
  { value: "MG", label: "mg" },
  { value: "G", label: "g" },
  { value: "MCG", label: "mcg" },
  { value: "ML", label: "mL" },
  { value: "MG_ML", label: "mg/mL" },
  { value: "MG_G", label: "mg/g" },
  { value: "UI", label: "UI" },
  { value: "UI_ML", label: "UI/mL" },
  { value: "PERCENTUAL", label: "%" },
  { value: "NAO_SE_APLICA", label: "Não se aplica / não identificada" },
];

export const VIAS_ADMINISTRACAO: Opcao[] = [
  { value: "ORAL", label: "Oral" },
  { value: "SUBLINGUAL", label: "Sublingual" },
  { value: "INTRAVENOSA", label: "Intravenosa" },
  { value: "INTRAMUSCULAR", label: "Intramuscular" },
  { value: "SUBCUTANEA", label: "Subcutânea" },
  { value: "TOPICA", label: "Tópica" },
  { value: "OFTALMICA", label: "Oftálmica" },
  { value: "OTOLOGICA", label: "Otológica" },
  { value: "NASAL", label: "Nasal" },
  { value: "INALATORIA", label: "Inalatória" },
  { value: "RETAL", label: "Retal" },
  { value: "VAGINAL", label: "Vaginal" },
  { value: "TRANSDERMICA", label: "Transdérmica" },
  { value: "NAO_INFORMADA", label: "Não informada" },
];

export type TipoMovimentacao = "ENTRADA" | "SAIDA" | "AJUSTE" | "PERDA";

export const TIPOS_MOVIMENTACAO: (Opcao & { value: TipoMovimentacao; descricao: string })[] = [
  { value: "ENTRADA", label: "Entrada", descricao: "Reposição de unidades no lote." },
  { value: "SAIDA", label: "Saída/Dispensação", descricao: "Saída manual de um lote específico." },
  { value: "AJUSTE", label: "Ajuste de inventário", descricao: "Corrige o saldo após contagem; use negativo para reduzir." },
  { value: "PERDA", label: "Perda/Descarte", descricao: "Vencimento, avaria ou extravio." },
];
