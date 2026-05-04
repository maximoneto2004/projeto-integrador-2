interface AvisoCardProps {
  data: string;
  titulo: string;
  descricao: string;
  cor?: "laranja" | "azul" | "verde";
}

export const AvisoCard = ({ data, titulo, descricao, cor = "laranja" }: AvisoCardProps) => {
  const borderColors = {
    laranja: "border-l-primary",
    azul: "border-l-info",
    verde: "border-l-success",
  };

  return (
    <div className={`bg-card rounded-lg shadow-md p-6 border-l-4 ${borderColors[cor]} hover:shadow-lg transition-shadow`}>
      <div className="flex justify-between items-start mb-3">
        <span className="text-sm text-muted-foreground">{data}</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary">
          <path d="M8 2V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 2V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 7.5C3 5.29086 4.79086 3.5 7 3.5H17C19.2091 3.5 21 5.29086 21 7.5V18C21 20.2091 19.2091 22 17 22H7C4.79086 22 3 20.2091 3 18V7.5Z" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      </div>
      <h3 className="font-bold text-foreground mb-2">{titulo}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{descricao}</p>
    </div>
  );
};
