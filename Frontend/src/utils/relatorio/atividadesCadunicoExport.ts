import type {
  RelatorioAtividadesCadUnicoGrupo,
  RelatorioAtividadesCadUnicoResult,
} from "@/services/sistema/relatorioService";

const GROUP_KEY_ORDER = ["cadastro_unico", "bolsa_familia"] as const;

const GROUP_LABELS: Record<string, string> = {
  cadastro_unico: "CADASTRO ÚNICO",
  bolsa_familia: "BOLSA FAMÍLIA",
};

const TEMPLATE_SERVICOS: Record<string, string[]> = {
  cadastro_unico: [
    "Nº de atendimentos realizados (famílias orientadas, consultas realizadas, emissão de declarações, cadastramento, etc.)",
    "Nº de cadastros novas inscrições (Inclusão/1° Vez)",
    "Nº de cadastros atualização cadastral",
    "Nº de cadastros mudança de município",
    "Nº de cadastros mudança de titularidade",
    "Nº de cadastros preenchidos com visita domiciliar",
    "Nº de atendimentos realizados (solicitações de Certidões de Nascimento/Casamento)",
    "Nº de emissão de Declarações de NIS/ Consulta Cidadão",
    "Nº de emissão de Declarações da Gratuidade para Pessoa com Deficiência",
    "Nº de emissão de Declarações para Carteira do Idoso",
    "Nº de cadastros para digitação com pendência na Unidade",
    "Nº de cadastros manuais digitados(nova inscrição e mudança de município)",
    "Nº de cadastros manuais digitados(atualização cadastral e mudança de titularidade)",
    "Nº de cadastros preenchidos manualmente que faltam ser digitados",
  ],
  bolsa_familia: [
    "N° de famílias acompanhadas inseridas no SICON",
    "Nº de recursos OnLine deferidos",
    "Nº de recursos OnLine indeferidos",
    "Nº de famílias que foram realizadas interrupções de efeitos de benefícios no SICON",
    "Nº de encontros socioeducativos realizados",
    "Nº de famílias que participaram dos encontros socioeducativos realizados",
    "Bloqueios realizados",
    "Desbloqueios realizados",
    "Reversão de suspensão de Benefício",
    "Reversões de cancelamento realizadas",
    "Nº de famílias (gestões FGB) encaminhadas para Célula de Benefícios",
  ],
};

const MONTHS = [
  { nome: "Janeiro", abbr: "Jan" },
  { nome: "Fevereiro", abbr: "Fev" },
  { nome: "Março", abbr: "Mar" },
  { nome: "Abril", abbr: "Abr" },
  { nome: "Maio", abbr: "Mai" },
  { nome: "Junho", abbr: "Jun" },
  { nome: "Julho", abbr: "Jul" },
  { nome: "Agosto", abbr: "Ago" },
  { nome: "Setembro", abbr: "Set" },
  { nome: "Outubro", abbr: "Out" },
  { nome: "Novembro", abbr: "Nov" },
  { nome: "Dezembro", abbr: "Dez" },
] as const;

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

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const getGroupEntries = (result: RelatorioAtividadesCadUnicoResult) => {
  const entries: Array<{ key: string; grupo: RelatorioAtividadesCadUnicoGrupo }> = [];
  const grupos = result.grupos_servicos ?? {};

  GROUP_KEY_ORDER.forEach((key) => {
    const grupo = grupos[key] || { indicador: GROUP_LABELS[key], servicos: [] };
    entries.push({ key, grupo });
  });

  Object.entries(grupos).forEach(([key, grupo]) => {
    if (!GROUP_KEY_ORDER.includes(key as (typeof GROUP_KEY_ORDER)[number])) {
      entries.push({ key, grupo });
    }
  });

  return entries;
};

const getTemplateRows = (groupKey: string, grupo: RelatorioAtividadesCadUnicoGrupo) => {
  const baseRows = TEMPLATE_SERVICOS[groupKey] ?? [];
  const rows = baseRows.map((label, index) => ({
    label,
    sourceIndex: index,
  }));

  if (grupo.servicos.length > baseRows.length) {
    for (let index = baseRows.length; index < grupo.servicos.length; index += 1) {
      rows.push({
        label: grupo.servicos[index]?.nome || `Serviço ${index + 1}`,
        sourceIndex: index,
      });
    }
  }

  return rows;
};

const getDayValue = (
  grupo: RelatorioAtividadesCadUnicoGrupo,
  serviceIndex: number,
  day: number
) => {
  const value = grupo.servicos[serviceIndex]?.valores?.[`dia_${day}`];
  return typeof value === "number" ? value : null;
};

const escapeCsv = (value: string | number | null | undefined) => {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
    return `"${raw.replace(/"/g, "\"\"")}"`;
  }
  return raw;
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

