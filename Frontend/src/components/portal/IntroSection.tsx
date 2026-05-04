interface IntroSectionProps {
  title: string;
}

export function IntroSection({ title }: IntroSectionProps) {
  return (
    // 1. Define a cor de fundo principal (Laranja)
    <section className="relative bg-portal-primary dark:bg-portal-secondary text-white dark:text-portal-text-strong py-16 px-4 overflow-hidden">
      {/* 2. Container para o padrão decorativo à direita.
        Usamos CSS Grid para criar a grade 2x2 exata da imagem.
        - absolute right-0 top-0 h-full: Fixa no lado direito, ocupando toda a altura.
        - w-32 md:w-40: Define a largura total do padrão (ajustei ligeiramente para proporção).
        - grid grid-cols-2 grid-rows-2: Cria a estrutura de 2 colunas e 2 linhas.
      */}
      <div className="absolute right-0 top-0 h-full w-32 md:w-40 pointer-events-none grid grid-cols-2 grid-rows-2">
        {/* [Linha 1, Coluna 1] Topo Esquerda: Bege */}
        <div className="bg-portal-tertiary dark:bg-portal-neutral w-full h-full"></div>

        {/* [Linha 1, Coluna 2] Topo Direita: Azul */}
        <div className="bg-portal-detail dark:bg-portal-background-priority w-full h-full"></div>

        {/* [Linha 2, Coluna 1] Base Esquerda: Transparente (o fundo laranja principal aparecerá aqui) */}
        <div className="w-full h-full"></div>

        {/* [Linha 2, Coluna 2] Base Direita: Verde */}
        <div className="bg-portal-secondary dark:bg-portal-background w-full h-full"></div>
      </div>

      {/* 3. Conteúdo principal (texto) mantido sobre o fundo */}
      <div className="container mx-auto flex items-center justify-center relative z-10 pr-32 md:pr-40">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl leading-tight font-bold mb-4">{title}</h1>
        </div>
      </div>
    </section>
  );
}
