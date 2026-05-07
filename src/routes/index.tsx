import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Factory, ShieldCheck, HardHat } from "lucide-react";
import { actions, useStore } from "@/lib/store";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  useEffect(() => {
    if (user) navigate({ to: user.role === "operador" ? "/operador" : "/dashboard" });
  }, [user, navigate]);

  const entrar = (role: "operador" | "gestor") => {
    actions.login(role);
    navigate({ to: role === "operador" ? "/operador" : "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-sidebar to-primary/40 p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Factory className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Pátio Inteligente</h1>
            <p className="text-xs text-muted-foreground">Gestão de sucata de alumínio</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">Entre como:</p>
          <button
            onClick={() => entrar("operador")}
            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
          >
            <div className="h-10 w-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center group-hover:scale-110 transition-transform">
              <HardHat className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Operador do Galpão</div>
              <div className="text-xs text-muted-foreground">
                Cadastrar lotes, fotos, pesos, beneficiamento
              </div>
            </div>
          </button>
          <button
            onClick={() => entrar("gestor")}
            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
          >
            <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Gestor do Escritório</div>
              <div className="text-xs text-muted-foreground">
                Dashboard, estoque, custo médio, margens
              </div>
            </div>
          </button>
        </div>

        <p className="text-[11px] text-center text-muted-foreground pt-4 border-t">
          Demonstração — dados salvos localmente no navegador
        </p>
      </div>
    </div>
  );
}
