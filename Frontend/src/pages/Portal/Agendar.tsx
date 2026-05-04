import { Header } from "@/components/portal/Header";
import { FaleConosco } from "@/components/portal/FaleConosco";
import { IntroSection } from "@/components/portal/IntroSection";
import { AgendarSolicitacao } from "@/components/portal/AgendarSolicitacao";

const Agendar = () => {
  return (
    <>
      <Header />
      <IntroSection title="Agendar Atendimento" />

      <div className="container mx-auto px-4 py-16">
        <AgendarSolicitacao />
      </div>

      <FaleConosco />
    </>
  );
};

export default Agendar;
