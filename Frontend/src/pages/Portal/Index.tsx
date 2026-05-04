import { Header } from "@/components/portal/Header";
import { InfoCard } from "@/components/InfoCard";
import { AvisoCard } from "@/components/AvisoCard";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, IdCard, FileCheck, User, Heart, Smartphone, Laptop } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FaleConosco } from "@/components/portal/FaleConosco";
import { Card, CardContent } from "@/components/ui/card";
import logoShds from "@/assets/images/logo-prefeitura-sdhds.png";
import logoCitinovaBranca from "@/assets/images/logo-citinova-branc.png";
import handsAbout from "@/assets/images/hands-about.png";
import handJoin from "@/assets/images/handjoin.png";
import handsVert from "@/assets/images/handsVertical.png";
import squares from "@/assets/images/squares.png";
import crasWoman from "@/assets/images/cras-woman2.png";
import { Footer } from "@/components/portal/Footer";
import { SectionTitle } from "@/components/portal/SectionTitle";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { startLoginFortalezaDigital } from "@/services/portal/fortalezaDigital";
import logoSdhdsCor from "@/assets/images/logo-sdhds-cor.png";
import logoSdhdsBrancaHorizontal from "@/assets/images/logo-sdhds-branca-horizontal.png";
import ellipse from "@/assets/images/Ellipse 1 (3).png";
import calendar from "@/assets/images/calendar1.png";
import atend from "@/assets/images/atend-presencial3.png";

