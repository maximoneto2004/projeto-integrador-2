import { useState, type ReactNode } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CardExpansivelProps = {
  titulo: string;
  descricao?: ReactNode;
  // Quantos itens o card mostra e quantos existem; o botão só aparece quando há itens escondidos.
  exibidos: number;
  total: number;
  rotuloItens: string;
  children: ReactNode;
  // Conteúdo completo, renderizado só quando o modal está aberto.
  expandido: () => ReactNode;
  className?: string;
  contentClassName?: string;
};

// Card de gráfico/tabela que mostra os principais resultados e abre o conjunto completo em um modal,
// para que o painel não cresça sem limite conforme a rede ganha unidades e serviços.
export function CardExpansivel({ titulo, descricao, exibidos, total, rotuloItens, children, expandido, className, contentClassName }: CardExpansivelProps) {
  const [aberto, setAberto] = useState(false);
  const temMais = total > exibidos;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1.5">
          <CardTitle>{titulo}</CardTitle>
          {descricao && <CardDescription>{descricao}</CardDescription>}
        </div>
        {temMais && (
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => setAberto(true)}>
            <Maximize2 className="h-3.5 w-3.5" />
            {/* Ver todos ({total}) */}
          </Button>
        )}
      </CardHeader>
      <CardContent className={contentClassName}>
        {children}
        {temMais && (
          <p className="mt-3 text-xs text-muted-foreground">
            Mostrando {exibidos} de {total} {rotuloItens}.
          </p>
        )}
      </CardContent>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            {descricao && <DialogDescription>{descricao}</DialogDescription>}
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto pr-1">{aberto && expandido()}</div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
