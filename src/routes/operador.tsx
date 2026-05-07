import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PackagePlus, ArrowRightLeft, Hammer, ShoppingCart, LogOut, Factory } from "lucide-react";
import { actions, useStore } from "@/lib/store";
import { useEffect } from "react";

export const Route = createFileRoute("/operador")({
  component: OperadorHome,
});

const BOTOES = [
  {
    to: "/novo-lote",
    label: "Novo Lote",
    descricao: "Registrar entrada de material",
    icon: PackagePlus,
    cor: "bg-primary text-primary-foreground",
  },
  {
    to: "/movimentacoes",
    label: "Movimentar Lote",
    descricao: "Mudar lote de localização",
    icon: ArrowRightLeft,
    cor: "bg-accent text-accent-foreground",
  },
  {
    to: "/beneficiamento",
    label: "Beneficiar Lote",
    descricao: "Registrar peso após beneficiamento",
    icon: Hammer,
    cor: "bg-warning text-warning-foreground",
  },
  {
    to: "/venda",
    label: "Registrar Saída",
    descricao: "Venda ou saída do pátio",
    icon: ShoppingCart,
    cor: "bg-success text-success-foreground",
  },
] as const;

function OperadorHome() {
  const user = useStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate({ to: "/" });
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar via-sidebar to-primary/30 flex flex-col">
      {/* Header simples */}
      <header className="flex items-center gap-3 p-4 text-sidebar-foreground">
        <div className="h-10 w-10 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
          <Factory className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold leading-tight truncate">Pátio Inteligente</div>
          <div className="text-xs opacity-70 truncate">Olá, {user.nome}</div>
        </div>
        <button
          onClick={() => {
            actions.logout();
            navigate({ to: "/" });
          }}
          className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
          aria-label="Sair"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Botões grandes */}
      <main className="flex-1 p-4 max-w-2xl w-full mx-auto">
        <div className="bg-card/95 backdrop-blur rounded-2xl p-4 shadow-xl">
          <h2 className="text-lg font-bold mb-1">O que você quer fazer?</h2>
          <p className="text-sm text-muted-foreground mb-4">Escolha uma das opções abaixo</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BOTOES.map((b) => {
              const Icon = b.icon;
              return (
                <Link
                  key={b.to}
                  to={b.to}
                  className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card hover:border-primary active:scale-[0.98] transition-all p-5 min-h-[140px] flex flex-col justify-between shadow-sm hover:shadow-md"
                >
                  <div className={`h-14 w-14 rounded-xl ${b.cor} flex items-center justify-center shadow-md`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="font-bold text-lg leading-tight">{b.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{b.descricao}</div>
                  </div>
                </Link>
              );
            })}
          </div>

          {user.role === "gestor" && (
            <Link
              to="/dashboard"
              className="mt-4 block text-center text-sm text-primary hover:underline"
            >
              Voltar ao modo completo (gestor) →
            </Link>
          )}
        </div>
      </main>

      <footer className="p-3 text-center text-[11px] text-sidebar-foreground/60">
        Modo Operador · Toque em uma opção para começar
      </footer>
    </div>
  );
}