import logoAcolhe from "@/assets/images/logo-acolhe19.png";
import logoAcolheBranca from "@/assets/images/logo-acolhe-branca.png";
const Index = () => {
  const navigate = useNavigate();
  const { accessToken } = usePortalAuth();
  return (
    <div className="min-h-screen bg-background text-portal-text-normal font-portal">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-cover bg-center bg-no-repeat text-white py-20 px-4 overflow-hidden bg-portal-hero">
        <div className="absolute inset-0 opacity-10">
          {/* <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,.1) 50px, rgba(255,255,255,.1) 51px)',
          }} /> */}
        </div>
        <div className="container mx-auto flex items-center justify-between relative z-10">
          <div className="max-w-xl">
            <h1 className="text-4xl font-bold mb-4">
              Sistema de agendamento <span className="text-portal-tertiary dark:text-primary">Acolhe</span>
            </h1>
            <p className="text-xl mb-8 opacity-90">
              Seu sistema on-line de agendamento para atendimentos nos Centros de Referência de Assistência Social
              <br></br>
              <span className="font-bold text-portal-tertiary dark:text-primary">(CRAS) da Prefeitura de Fortaleza.</span>
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {accessToken ? (
                <Button
                  onClick={() => navigate("/agendar")}
                  size="lg"
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold px-8 py-6 text-lg rounded-none shadow-lg"
                >
                  <Calendar className="mr-2 h-5 w-5" />
                  Faça seu agendamento
                </Button>
              ) : (
                <Button
                  onClick={() => navigate("/cadastro-digital")}
                  size="lg"
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold px-8 py-6 text-lg rounded-none shadow-lg"
                >
                  <User className="mr-2 h-5 w-5" />
                  Faça seu cadastro
                </Button>
              )}
            </div>
          </div>
          <div className="hidden lg:flex items-center justify-end gap-4">
            <img src={logoCitinovaBranca} alt="Loco citinova branca" className="w-[200px] h-[200px] object-contain mb-4 portal-image" />
            <img
              src={logoShds}
              alt="Loco Secretaria de habitação e desenvolvimento social branca"
              className="w-[250px] h-[200px] object-contain mb-6 portal-image"
            />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-background py-20 br relative bg-cover bg-center bg-no-repeat bg-portal-about">
        <SectionTitle title="Sobre" id="sobre" />
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center px-6 br py-10">
          {/* 🖼️ BLOCO DE IMAGENS */}
          <div className="flex justify-center items-center">
            {/* Imagem principal */}
            <img
              src={logoAcolhe}
              alt="Imagem principal"
              className="w-full max-w-[340px] sm:max-w-[460px] md:max-w-[760px] lg:max-w-[860px] xl:max-w-[940px] mx-auto portal-image  dark:hidden"
            />
            <img
              src={logoAcolheBranca}
              alt="Imagem principal branca"
              className="w-full max-w-[340px] sm:max-w-[460px] md:max-w-[760px] lg:max-w-[860px] xl:max-w-[940px] mx-auto portal-image hidden dark:block"
            />
          </div>

          {/* 📝 BLOCO DE TEXTO */}
          <div className="max-w-xl">
            <h3 className="mt-2 text-3xl lg:text-4xl leading-tight text-primary font-black">O que é?</h3>

            <p className="mt-6 text-lg text-portal-muted my-3">
              O sistema de agendamento <span className="text-primary ml-1 font-black">Acolhe</span> foi criado para facilitar o acesso da população
              aos atendimentos nos
              <span className="text-primary ml-1 font-black"> Centros de Referência de Assistência Social (CRAS)</span> de Fortaleza. Com ele, é
              possível marcar seu atendimento com antecedência, evitando filas e tornando o processo mais organizado e tranquilo.
            </p>

            <p className="mt-6 text-lg text-portal-muted my-3">
              Pelo sistema on-line, você pode escolher o <span className="text-primary ml-1 font-black">CRAS</span> mais próximo, selecionar o serviço
              desejado e verificar as <span className="text-primary ml-1 font-black"> datas e horários</span> disponíveis para atendimento. Após o
              agendamento, você recebe uma <span className="text-primary ml-1 font-black">confirmação por e-mail</span>, garantindo mais segurança
              para não perder seu compromisso.
            </p>

            {/* ✔️ Lista */}
            <ul className="mt-6 space-y-4 text-lg text-portal-muted">
              <li className="flex items-center gap-3 text-portal-text-muted">
                <Heart className="text-primary" size={20} />
                Fazer seu agendamento de forma fácil e rápida
              </li>
              <li className="flex items-center gap-3 text-portal-text-muted">
                <Heart className="text-primary" size={20} />
                Acompanhar o histórico dos seus atendimentos
              </li>
              <li className="flex items-center gap-3 text-portal-text-muted">
                <Heart className="text-primary" size={20} />
                Encontrar a localização das unidades mais próximas de você
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="conteudoCentral" tabIndex={-1} className="py-20 scroll-mt-28">
        <SectionTitle title="Agendamento" id="agendamentoOnline" />
        <div className="container mx-auto max-w-6xl px-6">
          {/* HERO */}
          <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center px-6 br">
            {/* TEXTO */}
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-portal-secondary dark:text-portal-text-strong leading-tight">
                Como funciona o Agendamento <span className="text-primary ml-1 '">On-line</span>?
              </h1>

              <p className="mt-6 text-lg text-portal-muted max-w-lg">
                Para utilizar o sistema, você precisa acessar com sua conta <span className="text-primary font-black">Fortaleza Digital.</span> Caso
                ainda não tenha cadastro, é possível criar sua conta de forma rápida. Depois de fazer o login, basta escolher o{" "}
                <span className="text-primary font-black">CRAS mais próximo</span>, selecionar o{" "}
                <span className="text-primary font-black">serviço desejado</span> e verificar as{" "}
                <span className="text-primary font-black">datas e horários disponíveis</span> para realizar seu agendamento. Em poucos passos, seu
                atendimento estará marcado.
              </p>

              <Button size="lg" className="mt-8 rounded-none" onClick={() => (accessToken ? navigate("/agendar") : startLoginFortalezaDigital())}>
                Agendar
              </Button>
            </div>

            {/* IMAGEM */}
            <div className="relative flex justify-center">
              <div className="p-6">
                <img src={calendar} alt="mãos juntas imagem coração" className="w-[420px] rounded-none object-cover portal-image" />
              </div>
            </div>
          </div>

          {/* BENEFÍCIOS */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-sm rounded-none">
              <CardContent className="p-6">
                <Laptop className="text-primary mb-4" size={28} />
                <h3 className="font-semibold text-lg">Cadastro</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Você precisa fazer o cadastro no Fortaleza Digital e ter selo <span className="text-primary font-black">intermediário </span>para
                  ter acesso ao sistema.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm rounded-none">
              <CardContent className="p-6">
                <Calendar className="text-primary mb-4" size={28} />
                <h3 className="font-semibold text-lg">Agendamento</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Acesse a tela de agendamentos, selecione a sua unidade CRAS de referência e, em seguida, o serviço, a data e o horário
                  disponíveis.{" "}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm rounded-none">
              <CardContent className="p-6">
                <Smartphone className="text-primary mb-4" size={28} />
                <h3 className="font-semibold text-lg">Acompanhamento </h3>
                <p className="mt-2 text-sm text-muted-foreground">Acompanhe e gerencie os seus agendamentos acessando o seu perfil.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-6 relative">
          <div className="absolute top-6 left-2 w-full h-full bg-primary z-[1] hidden lg:block" />
          <div className="bg-portal-detail text-portal-detail-foreground px-10 py-0 relative z-[2]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* IMAGEM (DENTRO DO CARD) */}
              <div className="flex justify-center lg:justify-start order-2 lg:order-none">
                <div className="relative">
                  <img
                    src={atend}
                    alt="Maos logo vertical"
                    className="h-[260px] sm:h-[340px] md:h-[420px] lg:h-[500px] w-auto max-w-full object-contain portal-image"
                  />
                </div>
              </div>

              {/* TEXTO */}
              <div>
                <h2 className="text-4xl font-black text-portal-detail-foreground pt-6 leading-tight">Agendamento presencial</h2>

                <p className="mt-8 lg:mt-4 max-w-lg">
                  Se preferir, você também pode realizar seu agendamento de forma presencial. Basta ligar para o{" "}
                  <span className="font-bold text-portal-tertiary dark:text-primary">156</span> ou procurar uma{" "}
                  <span className="font-bold text-portal-tertiary dark:text-primary">unidade do CRAS</span> ou um{" "}
                  <span className="font-bold text-portal-tertiary dark:text-primary">Posto da Prefeitura de Fortaleza</span> mais próximo. A equipe
                  estará disponível para orientar e ajudar você a marcar seu atendimento.
                </p>
                <h3 className="mt-6 lg:mt-4">Documentos necessários para o agendamento presencial</h3>
                {/* LISTAS */}
                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-2 text-base">
                  <ul className="space-y-2">
                    <li className="font-bold">Beneficiário</li>
                    <li>• CPF, RG</li>
                    {/* <li>• Tipo sanguíneo</li> */}
                    <li>• Foto 3x4</li>
                    <li>• Comprovante de endereço</li>
                  </ul>

                  <ul className="space-y-2">
                    <li className="font-bold">Responsável legal</li>
                    <li>• Documento de identificação ( RG, CPF ou CNH )</li>
                    {/* <li>• Comprovante de endereço</li> */}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-portal-tertiary relative text-white py-12 md:py-20 pb-0 px-4 overflow-hidden">
        {/* CONTEÚDO */}
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center px-6 br py-10n">
          <div className="flex justify-center items-end h-full">
            {/* Imagem principal */}
            <img
              src={squares}
              alt="Quadrados intro"
              className="hidden md:block md:w-[340px] lg:w-auto lg:absolute lg:left-0 lg:top-1/2 lg:-translate-y-1/2 max-w-[400px] portal-image"
            />
            <img
              src={crasWoman}
              alt="Imagem mulher com a camisa do cras"
              className="hidden md:block self-end max-h-[350px] lg:absolute lg:left-50 lg:bottom-0 lg:top-auto lg:translate-y-0 ml-8 portal-image"
            />
          </div>
          <div className="max-w-2xl lg:ml-auto">
            <h2 className="text-4xl font-bold mb-4 text-portal-muted dark:text-portal-text-strong text-right">
              Unidades <span className="text-primary ml-2 font-black">CRAS</span>
            </h2>
            <p className="text-xl text-portal-muted dark:text-portal-text-muted">
              Encontre a unidade do CRAS mais próxima da sua residência. Sempre há um CRAS perto de você, pronto para acolher, orientar e oferecer o
              apoio necessário para você e sua família.
            </p>
            <div className="flex justify-center align-items-center mt-4 lg:justify-end py-8">
              <Button onClick={() => navigate("/unidades-cras")} size="lg" className="mt-8 rounded-none mx-4">
                Unidades
              </Button>
              <img src={logoSdhdsCor} alt="logo sdhds" className=" w-[195px] object-contain mt-4 portal-image dark:hidden" />
              <img src={logoSdhdsBrancaHorizontal} alt="logo sdhds" className=" w-[195px] object-contain mt-4 portal-image hidden dark:block" />
            </div>
          </div>
        </div>
      </section>
      <FaleConosco />

      <Footer />
    </div>
  );
};

export default Index;
