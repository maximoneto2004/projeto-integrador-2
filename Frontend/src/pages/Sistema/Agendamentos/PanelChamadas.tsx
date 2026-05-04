import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { PanelDisplay } from "@/components/PanelDisplay";

const PanelChamadas = () => {
  return (
    <SidebarProvider>
      <RoleBasedSidebar />
      <SidebarInset>
        <div className="container mx-auto p-6">
          <PanelDisplay />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default PanelChamadas;
