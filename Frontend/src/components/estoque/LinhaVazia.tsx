import { Loader2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";

export function LinhaVazia({ colunas, carregando, texto }: { colunas: number; carregando: boolean; texto: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colunas} className="py-8 text-center text-muted-foreground">
        {carregando ? (
          <>
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            Carregando...
          </>
        ) : (
          texto
        )}
      </TableCell>
    </TableRow>
  );
}
