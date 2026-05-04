import {
  Calendar,
  Clock,
  IdCard,
  FileCheck,
  ChevronDown,
  LogIn,
} from "lucide-react";

const Styleguide = () => {
  return (
    <div className="min-h-screen bg-portal-neutral text-portal-text-muted font-portal">
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="space-y-16">
            {/* Typography Section */}
            <div className="space-y-8">
              <h2 className="text-3xl font-black border-b border-border pb-4">
                Por que escolher a meutudo?
              </h2>

              <div className="grid md:grid-cols-2 gap-12">
                {/* Headings */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-portal-text-muted uppercase tracking-wider">
                    Headings
                  </h3>
                  <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                      <h1 className="text-4xl font-bold ">Heading 1</h1>
                      <code className="text-xs text-portal-text-muted">
                        text-4xl font-bold
                      </code>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h2 className="text-3xl font-bold ">Heading 2</h2>
                      <code className="text-xs text-portal-text-muted">
                        text-3xl font-bold
                      </code>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-2xl font-bold ">Heading 3</h3>
                      <code className="text-xs text-portal-text-muted">
                        text-2xl font-bold
                      </code>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="text-xl font-bold ">Heading 4</h4>
                      <code className="text-xs text-portal-text-muted">
                        text-xl font-bold
                      </code>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h5 className="text-lg font-bold ">Heading 5</h5>
                      <code className="text-xs text-portal-text-muted">
                        text-lg font-bold
                      </code>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h6 className="text-base font-bold ">Heading 6</h6>
                      <code className="text-xs text-portal-text-muted">
                        text-base font-bold
                      </code>
                    </div>
                  </div>
                </div>

                {/* Body Text */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-portal-text-muted uppercase tracking-wider">
                    Body Text
                  </h3>
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <p className="text-lg text-portal-text-normal">
                        <strong>Large:</strong> O rápido movimento da raposa
                        marrom salta sobre o cão preguiçoso.
                      </p>
                      <code className="text-xs text-portal-text-muted">
                        text-lg
                      </code>
                    </div>
                    <div className="space-y-2">
                      <p className="text-base text-portal-text-normal">
                        <strong>Base (Medium):</strong> O rápido movimento da
                        raposa marrom salta sobre o cão preguiçoso.
                      </p>
                      <code className="text-xs text-portal-text-muted">
                        text-base
                      </code>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-portal-text-normal">
                        <strong>Small:</strong> O rápido movimento da raposa
                        marrom salta sobre o cão preguiçoso.
                      </p>
                      <code className="text-xs text-portal-text-muted">
                        text-sm
                      </code>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <h4 className="text-sm font-semibold mb-3 text-portal-text-muted">
                        Variações de Cor de Texto
                      </h4>
                      <div className="space-y-2">
                        <p className="text-base ">
                          Text Strong (Títulos/Ênfase)
                        </p>
                        <p className="text-base text-portal-text-normal">
                          Text Normal (Parágrafos padrão)
                        </p>
                        <p className="text-base text-portal-text-muted">
                          Text Muted (Legendas/Secundário)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Colors Section */}
            <div className="space-y-8">
              <h2 className="text-3xl font-bold  border-b border-border pb-4">
                Tokens de Cores
              </h2>

              {/* Portal Brand Colors */}
              <div>
                <h3 className="text-xl font-semibold text-portal-text-muted mb-4">
                  Portal Brand
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <div className="p-4 rounded-lg shadow-sm bg-portal-primary text-portal-primary-foreground flex flex-col justify-between h-24">
                    <span className="font-bold">Primary</span>
                    <span className="text-xs opacity-80">#F15A22</span>
                  </div>
                  <div className="p-4 rounded-lg shadow-sm bg-portal-secondary text-portal-secondary-foreground flex flex-col justify-between h-24">
                    <span className="font-bold">Secondary</span>
                    <span className="text-xs opacity-80">#009889</span>
                  </div>
                  <div className="p-4 rounded-lg shadow-sm bg-portal-tertiary text-portal-foreground flex flex-col justify-between h-24">
                    <span className="font-bold">Tertiary</span>
                    <span className="text-xs opacity-80">#FFE6CB</span>
                  </div>
                  <div className="p-4 rounded-lg shadow-sm bg-portal-detail text-portal-detail-foreground flex flex-col justify-between h-24">
                    <span className="font-bold">Detail</span>
                    <span className="text-xs opacity-80">#00A0DC</span>
                  </div>
                  <div className="p-4 rounded-lg shadow-sm bg-portal-background-priority text-portal-foreground flex flex-col justify-between h-24">
                    <span className="font-bold">Bg Priority</span>
                    <span className="text-xs opacity-80">#FFE6CB</span>
                  </div>
                </div>
              </div>

              {/* Status Colors */}
              <div>
                <h3 className="text-xl font-semibold text-portal-text-muted mb-4">
                  Status & Feedback
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <div className="p-4 rounded-lg shadow-sm bg-success text-success-foreground flex flex-col justify-between h-24">
                    <span className="font-bold">Success</span>
                  </div>
                  <div className="p-4 rounded-lg shadow-sm bg-warning text-warning-foreground flex flex-col justify-between h-24">
                    <span className="font-bold">Warning</span>
                  </div>
                  <div className="p-4 rounded-lg shadow-sm bg-info text-info-foreground flex flex-col justify-between h-24">
                    <span className="font-bold">Info</span>
                  </div>
                  <div className="p-4 rounded-lg shadow-sm bg-destructive text-destructive-foreground flex flex-col justify-between h-24">
                    <span className="font-bold">Destructive</span>
                  </div>
                </div>
              </div>

              {/* Base UI Colors */}
              <div>
                <h3 className="text-xl font-semibold text-portal-text-muted mb-4">
                  Base UI
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <div className="p-4 rounded-lg shadow-sm bg-background text-foreground border border-border flex flex-col justify-between h-24">
                    <span className="font-bold">Background</span>
                  </div>
                  <div className="p-4 rounded-lg shadow-sm bg-card text-card-foreground border border-border flex flex-col justify-between h-24">
                    <span className="font-bold">Card</span>
                  </div>
                  <div className="p-4 rounded-lg shadow-sm bg-muted text-muted-foreground flex flex-col justify-between h-24">
                    <span className="font-bold">Muted</span>
                  </div>
                  <div className="p-4 rounded-lg shadow-sm bg-accent text-accent-foreground flex flex-col justify-between h-24">
                    <span className="font-bold">Accent</span>
                  </div>
                  <div className="p-4 rounded-lg shadow-sm bg-border text-foreground flex flex-col justify-between h-24">
                    <span className="font-bold">Border</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Styleguide;
