import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute -top-32 right-0 size-[28rem] rounded-full bg-indigo-600/15 blur-[120px]" />
            <div className="absolute bottom-0 left-1/4 size-[24rem] rounded-full bg-fuchsia-600/10 blur-[120px]" />
          </div>

          {/* Mobile: floating, because the sidebar is an off-canvas sheet there. */}
          <SidebarTrigger className="fixed top-3 left-3 z-40 md:hidden" />

          <div className="flex flex-1 flex-col gap-6 p-4 pt-14 md:p-6 md:pt-6">
            {/* Desktop: lives in the content column so it never overlaps the
                sidebar, and collapsing stays discoverable (⌘/Ctrl+B and the
                edge rail also work). */}
            <SidebarTrigger className="hidden w-fit md:inline-flex" />

            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
