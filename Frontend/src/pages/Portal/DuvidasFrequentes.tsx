import { Header } from "@/components/portal/Header";
import questionsFaq from "@/assets/images/faq-icon.png";
import { FaleConosco } from "@/components/portal/FaleConosco";
import { useEffect } from "react";
import { IntroSection } from "@/components/portal/IntroSection";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useDuvidas } from "@/hooks/portal/useDuvidasFrequentes";

const DuvidasFrequentes = () => {
  const { duvidas, loading, error, fetchDuvidas } = useDuvidas();

  useEffect(() => {
    fetchDuvidas();
  }, [fetchDuvidas]);

  const duvidasAtivas = duvidas.filter((item) => item.is_active);

  return (
    <>
      <Header />
      <IntroSection title="Dúvidas Frequentes" />
      {/* FAQ Section */}
      <section className="px-4 py-16">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <Accordion type="single" collapsible className="space-y-4 md:order-2">
            {loading && <div className="text-portal-muted">Carregando dúvidas...</div>}
            {!loading && duvidasAtivas.length === 0 && (
              <div className="text-portal-muted">{error ? "Não foi possível carregar as dúvidas no momento." : "Nenhuma dúvida encontrada."}</div>
            )}
            {!loading &&
              duvidasAtivas.map((item, index) => (
                <AccordionItem
                  key={item.id}
                  value={`item-${index + 1}`}
                  className="bg-portal-tertiary text-portal-muted dark:text-portal-text-strong px-6"
                >
                  <AccordionTrigger className="text-left hover:no-underline font-bold">{item.pergunta}</AccordionTrigger>
                  <AccordionContent className="text-portal-muted">{item.resposta}</AccordionContent>
                </AccordionItem>
              ))}
          </Accordion>
          <div className="flex flex-col justify-start md:order-1">
            <div className="flex items-center justify-center">
              <img src={questionsFaq} alt="Ãcone de perguntas frequentes" className="max-h-[150px] max-w-full object-contain portal-image" />
            </div>
            <div className="my-4">
              <h2 className="text-3xl font-bold text-portal-muted dark:text-portal-text-strong">Tire todas suas dúvidas</h2>
            </div>
            <p className="text-lg text-portal-muted my-3 dark:text-portal-text-muted">
              Encontre respostas para as dúvidas mais comuns sobre agendamentos no <span className="text-primary ml-1">CRAS</span>, se precisar entrar
              em contato com algum problema técnico ou dúvida específica, entre em contato pelo telefone{" "}
              <a href="<tel:1234567890>" className="text-portal-detail dark:text-portal-detail-foreground">
                20280495{" "}
              </a>{" "}
              <a />
              ou pelo email de contato{" "}
              <a href="mailto" className="text-portal-detail dark:text-portal-detail-foreground">
                cepb@sdhds.fortaleza.ce.gov.br
              </a>
            </p>
          </div>
        </div>
      </section>

      <FaleConosco />
    </>
  );
};

export default DuvidasFrequentes;
