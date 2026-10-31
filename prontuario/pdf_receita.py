"""Gera o PDF do receituário entregue ao cidadão.

Sem diagnóstico, como na área do cidadão: o arquivo pode ser repassado pelo chat do agente.
"""

from io import BytesIO
from xml.sax.saxutils import escape

from django.utils import timezone
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from agendamentos.services import formatar_endereco_unidade

LARGURA, ALTURA = A4
MARGEM = 16 * mm
ALTURA_CABECALHO = 38 * mm
LARGURA_UTIL = LARGURA - 2 * MARGEM

VERDE = colors.HexColor("#0F766E")
VERDE_ESCURO = colors.HexColor("#134E4A")
VERDE_CLARO = colors.HexColor("#CCFBF1")
FUNDO = colors.HexColor("#F8FAFC")
BORDA = colors.HexColor("#E2E8F0")
TEXTO = colors.HexColor("#0F172A")
TEXTO_SUAVE = colors.HexColor("#64748B")
VERMELHO = colors.HexColor("#B91C1C")
VERMELHO_CLARO = colors.HexColor("#FEE2E2")
AMBAR = colors.HexColor("#B45309")
AMBAR_CLARO = colors.HexColor("#FEF3C7")


def _estilo(nome, **kwargs):
    base = {"fontName": "Helvetica", "fontSize": 9.5, "leading": 13, "textColor": TEXTO}
    base.update(kwargs)
    return ParagraphStyle(nome, **base)


ROTULO = _estilo("rotulo", fontName="Helvetica-Bold", fontSize=7, leading=9, textColor=TEXTO_SUAVE)
VALOR = _estilo("valor", fontName="Helvetica-Bold", fontSize=10.5, leading=13)
SECAO = _estilo("secao", fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=VERDE_ESCURO)
NOME_MEDICAMENTO = _estilo("nome_med", fontName="Helvetica-Bold", fontSize=11.5, leading=14)
INSTRUCAO = _estilo("instrucao", fontName="Helvetica-Oblique", fontSize=9, leading=12, textColor=TEXTO_SUAVE)
CORPO = _estilo("corpo")
ASSINATURA = _estilo("assinatura", fontName="Helvetica-Bold", fontSize=10, alignment=TA_CENTER)
ASSINATURA_CARGO = _estilo("assinatura_cargo", fontSize=8.5, textColor=TEXTO_SUAVE, alignment=TA_CENTER)
AVISO = _estilo("aviso", fontSize=8, leading=11, textColor=TEXTO_SUAVE)


def _texto(valor):
    return escape(str(valor)) if valor not in (None, "") else "-"


def _formatar_cpf(cpf):
    digitos = "".join(c for c in cpf or "" if c.isdigit())
    if len(digitos) != 11:
        return cpf or "-"
    return f"{digitos[:3]}.{digitos[3:6]}.{digitos[6:9]}-{digitos[9:]}"


def codigo_receita(receita):
    return str(receita.id).split("-")[0].upper()


class _Selo(Flowable):
    """Etiqueta arredondada (ex.: "Válida", "Controlado")."""

    def __init__(self, texto, cor_texto, cor_fundo, tamanho=7.5):
        super().__init__()
        self.texto, self.cor_texto, self.cor_fundo, self.tamanho = texto.upper(), cor_texto, cor_fundo, tamanho
        self.width = self._largura_texto() + 4 * mm
        self.height = self.tamanho + 3.2 * mm

    def _largura_texto(self):
        return stringWidth(self.texto, "Helvetica-Bold", self.tamanho)

    def wrap(self, *args):
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(self.cor_fundo)
        c.roundRect(0, 0, self.width, self.height, self.height / 2, stroke=0, fill=1)
        c.setFillColor(self.cor_texto)
        c.setFont("Helvetica-Bold", self.tamanho)
        c.drawCentredString(self.width / 2, (self.height - self.tamanho) / 2 + 1.2, self.texto)


