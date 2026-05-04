import type { RelatorioAtendimentosTecnicoResult } from "@/services/sistema/relatorioService";

export type RelatorioLinha = {
  periodo: string;
  mes: string;
  ano: number;
  unidade: string;
  familiasEmAcompanhamento: number;
  familiasIniciaramAcompanhamento: number;
  familiasExtremaPobreza: number;
  familiasBolsaFamilia: number;
  familiasBpc: number;
  familiasDescumprimentoCondicionalidades: number;
  familiasTrabalhoInfantil: number;
  familiasAcolhimentoFamiliar: number;
  atendimentosRealizados: number;
  atendimentosEncaminhamentoCadunico: number;
  auxiliosNatalidade: number;
  auxiliosFuneral: number;
  outrosBeneficiosEventuais: number;
};

type FormularioMetricRow = {
  code: string;
  label: string;
  total: number | string;
  isSection?: boolean;
};

const toNumberOrUndefined = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const pickNumber = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = toNumberOrUndefined(value);
    if (parsed !== undefined) return parsed;
  }
  return 0;
};

const sumServicosPcd = (result: RelatorioAtendimentosTecnicoResult) => {
  const servicosPcd = result.servicos_adicionais_pcd_no_mes_referencia;
  if (!servicosPcd) return 0;
  return Object.values(servicosPcd).reduce((acc, item) => acc + (item.total || 0), 0);
};

const getPrimeirosCincoTotaisServicosSelecionados = (
  result: RelatorioAtendimentosTecnicoResult
) => {
  const servicos = result.servicos_adicionais_selecionados_no_mes_referencia ?? {};
  const totais = Object.values(servicos)
    .slice(0, 5)
    .map((item) => pickNumber(item.total));
  while (totais.length < 5) totais.push(0);
  return totais;
};

export type FormularioCrasCabecalho = {
  unidadeNome: string;
  endereco: string;
  municipio: string;
  uf: string;
};

const FORM_COLOR_LIGHT = "FF92D050";
const FORM_COLOR_DARK = "FF006100";
const FORM_COLOR_BORDER = "FF1F2937";

const relatorioColunas: Array<{ key: keyof RelatorioLinha; title: string; width: number }> = [
  { key: "periodo", title: "Período", width: 12 },
  { key: "mes", title: "Mês", width: 14 },
  { key: "ano", title: "Ano", width: 10 },
  { key: "unidade", title: "Unidade", width: 34 },
  { key: "familiasEmAcompanhamento", title: "Famílias em acompanhamento", width: 18 },
  { key: "familiasIniciaramAcompanhamento", title: "Famílias que iniciaram acompanhamento", width: 22 },
  { key: "familiasExtremaPobreza", title: "Famílias novas em extrema pobreza", width: 19 },
  { key: "familiasBolsaFamilia", title: "Famílias novas com Bolsa Família", width: 18 },
  { key: "familiasBpc", title: "Famílias novas com BPC", width: 16 },
  { key: "familiasDescumprimentoCondicionalidades", title: "Famílias novas com descumprimento de condicionalidades", width: 28 },
  { key: "familiasTrabalhoInfantil", title: "Famílias novas com trabalho infantil", width: 18 },
  { key: "familiasAcolhimentoFamiliar", title: "Famílias novas com acolhimento familiar", width: 20 },
  { key: "atendimentosRealizados", title: "Atendimentos realizados", width: 15 },
  { key: "atendimentosEncaminhamentoCadunico", title: "Atendimentos com encaminhamento Cadastro Único", width: 24 },
  { key: "auxiliosNatalidade", title: "Auxílios natalidade concedidos", width: 18 },
  { key: "auxiliosFuneral", title: "Auxílios funeral concedidos", width: 16 },
  { key: "outrosBeneficiosEventuais", title: "Outros benefícios eventuais concedidos", width: 20 },
];

const monthNamePtBr = (month: number) => {
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return months[Math.max(1, Math.min(12, month)) - 1];
};

const escapeCsv = (value: string | number | null) => {
  if (value === null) return "";
  const raw = String(value);
  if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
    return `"${raw.replace(/"/g, "\"\"")}"`;
  }
  return raw;
};