export const downloadAtividadesCadunicoCsv = (
  result: RelatorioAtividadesCadUnicoResult,
  filename: string,
  unidadeNome: string
) => {
  const lines: string[] = [];
  lines.push(`RELATÓRIO DE ATIVIDADES MENSAIS ${result.ano_referencia} CADÚNICO/PBF`);
  lines.push(
    `Período: ${String(result.mes_referencia).padStart(2, "0")}/${result.ano_referencia} | Unidade: ${unidadeNome}`
  );
  lines.push("");

  const entries = getGroupEntries(result);
  entries.forEach(({ key, grupo }, sectionIndex) => {
    if (sectionIndex > 0) lines.push("");
    const groupLabel = GROUP_LABELS[key] || grupo.indicador?.toUpperCase() || key.toUpperCase();
    const monthDays = getDaysInMonth(result.ano_referencia, result.mes_referencia);
    lines.push(groupLabel);
    lines.push(["AÇÃO", ...Array.from({ length: monthDays }, (_, i) => String(i + 1)), "Total Geral"].join(","));

    const rows = getTemplateRows(key, grupo);
    rows.forEach(({ label, sourceIndex }) => {
      const values = Array.from({ length: monthDays }, (_, i) => getDayValue(grupo, sourceIndex, i + 1));
      const total = values.reduce((acc, item) => acc + (typeof item === "number" ? item : 0), 0);
      lines.push(
        [
          escapeCsv(label),
          ...values.map((v) => (typeof v === "number" ? String(v) : "")),
          total ? String(total) : "",
        ].join(",")
      );
    });
  });

  const blob = new Blob([`\uFEFF${lines.join("\n")}\n`], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
};

export const downloadAtividadesCadunicoXlsx = async (
  result: RelatorioAtividadesCadUnicoResult,
  filename: string,
  unidadeNome?: string
) => {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("DIÁRIO");

  const year = result.ano_referencia;
  const selectedMonth = result.mes_referencia;

  const entries = getGroupEntries(result);

  const monthLayouts = (() => {
    const layouts: Array<{
      monthNumber: number;
      monthName: string;
      monthAbbr: string;
      days: number;
      startCol: number;
      endCol: number;
      totalCol: number;
    }> = [];

    let col = 3; // começa em C
    for (let month = 1; month <= 12; month += 1) {
      const days = getDaysInMonth(year, month);
      const startCol = col;
      const endCol = startCol + days - 1;
      const totalCol = endCol + 1;

      layouts.push({
        monthNumber: month,
        monthName: MONTHS[month - 1].nome,
        monthAbbr: MONTHS[month - 1].abbr,
        days,
        startCol,
        endCol,
        totalCol,
      });

      col = totalCol + 1;
    }

    return layouts;
  })();

  const lastCol = monthLayouts[monthLayouts.length - 1].totalCol;
  const lastColLetter = columnLetter(lastCol);

  const fillHeader = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FF4CB8C4" },
  };

  const fillSection = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FF4CB8C4" },
  };

  const fillLabel = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FF9FDBDF" },
  };

  const borderHair = {
    top: { style: "hair" as const, color: { argb: "FF000000" } },
    left: { style: "hair" as const, color: { argb: "FF000000" } },
    bottom: { style: "hair" as const, color: { argb: "FF000000" } },
    right: { style: "hair" as const, color: { argb: "FF000000" } },
  };

  ws.views = [
    {
      state: "frozen",
      xSplit: 2,
      ySplit: 0,
      showGridLines: false,
    },
  ];
  ws.autoFilter = undefined;

  ws.getColumn(1).width = 81.13;
  ws.getColumn(2).width = 12.63;
  for (let col = 3; col <= lastCol; col += 1) {
    ws.getColumn(col).width = 13;
  }
  ws.getColumn(3).width = 8.88;

  ws.mergeCells("A1:A3");
  const titleCell = ws.getCell("A1");
  titleCell.value = `RELATÓRIO DE ATIVIDADES MENSAIS ${year}\nCADÚNICO/PBF`;
  titleCell.font = { bold: true, size: 20 };
  titleCell.alignment = { horizontal: "right", vertical: "middle", wrapText: true };
  titleCell.fill = fillHeader;

  ws.getRow(1).height = 78;
  ws.getRow(2).height = 30;
  ws.getRow(3).height = 30;
  ws.getRow(4).height = 30;

  let row = 5;

  for (const { key, grupo } of entries) {
    const groupLabel = GROUP_LABELS[key] || grupo.indicador?.toUpperCase() || key.toUpperCase();
    const templateRows = getTemplateRows(key, grupo);

    ws.mergeCells(`A${row}:${lastColLetter}${row}`);
    const sectionCell = ws.getCell(`A${row}`);
    sectionCell.value = groupLabel;
    sectionCell.font = { bold: true, size: 20 };
    sectionCell.alignment = { vertical: "middle", wrapText: true };
    sectionCell.fill = fillSection;
    sectionCell.border = {
      left: { style: "hair" as const, color: { argb: "FF000000" } },
      bottom: { style: "hair" as const, color: { argb: "FF000000" } },
    };
    ws.getRow(row).height = 30;

    const monthHeaderRow = row + 1;
    const dayHeaderRow = row + 2;

    ws.mergeCells(`A${monthHeaderRow}:A${dayHeaderRow}`);
    ws.getCell(`A${monthHeaderRow}`).value = "AÇÃO";
    ws.getCell(`A${monthHeaderRow}`).font = { bold: true, size: 12 };
    ws.getCell(`A${monthHeaderRow}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    ws.getCell(`A${monthHeaderRow}`).fill = fillHeader;
    ws.getCell(`A${monthHeaderRow}`).border = borderHair;

    ws.mergeCells(`B${monthHeaderRow}:B${dayHeaderRow}`);
    ws.getCell(`B${monthHeaderRow}`).value = "Total Geral";
    ws.getCell(`B${monthHeaderRow}`).font = { bold: true, size: 12 };
    ws.getCell(`B${monthHeaderRow}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    ws.getCell(`B${monthHeaderRow}`).fill = fillHeader;
    ws.getCell(`B${monthHeaderRow}`).border = borderHair;

    for (const layout of monthLayouts) {
      const start = columnLetter(layout.startCol);
      const end = columnLetter(layout.totalCol);

      ws.mergeCells(`${start}${monthHeaderRow}:${end}${monthHeaderRow}`);
      const monthCell = ws.getCell(`${start}${monthHeaderRow}`);
      monthCell.value = layout.monthName;
      monthCell.font = { bold: true, size: 12, color: { argb: "FF000000" } };
      monthCell.alignment = { horizontal: "left", vertical: "middle" };
      monthCell.fill = fillHeader;
      monthCell.border = borderHair;

      for (let day = 1; day <= layout.days; day += 1) {
        const col = layout.startCol + day - 1;
        const cell = ws.getCell(dayHeaderRow, col);
        cell.value = day;
        cell.font = { bold: true, size: 12, color: { argb: "FF000000" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = fillHeader;
        cell.border = borderHair;
      }

      const totalMesCell = ws.getCell(dayHeaderRow, layout.totalCol);
      totalMesCell.value = `Total/${layout.monthAbbr}`;
      totalMesCell.font = { bold: true, size: 12 };
      totalMesCell.alignment = { horizontal: "center", vertical: "middle" };
      totalMesCell.fill = fillHeader;
      totalMesCell.border = borderHair;
    }

    ws.getRow(monthHeaderRow).height = 18.75;
    ws.getRow(dayHeaderRow).height = 18.75;

    let dataRow = dayHeaderRow + 1;

    for (const { label, sourceIndex } of templateRows) {
      const servico = grupo.servicos[sourceIndex];

      const labelCell = ws.getCell(dataRow, 1);
      labelCell.value = label;
      labelCell.font = { size: 12 };
      labelCell.alignment = { vertical: "middle", wrapText: true };
      labelCell.fill = fillLabel;
      labelCell.border = borderHair;

      const totalGeralCell = ws.getCell(dataRow, 2);
      totalGeralCell.font = { bold: true, size: 12 };
      totalGeralCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      totalGeralCell.fill = fillLabel;
      totalGeralCell.border = borderHair;

      const monthTotalRefs: string[] = [];

      for (const layout of monthLayouts) {
        for (let day = 1; day <= layout.days; day += 1) {
          const col = layout.startCol + day - 1;
          const cell = ws.getCell(dataRow, col);

          const rawValue =
            servico && layout.monthNumber === selectedMonth
              ? servico.valores?.[`dia_${day}` as keyof typeof servico.valores]
              : undefined;

          cell.value = typeof rawValue === "number" ? rawValue : null;
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = borderHair;
        }

        const monthTotalCell = ws.getCell(dataRow, layout.totalCol);
        const startDayCol = columnLetter(layout.startCol);
        const endDayCol = columnLetter(layout.endCol);
        monthTotalCell.value = {
          formula: `SUM(${startDayCol}${dataRow}:${endDayCol}${dataRow})`,
        };
        monthTotalCell.font = { bold: true, size: 12 };
        monthTotalCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        monthTotalCell.border = borderHair;

        monthTotalRefs.push(`${columnLetter(layout.totalCol)}${dataRow}`);
      }

      totalGeralCell.value = {
        formula: monthTotalRefs.join("+"),
      };

      ws.getRow(dataRow).height = 30;
      dataRow += 1;
    }

    row = dataRow + 1;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  downloadBlob(blob, filename);
};