class _BarraDispensacao(Flowable):
    """Progresso da retirada do item: quanto já foi dispensado do total prescrito."""

    def __init__(self, dispensada, prescrita, largura):
        super().__init__()
        self.dispensada, self.prescrita = dispensada, prescrita
        self.width, self.height = largura, 9 * mm

    def wrap(self, *args):
        return self.width, self.height

    def draw(self):
        c = self.canv
        proporcao = min(self.dispensada / self.prescrita, 1) if self.prescrita else 0
        c.setFont("Helvetica", 7.5)
        c.setFillColor(TEXTO_SUAVE)
        c.drawString(0, 6 * mm, f"Retirado: {self.dispensada} de {self.prescrita}")
        c.setFillColor(BORDA)
        c.roundRect(0, 1.5 * mm, self.width, 2.2 * mm, 1.1 * mm, stroke=0, fill=1)
        if proporcao:
            c.setFillColor(VERDE)
            c.roundRect(0, 1.5 * mm, max(self.width * proporcao, 2.2 * mm), 2.2 * mm, 1.1 * mm, stroke=0, fill=1)


class _Numero(Flowable):
    def __init__(self, numero):
        super().__init__()
        self.numero = str(numero)
        self.width = self.height = 8 * mm

    def wrap(self, *args):
        return self.width, self.height

    def draw(self):
        c = self.canv
        raio = self.width / 2
        c.setFillColor(VERDE)
        c.circle(raio, raio, raio, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(raio, raio - 3.5, self.numero)


def _qr_code(conteudo, tamanho):
    widget = QrCodeWidget(conteudo)
    widget.barFillColor = VERDE_ESCURO
    x1, y1, x2, y2 = widget.getBounds()
    desenho = Drawing(tamanho, tamanho, transform=[tamanho / (x2 - x1), 0, 0, tamanho / (y2 - y1), 0, 0])
    desenho.add(widget)
    return desenho


def _cartao(conteudo, largura, fundo=colors.white, borda=BORDA, padding=9):
    tabela = Table([[conteudo]], colWidths=[largura])
    tabela.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), fundo),
                ("BOX", (0, 0), (-1, -1), 0.8, borda),
                ("ROUNDEDCORNERS", [6, 6, 6, 6]),
                ("LEFTPADDING", (0, 0), (-1, -1), padding),
                ("RIGHTPADDING", (0, 0), (-1, -1), padding),
                ("TOPPADDING", (0, 0), (-1, -1), padding),
                ("BOTTOMPADDING", (0, 0), (-1, -1), padding),
            ]
        )
    )
    return tabela


def _campo(rotulo, valor):
    return [Paragraph(rotulo.upper(), ROTULO), Paragraph(valor, VALOR)]


def _sem_bordas(tabela, extra=()):
    tabela.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                *extra,
            ]
        )
    )
    return tabela


def _bloco_paciente(receita):
    cidadao = receita.cidadao
    emissao = timezone.localtime(receita.data_emissao)
    validade = receita.data_validade.strftime("%d/%m/%Y") if receita.data_validade else "-"
    selo = _Selo("Vencida", VERMELHO, VERMELHO_CLARO) if receita.vencida else _Selo("Válida", VERDE, VERDE_CLARO)

    coluna = (LARGURA_UTIL - 20 - 30 * mm) / 2
    dados = Table(
        [
            [_campo("Paciente", _texto(cidadao.nome)), _campo("CPF", _formatar_cpf(cidadao.cpf))],
            [
                _campo("Emitida em", emissao.strftime("%d/%m/%Y às %H:%M")),
                [Paragraph("VÁLIDA ATÉ", ROTULO), _sem_bordas(Table([[Paragraph(validade, VALOR), selo]],
                                                                     colWidths=[24 * mm, None]),
                                                               [("VALIGN", (0, 0), (-1, -1), "MIDDLE")])],
            ],
        ],
        colWidths=[coluna, coluna],
    )
    _sem_bordas(dados, [("BOTTOMPADDING", (0, 0), (-1, 0), 8)])

    qr = _qr_code(f"SAUDEPERTO:RECEITA:{receita.id}", 26 * mm)
    codigo = [qr, Paragraph(f"Nº {codigo_receita(receita)}", _estilo("cod", fontName="Courier-Bold",
                                                                     fontSize=8, alignment=TA_CENTER))]
    linha = _sem_bordas(Table([[dados, codigo]], colWidths=[coluna * 2, 30 * mm]),
                        [("ALIGN", (1, 0), (1, 0), "CENTER")])
    return _cartao(linha, LARGURA_UTIL, fundo=FUNDO)