const buildFormularioRows = (result: RelatorioAtendimentosTecnicoResult): FormularioMetricRow[] => [
  ...(function () {
    const [c2, c3, c4, c5, c6] = getPrimeirosCincoTotaisServicosSelecionados(result);
    return [
  { code: "A.", label: "Volume de famílias em acompanhamento pelo PAIF", total: "Total", isSection: true },
  { code: "A.1", label: "Total de famílias em acompanhamento pelo PAIF", total: result.familias_em_acompanhamento },
  { code: "A.2", label: "Novas famílias inseridas no acompanhamento do PAIF durante o mês de referência", total: result.familias_que_iniciaram_acompanhamento_no_mes_referencia },
  { code: "B.", label: "Perfil das novas famílias inseridas em acompanhamento no PAIF no mês de referência", total: "Total", isSection: true },
  { code: "B.1", label: "Famílias em situação de extrema pobreza", total: result.familias_novas_em_extrema_pobreza_no_mes_referencia },
  { code: "B.2", label: "Famílias beneficiárias do Programa Bolsa Família", total: result.familias_novas_com_bolsa_familia_no_mes_referencia },
  { code: "B.3", label: "Famílias beneficiárias do Programa Bolsa Família em descumprimento de condicionalidades", total: result.familias_novas_com_descumprimento_condicionalidades_no_mes_referencia },
  { code: "B.4", label: "Famílias com membros beneficiários do BPC", total: result.familias_novas_com_bpc_no_mes_referencia },
  { code: "B.5", label: "Famílias com crianças ou adolescentes em situação de trabalho infantil", total: result.familias_novas_com_trabalho_infantil_no_mes_referencia },
  { code: "B.6", label: "Famílias com crianças ou adolescentes em Serviço de Acolhimento", total: result.familias_novas_com_acolhimento_familiar_no_mes_referencia },
  { code: "C.", label: "Volume de atendimentos particularizados realizados no CRAS no mês de referência", total: "Quantidade", isSection: true },
  { code: "C.1", label: "Total de atendimentos particularizados realizados no mês de referência", total: result.atendimentos_realizados_no_mes_referencia },
  { code: "C.2", label: "Famílias encaminhadas para inclusão no Cadastro Único", total: c2 },
  { code: "C.3", label: "Famílias encaminhadas para atualização cadastral no Cadastro Único", total: c3 },
  { code: "C.4", label: "Indivíduos encaminhados para acesso ao BPC", total: c4 },
  { code: "C.5", label: "Famílias encaminhadas para o CREAS", total: c5 },
  { code: "C.6", label: "Visitas domiciliares realizadas", total: c6 },
  { code: "C.7", label: "Total de auxílios-natalidade concedidos/entregues durante o mês de referência", total: result.auxilios_natalidade_concedidos_no_mes_referencia },
  { code: "C.8", label: "Total de auxílios-funeral concedidos/entregues durante o mês de referência", total: result.auxilios_funeral_concedidos_no_mes_referencia },
  { code: "C.9", label: "Outros benefícios eventuais concedidos/entregues durante o mês de referência", total: result.outros_beneficios_eventuais_concedidos_no_mes_referencia },
  { code: "D.", label: "Volume de atendimentos coletivos realizados no CRAS durante o mês de referência", total: "Quantidade", isSection: true },
  { code: "D.1", label: "Famílias participando regularmente de grupos no âmbito do PAIF", total: pickNumber(result.servicos_adicionais_agrupados_no_mes_referencia?.total) },
  { code: "D.2", label: "Crianças de 0 a 6 anos em Serviços de Convivência e Fortalecimento de Vínculos", total: pickNumber(result.faixas_etarias_servico_adicional_no_mes_referencia?.criancas_0_a_6_anos) },
  { code: "D.3", label: "Crianças/adolescentes de 7 a 14 anos em Serviços de Convivência e Fortalecimento de Vínculos", total: pickNumber(result.faixas_etarias_servico_adicional_no_mes_referencia?.criancas_adolescentes_7_a_14_anos) },
  { code: "D.4", label: "Adolescentes de 15 a 17 anos em Serviços de Convivência e Fortalecimento de Vínculos", total: pickNumber(result.faixas_etarias_servico_adicional_no_mes_referencia?.adolescentes_15_a_17_anos) },
  { code: "D.5", label: "Idosos em Serviços de Convivência e Fortalecimento de Vínculos para idosos", total: pickNumber(result.faixas_etarias_servico_adicional_no_mes_referencia?.idosos) },
  { code: "D.6", label: "Pessoas que participaram de palestras, oficinas e outras atividades coletivas de caráter não continuado", total: 0 },
  { code: "D.7", label: "Pessoas com deficiência, participando dos Serviços de Convivência ou dos grupos do PAIF", total: sumServicosPcd(result) },
  { code: "D.8", label: "Adultos entre 18 e 59 anos em Serviços de Convivência e Fortalecimento de Vínculos", total: pickNumber(result.faixas_etarias_servico_adicional_no_mes_referencia?.adultos_18_a_59_anos) },
    ];
  })(),
];

