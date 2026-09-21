import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import {
  Briefcase,
  LayoutDashboard,
  CheckSquare,
  Settings,
  LogOut,
  Sparkles,
  LayoutGrid,
  Lightbulb,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function Logo() {
  return (
    <div className="flex items-center gap-2 px-2 py-4">
      <svg width="36" height="28" viewBox="0 0 50 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="logo-mask-nav">
            <rect width="50" height="36" fill="white"/>
            <circle cx="33" cy="18" r="15" fill="black"/>
          </mask>
        </defs>
        <g mask="url(#logo-mask-nav)">
          <circle cx="17" cy="18" r="14" fill="#4A1F55"/>
          <circle cx="17" cy="18" r="7" fill="white"/>
        </g>
        <circle cx="33" cy="18" r="14" stroke="#1a1a1a" strokeWidth="5.5" fill="none"/>
      </svg>
      <span className="text-xl font-bold text-gray-900 dark:text-gray-100">OnePulse</span>
    </div>
  );
}

function NavContent() {
  const [location] = useLocation();
  const { data: user } = useGetMe({ query: { queryKey: ["/api/users/me"] } });
  const isAdmin = user?.systemRole === "admin";

  const navItems = [
    { title: "Portefølje", icon: LayoutDashboard, href: "/portfolio" },
    { title: "Prosjekter", icon: Briefcase, href: "/projects" },
    { title: "Mine oppgaver", icon: CheckSquare, href: "/my-work" },
    { title: "Forbedringsforslag", icon: Lightbulb, href: "/forslag" },
    { title: "Heatmap", icon: LayoutGrid, href: "/prosjektoversikt" },
    { title: "AI-analyse", icon: Sparkles, href: "/ai-analyse" },
  ];

  if (isAdmin) navItems.push({ title: "Admin", icon: Settings, href: "/admin" });

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild isActive={location.startsWith(item.href)} tooltip={item.title}>
            <Link href={item.href}>
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function UserFooter() {
  const { data: user } = useGetMe({ query: { queryKey: ["/api/users/me"] } });
  if (!user) return null;

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const signOut = () => {
    const returnUrl = encodeURIComponent(window.location.origin + "/");
    window.location.assign("/.auth/logout?post_logout_redirect_uri=" + returnUrl);
  };

  return (
    <div className="flex items-center gap-3 p-2">
      <Avatar className="h-9 w-9">
        <AvatarFallback>{initials || "OC"}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col flex-1 overflow-hidden">
        <span className="text-sm font-medium truncate">{user.name}</span>
        <span className="text-xs text-muted-foreground truncate">{user.email}</span>
      </div>
      <Button variant="ghost" size="icon" onClick={signOut} title="Logg ut">
        <LogOut className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar variant="inset" className="border-r border-border bg-card">
          <SidebarHeader><Logo /></SidebarHeader>
          <SidebarContent><NavContent /></SidebarContent>
          <SidebarFooter className="border-t border-border p-2"><UserFooter /></SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-card px-6">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
