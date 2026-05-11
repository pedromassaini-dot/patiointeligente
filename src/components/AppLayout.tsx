import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  PackagePlus,
  Boxes,
  Hammer,
  ArrowRightLeft,
  ShoppingCart,
  Truck,
  Tags,
  LogOut,
  Factory,
  Menu,
  X,
  Briefcase,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { actions, useStore, type Role } from "@/lib/store";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; roles: Role[] };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["gestor", "operador"] },
  { to: "/gestor", label: "Modo Gestor", icon: Briefcase, roles: ["gestor"] },
  { to: "/novo-lote", label: "Novo Lote", icon: PackagePlus, roles: ["operador", "gestor"] },
  { to: "/estoque", label: "Estoque", icon: Boxes, roles: ["gestor", "operador"] },
  { to: "/beneficiamento", label: "Beneficiamento", icon: Hammer, roles: ["operador", "gestor"] },
  { to: "/movimentacoes", label: "Movimentações", icon: ArrowRightLeft, roles: ["operador", "gestor"] },
  { to: "/venda", label: "Venda / Saída", icon: ShoppingCart, roles: ["operador", "gestor"] },
  { to: "/fornecedores", label: "Fornecedores", icon: Truck, roles: ["gestor"] },
  { to: "/tipos", label: "Tipos de Material", icon: Tags, roles: ["gestor"] },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const user = useStore((s) => s.user);
  const authChecked = useStore((s) => s.authChecked);
  const loading = useStore((s) => s.loading);
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined" && path !== "/") {
      navigate({ to: "/" });
    }
    return <>{children}</>;
  }

  const items = NAV.filter((i) => i.roles.includes(user.role));

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <SidebarContent items={items} path={path} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="w-72 bg-sidebar text-sidebar-foreground flex flex-col">
            <SidebarContent items={items} path={path} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card flex items-center px-4 gap-3 sticky top-0 z-30">
          <button
            className="md:hidden p-2 -ml-2 rounded-md hover:bg-muted"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-medium text-muted-foreground hidden sm:block">
            Pátio Inteligente
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium leading-tight">{user.nome}</div>
              <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
            </div>
            <button
              onClick={async () => {
                await actions.refreshProfile();
              }}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground"
              aria-label="Recarregar perfil"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={async () => {
                await actions.logout();
                navigate({ to: "/" });
              }}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">
          {loading && (
            <div className="text-xs text-muted-foreground mb-2">Sincronizando dados...</div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  items,
  path,
  onNavigate,
}: {
  items: NavItem[];
  path: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="h-14 px-4 flex items-center gap-2 border-b border-sidebar-border">
        <div className="h-8 w-8 rounded-md bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
          <Factory className="h-4 w-4" />
        </div>
        <div>
          <div className="font-semibold text-sm leading-tight">Pátio Inteligente</div>
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
            Sucata de Alumínio
          </div>
        </div>
        {onNavigate && (
          <button
            className="ml-auto p-1 rounded hover:bg-sidebar-accent"
            onClick={onNavigate}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const active = path === item.to || path.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/50">
        v1.0 · Galpão & Escritório
      </div>
    </>
  );
}