const getAtendimentosEncaminhamentoCadunico = (row: RelatorioAtendimentosTecnicoResult) =>
  getPrimeirosCincoTotaisServicosSelecionados(row)[0];

export const buildReportRows = (
  rows: RelatorioAtendimentosTecnicoResult[],
  resolveUnidadeNome: (unidadeId: string | null) => string
) => {
  return rows.map((row) => {
    const mesFormatado = String(row.mes_referencia).padStart(2, "0");
    const periodo = `${mesFormatado}/${row.ano_referencia}`;
    return {
      periodo,
      mes: monthNamePtBr(row.mes_referencia),
      ano: row.ano_referencia,
      unidade: resolveUnidadeNome(row.unidade_cras),
      familiasEmAcompanhamento: row.familias_em_acompanhamento,
      familiasIniciaramAcompanhamento: row.familias_que_iniciaram_acompanhamento_no_mes_referencia,
      familiasExtremaPobreza: row.familias_novas_em_extrema_pobreza_no_mes_referencia,
      familiasBolsaFamilia: row.familias_novas_com_bolsa_familia_no_mes_referencia,
      familiasBpc: row.familias_novas_com_bpc_no_mes_referencia,
      familiasDescumprimentoCondicionalidades: row.familias_novas_com_descumprimento_condicionalidades_no_mes_referencia,
      familiasTrabalhoInfantil: row.familias_novas_com_trabalho_infantil_no_mes_referencia,
      familiasAcolhimentoFamiliar: row.familias_novas_com_acolhimento_familiar_no_mes_referencia,
      atendimentosRealizados: row.atendimentos_realizados_no_mes_referencia,
      atendimentosEncaminhamentoCadunico: getAtendimentosEncaminhamentoCadunico(row),
      auxiliosNatalidade: row.auxilios_natalidade_concedidos_no_mes_referencia,
      auxiliosFuneral: row.auxilios_funeral_concedidos_no_mes_referencia,
      outrosBeneficiosEventuais: row.outros_beneficios_eventuais_concedidos_no_mes_referencia,
    } satisfies RelatorioLinha;
  });
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadCsv = (content: string, filename: string) => {
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
};

export const buildCsv = (rows: RelatorioLinha[], subtitulo: string) => {
  const lines = ["Relatório de Atendimentos Técnicos", subtitulo, "", relatorioColunas.map((coluna) => coluna.title).join(",")];
  rows.forEach((row) => {
    const values = relatorioColunas.map((coluna) => row[coluna.key] as string | number);
    lines.push(values.map((value) => escapeCsv(value)).join(","));
  });
  return `${lines.join("\n")}\n`;
};

const columnLetter = (index: number) => {
  let value = index;
  let output = "";
  while (value > 0) {
    const rem = (value - 1) % 26;
    output = String.fromCharCode(65 + rem) + output;
    value = Math.floor((value - 1) / 26);
  }
  return output;
};

export const downloadFormularioCrasXlsx = async (
  result: RelatorioAtendimentosTecnicoResult,
  filename: string,
  cabecalho: FormularioCrasCabecalho
) => {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Formulário CRAS");
  ws.columns = [{ width: 8 }, { width: 98 }, { width: 16 }];

  const periodo = `${String(result.mes_referencia).padStart(2, "0")}/${result.ano_referencia}`;
  ws.mergeCells("A1:B1");
  ws.getCell("A1").value = "FORMULÁRIO DE REGISTRO MENSAL DE ATENDIMENTOS DO CRAS";
  ws.getCell("A1").font = { bold: true, size: 12 };
  ws.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: FORM_COLOR_LIGHT } };
  ws.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };

  ws.getCell("C1").value = `MÊS: ${periodo}`;
  ws.getCell("C1").font = { bold: true, size: 12 };
  ws.getCell("C1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: FORM_COLOR_LIGHT } };
  ws.getCell("C1").alignment = { vertical: "middle", horizontal: "center" };

  ["A1", "B1", "C1"].forEach((ref) => {
    ws.getCell(ref).border = {
      top: { style: "thin", color: { argb: FORM_COLOR_BORDER } },
      left: { style: "thin", color: { argb: FORM_COLOR_BORDER } },
      bottom: { style: "thin", color: { argb: FORM_COLOR_BORDER } },
      right: { style: "thin", color: { argb: FORM_COLOR_BORDER } },
    };
  });

  ws.mergeCells("A3:C3");
  ws.getCell("A3").value = `Nome da Unidade: ${cabecalho.unidadeNome}`;
  ws.mergeCells("A4:C4");
  ws.getCell("A4").value = `Endereço: ${cabecalho.endereco}`;
  ws.mergeCells("A5:C5");
  ws.getCell("A5").value = `Município: ${cabecalho.municipio}    UF: ${cabecalho.uf}`;

  const addBlockTitle = (rowIndex: number, title: string) => {
    ws.mergeCells(`A${rowIndex}:C${rowIndex}`);
    ws.getCell(`A${rowIndex}`).value = title;
    ws.getCell(`A${rowIndex}`).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    ws.getCell(`A${rowIndex}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: FORM_COLOR_DARK } };
  };

  addBlockTitle(7, "Bloco 1 - Famílias em acompanhamento pelo PAIF");
  const rows = buildFormularioRows(result);
  let currentRow = 8;
  rows.forEach((item) => {
    if (item.code === "C.") {
      addBlockTitle(currentRow, "Bloco 2 - Atendimentos particularizados realizados no CRAS");
      currentRow += 1;
    }
    if (item.code === "D.") {
      addBlockTitle(currentRow, "Bloco 3 - Atendimentos coletivos realizados no CRAS");
      currentRow += 1;
    }

    ws.getCell(`A${currentRow}`).value = item.code;
    ws.getCell(`B${currentRow}`).value = item.label;
    ws.getCell(`C${currentRow}`).value = item.total;

    const fillColor = item.isSection ? FORM_COLOR_LIGHT : undefined;
    ["A", "B", "C"].forEach((col) => {
      const cell = ws.getCell(`${col}${currentRow}`);
      if (fillColor) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
        cell.font = { bold: true };
      }
      cell.border = {
        top: { style: "thin", color: { argb: FORM_COLOR_BORDER } },
        left: { style: "thin", color: { argb: FORM_COLOR_BORDER } },
        bottom: { style: "thin", color: { argb: FORM_COLOR_BORDER } },
        right: { style: "thin", color: { argb: FORM_COLOR_BORDER } },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: col === "C" ? "center" : "left",
        wrapText: true,
      };
    });
    currentRow += 1;
  });

  ws.views = [{ state: "frozen", ySplit: 8 }];
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, filename);
};

export const downloadFormularioCrasDocx = async (
  result: RelatorioAtendimentosTecnicoResult,
  filename: string,
  cabecalho: FormularioCrasCabecalho
) => {
  const docx = await import("docx");
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    TextRun,
    WidthType,
  } = docx;

  const periodo = `${String(result.mes_referencia).padStart(2, "0")}/${result.ano_referencia}`;
  const rows = buildFormularioRows(result);
  const bloco1 = rows.filter((item) => item.code.startsWith("A.") || item.code.startsWith("B."));
  const bloco2 = rows.filter((item) => item.code.startsWith("C."));
  const bloco3 = rows.filter((item) => item.code.startsWith("D."));

  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 1, color: "1F2937" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "1F2937" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "1F2937" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "1F2937" },
  };

  const headerTable = new Table({
    layout: TableLayoutType.FIXED,
    columnWidths: [900, 6750, 1350],
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            width: { size: 7650, type: WidthType.DXA },
            shading: { fill: "92D050", type: ShadingType.CLEAR, color: "auto" },
            borders: cellBorders,
            children: [new Paragraph({ children: [new TextRun({ text: "FORMULÁRIO DE REGISTRO MENSAL DE ATENDIMENTOS DO CRAS", bold: true })] })],
          }),
          new TableCell({
            width: { size: 1350, type: WidthType.DXA },
            shading: { fill: "92D050", type: ShadingType.CLEAR, color: "auto" },
            borders: cellBorders,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `MÊS: ${periodo}`, bold: true })] })],
          }),
        ],
      }),
    ],
  });

  const buildMetricTable = (items: FormularioMetricRow[]) => new Table({
    layout: TableLayoutType.FIXED,
    columnWidths: [900, 6750, 1350],
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: items.map((item) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 900, type: WidthType.DXA },
            borders: cellBorders,
            shading: item.isSection ? { fill: "92D050", type: ShadingType.CLEAR, color: "auto" } : undefined,
            children: [new Paragraph({ children: [new TextRun({ text: item.code, bold: Boolean(item.isSection) })] })],
          }),
          new TableCell({
            width: { size: 6750, type: WidthType.DXA },
            borders: cellBorders,
            shading: item.isSection ? { fill: "92D050", type: ShadingType.CLEAR, color: "auto" } : undefined,
            children: [new Paragraph({ children: [new TextRun({ text: item.label, bold: Boolean(item.isSection) })] })],
          }),
          new TableCell({
            width: { size: 1350, type: WidthType.DXA },
            borders: cellBorders,
            shading: item.isSection ? { fill: "D8E4BC", type: ShadingType.CLEAR, color: "auto" } : undefined,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.total), bold: Boolean(item.isSection) })] })],
          }),
        ],
      })
    ),
  });

  const document = new Document({
    sections: [
      {
        children: [
          headerTable,
          new Paragraph({ text: "" }),
          new Paragraph({ children: [new TextRun(`Nome da Unidade: ${cabecalho.unidadeNome}`)] }),
          new Paragraph({ children: [new TextRun(`Endereço: ${cabecalho.endereco}`)] }),
          new Paragraph({ children: [new TextRun(`Município: ${cabecalho.municipio}    UF: ${cabecalho.uf}`)] }),
          new Paragraph({ text: "" }),
          new Paragraph({
            shading: { fill: "006100", type: ShadingType.CLEAR, color: "auto" },
            children: [new TextRun({ text: "Bloco 1 - Famílias em acompanhamento pelo PAIF", bold: true, color: "FFFFFF" })],
          }),
          buildMetricTable(bloco1),
          new Paragraph({ text: "" }),
          new Paragraph({
            shading: { fill: "006100", type: ShadingType.CLEAR, color: "auto" },
            children: [new TextRun({ text: "Bloco 2 - Atendimentos particularizados realizados no CRAS", bold: true, color: "FFFFFF" })],
          }),
          buildMetricTable(bloco2),
          new Paragraph({ text: "" }),
          new Paragraph({
            shading: { fill: "006100", type: ShadingType.CLEAR, color: "auto" },
            children: [new TextRun({ text: "Bloco 3 - Atendimentos coletivos realizados no CRAS", bold: true, color: "FFFFFF" })],
          }),
          buildMetricTable(bloco3),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  downloadBlob(blob, filename);
};

export const buildGenericReportXlsx = async (rows: RelatorioLinha[], filename: string, subtitulo: string) => {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema CRAS";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Relatório");
  const totalColunas = relatorioColunas.length;
  const lastCol = columnLetter(totalColunas);

  worksheet.mergeCells(`A1:${lastCol}1`);
  worksheet.getCell("A1").value = "Relatório de Atendimentos Técnicos";
  worksheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEA580C" } };

  worksheet.mergeCells(`A2:${lastCol}2`);
  worksheet.getCell("A2").value = subtitulo;
  worksheet.getCell("A2").font = { size: 11, color: { argb: "FF334155" } };
  worksheet.getCell("A2").alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

  const headerRowIndex = 4;
  relatorioColunas.forEach((coluna, idx) => {
    const colNumber = idx + 1;
    const cell = worksheet.getCell(headerRowIndex, colNumber);
    cell.value = coluna.title;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };

    worksheet.getColumn(colNumber).width = coluna.width;
  });

  rows.forEach((row, rowIndex) => {
    const excelRowIndex = headerRowIndex + 1 + rowIndex;
    const isEven = rowIndex % 2 === 0;
    relatorioColunas.forEach((coluna, colIndex) => {
      const cell = worksheet.getCell(excelRowIndex, colIndex + 1);
      cell.value = row[coluna.key] as string | number;
      cell.alignment = {
        vertical: "middle",
        horizontal: colIndex >= 4 ? "center" : "left",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      if (isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
    });
  });

  worksheet.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex, column: totalColunas },
  };
  worksheet.views = [{ state: "frozen", ySplit: headerRowIndex }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, filename);
};
