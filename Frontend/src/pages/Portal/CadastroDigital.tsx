import { Header } from "@/components/portal/Header";
import logoFortalezaDigital from "@/assets/images/logo-fortalezaDigital.png";
import hearts from "@/assets/images/hearts.png";
import { FaleConosco } from "@/components/portal/FaleConosco";
import { IntroSection } from "@/components/portal/IntroSection";
import { FortalezaDigitalButton } from "@/components/portal/FortalezaDigitalButton";
import { getFortalezaDigitalAuthUrl } from "@/services/portal/fortalezaDigital";

const CadastroDigital = () => {
  const redirectUrl = getFortalezaDigitalAuthUrl();
  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <IntroSection title="Cadastro Cidadão" />
        {/* section texto */}
        <section className="py-16 px-4 pr-0">
          <div
            className="container mx-auto grid grid-cols-1  
          lg:grid-cols-2 gap-0 bg-white px-0"
          >
            <div className="p-8 bg-portal-tertiary text-portal-muted">
              <img
                src={logoFortalezaDigital}
                alt="Logo Fortaleza Digital"
                className="w-1/2 my-2 mx-auto block portal-image"
              />
              <p className="text-lg leading-relaxed">
                Para começar o <span className="font-black">cadastro</span> e
                usar o sistema, é necessário utilizar a plataforma do Fortaleza
                Digital da Prefeitura de Fortaleza,
              </p>

              <p className="text-lg leading-relaxed my-2">
                Você vai ser redirecionado para o site do Fortaleza Digital,
                onde deve efetuar o cadastro informando seus dados pessoais.
                Após concluir o cadastro, você poderá retornar ao sistema de
                agendamento do CRAS e fazer login utilizando suas credenciais do
                Fortaleza Digital.
              </p>

              <FortalezaDigitalButton
                text="Cadastrar"
                onClick={() => {
                  window.location.href = redirectUrl;
                }}
                size="md"
              />
            </div>

            <div className="pb-0 hidden lg:flex items-start justify-center bg-bottom bg-repeat-x bg-portal-cadastro">
              <img
                src={hearts}
                alt="Imagens Hearts"
                className="max-h-[150px] w-auto portal-image"
              />
            </div>
          </div>
        </section>
      </div>
      <FaleConosco />
    </>
  );
};

export default CadastroDigital;