def _bloco_item(indice, item):
    largura_conteudo = LARGURA_UTIL - 20 - 12 * mm
    titulo = [Paragraph(_texto(item.nome), NOME_MEDICAMENTO)]
    if item.medicamento_id and item.medicamento.controlado:
        titulo = [_sem_bordas(Table([[Paragraph(_texto(item.nome), NOME_MEDICAMENTO),
                                      _Selo("Controlado", AMBAR, AMBAR_CLARO)]],
                                    colWidths=[largura_conteudo - 26 * mm, 26 * mm]),
                              [("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (1, 0), (1, 0), "RIGHT")])]

    quarto = largura_conteudo / 4
    detalhes = _sem_bordas(
        Table(
            [[
                _campo("Dosagem", _texto(item.dosagem)),
                _campo("Frequência", _texto(item.frequencia)),
                _campo("Duração", _texto(item.duracao)),
                _campo("Quantidade", _texto(item.quantidade_prescrita)),
            ]],
            colWidths=[quarto] * 4,
        )
    )
    conteudo = [*titulo, Spacer(0, 5), detalhes]
    if item.instrucoes:
        conteudo += [Spacer(0, 6), Paragraph(f"&ldquo;{_texto(item.instrucoes)}&rdquo;", INSTRUCAO)]
    if item.quantidade_prescrita:
        conteudo += [Spacer(0, 4), _BarraDispensacao(item.quantidade_dispensada, item.quantidade_prescrita,
                                                     largura_conteudo)]

    linha = _sem_bordas(Table([[_Numero(indice), conteudo]], colWidths=[12 * mm, largura_conteudo]))
    return KeepTogether([_cartao(linha, LARGURA_UTIL), Spacer(0, 6)])


def _bloco_assinatura(receita):
    nome = receita.profissional.nome_completo if receita.profissional_id else "Profissional responsável"
    assinatura = _sem_bordas(
        Table(
            [[Paragraph(_texto(nome), ASSINATURA)], [Paragraph("Profissional prescritor(a)", ASSINATURA_CARGO)]],
            colWidths=[80 * mm],
        ),
        [("LINEABOVE", (0, 0), (-1, 0), 0.8, TEXTO), ("TOPPADDING", (0, 0), (-1, 0), 4)],
    )
    centralizada = Table([[assinatura]], colWidths=[LARGURA_UTIL])
    centralizada.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    return KeepTogether([Spacer(0, 13 * mm), centralizada])


def _desenhar_moldura(receita):
    unidade = receita.agendamento.unidade
    gerado_em = timezone.localtime().strftime("%d/%m/%Y às %H:%M")

    def desenhar(canvas, doc):
        canvas.saveState()
        topo = ALTURA - ALTURA_CABECALHO

        canvas.saveState()
        faixa = canvas.beginPath()
        faixa.rect(0, topo, LARGURA, ALTURA_CABECALHO)
        canvas.clipPath(faixa, stroke=0, fill=0)
        canvas.setFillColor(VERDE)
        canvas.rect(0, topo, LARGURA, ALTURA_CABECALHO, stroke=0, fill=1)
        # Círculos decorativos no canto direito, recortados pela faixa do cabeçalho.
        canvas.setFillColor(VERDE_ESCURO)
        canvas.circle(LARGURA - 18 * mm, ALTURA - 4 * mm, 30 * mm, stroke=0, fill=1)
        canvas.setFillColor(colors.HexColor("#14B8A6"))
        canvas.circle(LARGURA - 2 * mm, topo + 4 * mm, 16 * mm, stroke=0, fill=1)
        canvas.restoreState()

        # Logotipo: cruz branca dentro de um quadrado arredondado.
        x, y, lado = MARGEM, ALTURA - 27 * mm, 14 * mm
        canvas.setFillColor(colors.white)
        canvas.roundRect(x, y, lado, lado, 3 * mm, stroke=0, fill=1)
        canvas.setFillColor(VERDE)
        braco, espessura = 9 * mm, 3 * mm
        canvas.rect(x + (lado - espessura) / 2, y + (lado - braco) / 2, espessura, braco, stroke=0, fill=1)
        canvas.rect(x + (lado - braco) / 2, y + (lado - espessura) / 2, braco, espessura, stroke=0, fill=1)

        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 20)
        canvas.drawString(x + lado + 5 * mm, y + 7 * mm, "Receituário")
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(VERDE_CLARO)
        canvas.drawString(x + lado + 5 * mm, y + 2 * mm, "SAÚDE PERTO  ·  Atenção Básica")

        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 10.5)
        canvas.drawRightString(LARGURA - MARGEM, y + 9 * mm, unidade.nome)
        canvas.setFont("Helvetica", 7.5)
        endereco = formatar_endereco_unidade(unidade)
        if len(endereco) > 70:
            endereco = endereco[:67] + "..."
        canvas.drawRightString(LARGURA - MARGEM, y + 5 * mm, endereco)
        contato = "  ·  ".join(p for p in (unidade.telefone, unidade.email) if p)
        canvas.drawRightString(LARGURA - MARGEM, y + 1.5 * mm, contato)

        canvas.setStrokeColor(BORDA)
        canvas.setLineWidth(0.6)
        canvas.line(MARGEM, 14 * mm, LARGURA - MARGEM, 14 * mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(TEXTO_SUAVE)
        canvas.drawString(MARGEM, 9 * mm, f"Receita nº {codigo_receita(receita)}  ·  Gerada em {gerado_em}")
        canvas.drawRightString(LARGURA - MARGEM, 9 * mm, f"Página {doc.page}")
        canvas.restoreState()

    return desenhar


class _DocumentoReceita(SimpleDocTemplate):
    def __init__(self, *args, vencida=False, **kwargs):
        super().__init__(*args, **kwargs)
        self.vencida = vencida

    def afterPage(self):
        # Depois do conteúdo, para a marca d'água ficar por cima dos cartões.
        if not self.vencida:
            return
        canvas = self.canv
        canvas.saveState()
        canvas.setFillColor(VERMELHO)
        canvas.setFillAlpha(0.1)
        canvas.translate(LARGURA / 2, ALTURA / 2)
        canvas.rotate(35)
        canvas.setFont("Helvetica-Bold", 110)
        canvas.drawCentredString(0, -30, "VENCIDA")
        canvas.restoreState()


def gerar_pdf_receita(receita):
    """Devolve os bytes do PDF da receita, já com os medicamentos e a unidade carregados."""
    buffer = BytesIO()
    doc = _DocumentoReceita(
        buffer,
        vencida=receita.vencida,
        pagesize=A4,
        leftMargin=MARGEM,
        rightMargin=MARGEM,
        topMargin=ALTURA_CABECALHO + 8 * mm,
        bottomMargin=20 * mm,
        title=f"Receita {codigo_receita(receita)}",
        author="Saúde Perto",
        subject=f"Receituário de {receita.cidadao.nome}",
    )

    historia = [_bloco_paciente(receita), Spacer(0, 7 * mm), Paragraph("PRESCRIÇÃO", SECAO), Spacer(0, 4)]
    itens = list(receita.medicamentos.all())
    historia += [_bloco_item(indice, item) for indice, item in enumerate(itens, start=1)]
    if not itens:
        historia.append(Paragraph("Nenhum medicamento prescrito.", CORPO))

    if receita.observacoes:
        historia += [
            Spacer(0, 4),
            _cartao(
                [Paragraph("OBSERVAÇÕES", ROTULO), Spacer(0, 3), Paragraph(_texto(receita.observacoes), CORPO)],
                LARGURA_UTIL,
                fundo=AMBAR_CLARO,
                borda=colors.HexColor("#FDE68A"),
            ),
        ]

    historia.append(_bloco_assinatura(receita))
    historia += [
        Spacer(0, 6 * mm),
        Paragraph(
            "Retire os medicamentos em uma unidade do Saúde Perto dentro do prazo de validade, levando "
            "um documento com foto. Use os medicamentos conforme a orientação do profissional e não "
            "interrompa o tratamento sem orientação. O QR code identifica esta receita na farmácia da unidade.",
            AVISO,
        ),
    ]

    doc.build(historia, onFirstPage=_desenhar_moldura(receita), onLaterPages=_desenhar_moldura(receita))
    return buffer.getvalue()
