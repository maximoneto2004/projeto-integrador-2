import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { ServicoConfigurado } from "../../types/servicos";

interface ServicosTabelaProps {
  servicos: ServicoConfigurado[];
  onEdit: (servico: ServicoConfigurado, index: number) => void;
  onDelete: (servico: ServicoConfigurado, index: number) => void;
}

export function ServicosTabela({ servicos, onEdit }: ServicosTabelaProps) {
  return (
    <div className="bg-card rounded-2xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="px-6 py-4 text-left font-bold text-foreground">Serviço</th>
              <th className="px-6 py-4 text-left font-bold text-foreground">Tipo</th>
              <th className="px-6 py-4 text-left font-bold text-foreground">Dias da Semana</th>
              <th className="px-6 py-4 text-left font-bold text-foreground">Horários</th>
              <th className="px-6 py-4 text-left font-bold text-foreground">Status</th>
              <th className="px-6 py-4 text-left font-bold text-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {servicos.map((servico, index) => (
              <tr key={servico.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                <td className="px-6 py-4 text-foreground font-medium">{servico.nome}</td>
                <td className="px-6 py-4">
                  <Badge variant={servico.tipo === "Especializado" ? "secondary" : "outline"}>
                    {servico.tipo}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-foreground">{servico.diasSemana.join(", ")}</td>
                <td className="px-6 py-4 text-sm text-foreground">{servico.horarios}</td>
                <td className="px-6 py-4">
                  <Badge variant={servico.ativo ? "default" : "secondary"}>
                    {servico.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(servico, index)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
