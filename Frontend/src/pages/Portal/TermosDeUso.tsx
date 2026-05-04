import { FaleConosco } from "@/components/portal/FaleConosco";
import { Header } from "@/components/portal/Header";
import { IntroSection } from "@/components/portal/IntroSection";
import { TermsOfUseContent } from "@/components/portal/TermsOfUseContent";

const TermoDeUso = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      <IntroSection title="Termos de uso" />

      <div className="container mx-auto px-4 py-6 sm:py-10 max-w-4xl">
        <div className="bg-white border-l-4 border-l-amber-500 border border-slate-200 shadow-sm p-5 sm:p-8">
          <TermsOfUseContent />
        </div>
      </div>

      <FaleConosco />
    </div>
  );
};

export default TermoDeUso;

