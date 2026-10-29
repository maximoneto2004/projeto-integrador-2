type Item = { rotulo: string; valor: number };

type BarrasHorizontaisProps = {
  itens: Item[];
  unidade: string;
  vazio: string;
};

// Barras em uma cor só, ordenadas pelo valor e com o número escrito ao lado.
export function BarrasHorizontais({ itens, unidade, vazio }: BarrasHorizontaisProps) {
  const maior = Math.max(0, ...itens.map((item) => item.valor));
  if (!maior) return <p className="py-8 text-center text-sm text-muted-foreground">{vazio}</p>;
  return (
    <ul className="space-y-3">
      {itens.map((item) => (
        <li key={item.rotulo} title={`${item.rotulo}: ${item.valor} ${unidade}`}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate">{item.rotulo}</span>
            <span className="tabular-nums text-muted-foreground">{item.valor}</span>
          </div>
          <div className="h-2 rounded bg-muted">
            <div className="h-2 rounded bg-primary" style={{ width: `${(item.valor / maior) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
