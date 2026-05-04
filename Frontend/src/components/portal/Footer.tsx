import React from "react";
import { Link } from "react-router-dom";

import logoCitinovaCor from "@/assets/images/logo-citinova-color.png";
import logoSdhdsCor from "@/assets/images/logo-sdhds-cor.png";
import logoShds from "@/assets/images/logo-prefeitura-sdhds.png";
import logoCitinovaBranca from "@/assets/images/logo-citinova-branc.png";

export const Footer = () => {
  // Função para rolar suavemente até o topo da página
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <footer id="footer" className="mt-16">
      {/* ---- Seção Superior: Barra Laranja Escura com Botão Voltar ao Topo ---- */}
      {/* Usa bg-primary conforme solicitado para a faixa mais escura */}
      <div className="bg-primary py-3 px-4 md:px-8 flex justify-center md:justify-end items-center relative z-10">
        <button
          onClick={scrollToTop}
          className="group w-full md:w-auto flex items-center justify-center gap-2 text-white font-bold text-sm hover:text-white/90 transition-colors focus:outline-none"
          aria-label="Rolar para o topo da página"
        >
          {/* Ícone de seta para cima (SVG inline para não depender de bibliotecas externas) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:-translate-y-1 transition-transform duration-300"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m16 12-4-4-4 4" />
            <path d="m12 8v8" />
          </svg>
          Voltar Ao topo
        </button>
      </div>

      {/* ---- Seção Principal: Fundo Salmão com Logos e Texto ---- */}
      {/* Usa bg-portal-salmon conforme solicitado para o fundo principal */}
      <div className="bg-primary opacity-80 text-white py-8 px-4 md:py-12 dark:bg-portal-secondary dark:text-portal-text-strong dark:opacity-100">
        <div className="container mx-auto flex flex-col items-center text-center">
          {/* Área das Logos Genéricas (Apenas 3 conforme pedido) */}
          {/* Usando flex-wrap para garantir que se ajustem bem no mobile */}
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 md:gap-12 mb-8 w-full max-w-4xl">
            {/* Thumbnail Genérico 1 */}
            <div className="w-52 sm:w-64 md:w-80 rounded flex items-center justify-center text-white/50 text-sm font-medium">
              <img
                src={logoShds}
                alt="logo sdhds"
                className="w-full max-w-[320px] object-contain portal-image"
              />
            </div>
            {/* Thumbnail Genérico 3 */}
            <div className="w-40 sm:w-48 md:w-56 rounded flex items-center justify-center text-white/50 text-sm font-medium">
              <img
                src={logoCitinovaBranca}
                alt="logo citinova"
                className="w-full max-w-[220px] object-contain portal-image"
              />
            </div>
          </div>

          {/* Divisor sutil (opcional, baseado na imagem que parece ter uma linha tênue) */}
          <div className="w-full max-w-5xl border-t border-white/10 dark:border-portal-neutral mb-6"></div>

          {/* Área de Texto */}
          <div className="space-y-4 pt-10 text-xs sm:text-sm md:text-sm font-medium opacity-95 max-w-4xl leading-relaxed px-2">
            <p>
              © Coordenadoria Especial de Pessoas com Deficiência{" "}
              <br className="md:hidden" />
              Endereço: Rua Padre Pedro de Alencar, 2230 – Messejana <br />
              Tel: (85) 2028-0481 ou (85) 2028-0482 Fortaleza-CE - CEP:
              60.060-170
            </p>

            {/* <p>
              Imagens por{" "}
              <a
                href="https://www.freepik.com"
                target="_blank"
                rel="noopener noreferrer"
                // Cor azul clara para o link para destacar sobre o salmão
                className="text-blue-200 hover:text-white underline transition-colors dark:text-portal-detail-foreground dark:hover:text-white"
              >
                Freepik
              </a>
            </p> */}
            <p>
              <Link
                to="/termos-uso"
                className="text-blue-200 hover:text-white underline transition-colors dark:text-portal-detail-foreground dark:hover:text-white"
              >
                Termos de uso
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
