import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, User, Sun, Moon, Menu, X } from "lucide-react";
import logoCras from "@/assets/images/logo-cras.png";
import logoFortalezaInclusiva from "@/assets/images/logo-FortalezaInclusiva-01.png";
import logoFortalezaInclusivaBranca from "@/assets/images/logo-FortalezaInclusivaBranca-02.png";
import logoCrasBranca from "@/assets/images/logo-cras-branca.png";
import logoPrefeitura from "@/assets/images/logoPrefeitura.png";
import logoPrefeituraBranca from "@/assets/images/logo-prefeitura-branca.png";
import logoPrefeituraMobile from "@/assets/images/logoPrefeituramobile.png";
import { Button } from "@/components/ui/button";
import { FortalezaDigitalButton } from "@/components/portal/FortalezaDigitalButton";
import { CookieBanner } from "@/components/portal/CookieBanner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useScrollToAnchor } from "@/hooks/useScrollToAnchor";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getPortalCookieConsent, openPortalCookieBanner, setPortalCookieConsent } from "@/lib/portalConsent";

export const Header = () => {
  const [isDark, setIsDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [cookieLoginNoticeOpen, setCookieLoginNoticeOpen] = useState(false);
  const handleScroll = useScrollToAnchor();
  const navigate = useNavigate();
  const { login, logout, accessToken, loading, displayName } = usePortalAuth();

  const navLinks = [
    { label: "Início", to: "/" },
    { label: "Sobre", to: "#sobre" },
    { label: "Agendamento", to: "#agendamentoOnline" },
    { label: "Unidades", to: "/unidades-cras" },
    { label: "Dúvidas frequentes", to: "/duvidas-frequentes" },
  ];

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = (checked: boolean) => {
    setIsDark(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleFontSize = (action: "increase" | "decrease" | "reset") => {
    const html = document.documentElement;
    const currentSize = parseFloat(window.getComputedStyle(html).fontSize);

    if (action === "reset") {
      html.style.fontSize = "";
      return;
    }

    const newSize = action === "increase" ? currentSize + 0.5 : currentSize - 0.5;
    html.style.fontSize = `${newSize}px`;
  };

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  function handleLoginClick() {
    if (open) setOpen(false);
    if (getPortalCookieConsent() === "accepted") {
      login();
      return;
    }
    openPortalCookieBanner();
    window.setTimeout(() => setCookieLoginNoticeOpen(true), 0);
  }

  function handleAcceptCookiesAndLogin() {
    setPortalCookieConsent("accepted");
    setCookieLoginNoticeOpen(false);
    login();
  }

  function MobileSidebar({ open, onClose }) {
    return (
      <>
        {/* Overlay */}
        <div
          className={`fixed inset-0 bg-black/50 transition-opacity z-50 ${open ? "opacity-100 visible" : "opacity-0 invisible"}`}
          onClick={onClose}
        />

        {/* Sidebar */}
        <aside
          className={`fixed top-0 right-0 h-full w-64 bg-background p-6 transition-transform z-[60] ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <button onClick={onClose} className="mb-6">
            <X size={24} />
          </button>

          <nav className="flex flex-col gap-6 text-lg">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={(e) => {
                  handleScroll(e, link.to);
                  onClose();
                }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to={accessToken ? "/perfil" : "/cadastro-digital"}
              onClick={onClose}
              className="inline-flex w-full items-center gap-2 border border-primary bg-white px-3 py-2 text-base font-semibold text-primary transition-colors hover:bg-primary/10"
              aria-label={accessToken ? "Abrir perfil" : "Abrir cadastro"}
            >
              <User size={16} className="shrink-0" />
              <span className="truncate">{displayName || (accessToken ? "Perfil" : "Cadastrar")}</span>
            </Link>

            <hr />

            <div className="flex flex-col gap-2">
              {accessToken ? (
                <Button onClick={handleLogout} disabled={loading} size="sm" variant="outline" className="rounded-none font-semibold">
                  Sair
                </Button>
              ) : (
                <FortalezaDigitalButton text="Entrar" onClick={handleLoginClick} size="md" />
              )}
            </div>
          </nav>
        </aside>
      </>
    );
  }

  return (
    <>
      {/* Barra de acessibilidade  */}
      <div className="bg-portal-secondary text-portal-white py-2 px-4 text-sm">
        <div className="container mx-auto flex flex-col gap-2 lg:flex-row lg:justify-between lg:items-center">
          {/* Lado esquerdo */}
          <div className="flex flex-wrap gap-3 items-center">
            <a
              href="#conteudoCentral"
              onClick={(e) => handleScroll(e, "#conteudoCentral")}
              className="hover:underline focus:outline-none focus:ring-2 focus:ring-white rounded-sm"
            >
              Conteúdo Central
            </a>
            <a href="#footer" className="hover:underline focus:outline-none focus:ring-2 focus:ring-white rounded-sm">
              Rodapé
            </a>
            <div className="flex items-center">
              {/* Aqui você deve inserir seu componente de Switch e ícones */}
              <button
                type="button"
                onClick={() => toggleTheme(!isDark)}
                className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isDark ? "bg-secondary" : "bg-input"
                }`}
              >
                <span
                  className={`${
                    isDark ? "translate-x-7" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center`}
                >
                  {isDark ? <Moon className="h-3 w-3 text-foreground" /> : <Sun className="h-3 w-3 text-foreground" />}
                </span>
              </button>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => handleFontSize("decrease")}
                className="hover:underline focus:outline-none focus:ring-2 focus:ring-white rounded-sm"
                title="Diminuir fonte"
              >
                A-
              </button>
              <button
                onClick={() => handleFontSize("reset")}
                className="hover:underline focus:outline-none focus:ring-2 focus:ring-white rounded-sm"
                title="Tamanho padrão"
              >
                A
              </button>
              <button
                onClick={() => handleFontSize("increase")}
                className="hover:underline focus:outline-none focus:ring-2 focus:ring-white rounded-sm"
                title="Aumentar fonte"
              >
                A+
              </button>
            </div>
          </div>

          {/* Lado direito */}
          <div className="flex gap-4 overflow-x-auto whitespace-nowrap pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <a href="https://diariooficial.fortaleza.ce.gov.br/" className="hidden md:inline hover:underline">
              Diário Oficial
            </a>
            <a href="https://acessoainformacao.fortaleza.ce.gov.br/" className="hidden md:inline hover:underline">
              Acesso à informação
            </a>
            <a href="https://transparencia.fortaleza.ce.gov.br/" className="hidden md:inline hover:underline">
              Transparência
            </a>
            <a href="https://catalogodeservicos.fortaleza.ce.gov.br/" className="hidden md:inline hover:underline">
              Serviços
            </a>
            <a href="http://legislacao.fortaleza.ce.gov.br/index.php/P%C3%A1gina_principal" className="hidden md:inline hover:underline">
              Legislação
            </a>
          </div>
        </div>
      </div>

      {/* Header principal */}
      <header className="bg-portal-tertiary border-b border-border px-4 py-4 sticky top-0 z-50">
        <div className="container mx-auto items-center justify-between flex">
          {/* 🔹 ESQUERDA – Logos */}
          <div className="flex items-center gap-4">
            <img
              src={logoFortalezaInclusiva}
              alt="Logo inclusiva"
              className="hidden h-16 w-auto transform-gpu origin-center scale-125 -translate-y-2 portal-image md:block dark:hidden"
            />
            <img
              src={logoFortalezaInclusivaBranca}
              alt="Logo inclusiva"
              className="hidden h-[4.5rem] w-auto transform-gpu origin-center scale-125 -translate-y-2 portal-image md:dark:block"
            />
            <img src={logoCras} alt="Logo CRAS" className="h-14 w-auto portal-image dark:hidden" />
            <img src={logoCrasBranca} alt="Logo CRAS" className="h-14 w-auto portal-image hidden dark:block" />
            <img src={logoPrefeitura} alt="Logo Prefeitura" className="h-14 w-auto portal-image dark:hidden" />
            <img src={logoPrefeituraBranca} alt="Logo Prefeitura" className="h-10 w-auto portal-image hidden dark:block" />
          </div>

          {/* 🔹 CENTRO – Navegação (desktop) */}
          <nav className="hidden md:flex justify-center gap-8 text-md font-bold font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={(e) => handleScroll(e, link.to)}
                className="text-primary hover:text-portal-foreground font-bold"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* 🔹 DIREITA – Perfil + Menu mobile */}
          <div className="flex justify-end items-center gap-4">
            {/* Perfil desktop */}
            <div className="hidden md:flex items-center gap-2">
              <Link
                to={accessToken ? "/perfil" : "/cadastro-digital"}
                className="flex items-center gap-2 px-3 py-2 rounded-none border border-primary text-primary font-semibold bg-white/70 hover:bg-white hover:text-primary shadow-sm transition-colors"
                aria-label="Abrir perfil"
              >
                <User size={16} />
                {displayName}
              </Link>
              {accessToken ? (
                <Button onClick={handleLogout} disabled={loading} size="sm" variant="outline" className="rounded-none font-semibold">
                  Sair
                </Button>
              ) : (
                <FortalezaDigitalButton text="Entrar" onClick={handleLoginClick} size="md" />
              )}
            </div>

            {/* Botão Hamburger (mobile) */}
            <Button variant="ghost" size="icon" className="md:hidden rounded-none" onClick={() => setOpen(true)}>
              <Menu size={24} />
            </Button>
          </div>
        </div>
      </header>

      {/* 🔹 Sidebar Mobile */}
      <MobileSidebar open={open} onClose={() => setOpen(false)} />
      <Dialog open={cookieLoginNoticeOpen} onOpenChange={setCookieLoginNoticeOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[26rem] rounded-none border-slate-200 p-5 sm:max-w-lg sm:rounded-none sm:p-6">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="pr-8 text-xl leading-tight text-slate-800 sm:text-2xl">Aceite os cookies para continuar o login</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-600 sm:text-base">
              Para entrar com o Fortaleza Digital, é necessário aceitar os cookies essenciais do portal.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-slate-600">
            Isso mantém sua sessão ativa com segurança durante o acesso. Você também pode usar o aviso no rodapé.
          </p>
          <DialogFooter className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="order-2 w-full rounded-none border-slate-300 text-slate-700 sm:order-1 sm:w-auto"
              onClick={() => setCookieLoginNoticeOpen(false)}
            >
              Agora não
            </Button>
            <Button
              type="button"
              className="order-1 w-full rounded-none bg-portal-primary text-white hover:opacity-95 sm:order-2 sm:w-auto"
              onClick={handleAcceptCookiesAndLogin}
            >
              Aceitar cookies e entrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CookieBanner hidden={cookieLoginNoticeOpen} />
    </>
  );
};

