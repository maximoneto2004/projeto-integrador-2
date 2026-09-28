import type { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";

type PaginaSistemaProps = {
  titulo: string;
  subtitulo?: string;
  acoes?: ReactNode;
  children: ReactNode;
};

export function PaginaSistema({ titulo, subtitulo, acoes, children }: PaginaSistemaProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />
        <main className="flex-1 overflow-auto">
          <div className="space-y-6 p-4 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-3xl font-bold text-foreground">{titulo}</h1>
                  {subtitulo && <p className="text-muted-foreground">{subtitulo}</p>}
                </div>
              </div>
              {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
            </div>
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
