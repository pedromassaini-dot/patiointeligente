import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Factory } from "lucide-react";
import { actions, useStore, initAuth } from "@/lib/store";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { inputCls, btnPrimary } from "@/components/ui-bits";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

let authInitialized = false;

function LoginPage() {
  const user = useStore((s) => s.user);
  const authChecked = useStore((s) => s.authChecked);
  const authError = useStore((s) => s.authError);
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authInitialized) {
      authInitialized = true;
      void initAuth();
    }
  }, []);

  useEffect(() => {
    if (user) navigate({ to: user.role === "operador" ? "/operador" : "/dashboard" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Informe e-mail e senha.");
    setBusy(true);
    try {
      if (mode === "login") {
        await actions.loginEmail(email, password);
      } else {
        if (!nome.trim()) {
          setBusy(false);
          return toast.error("Informe seu nome.");
        }
        await actions.signupEmail(email, password, nome.trim());
        toast.success("Conta criada! Você já pode entrar.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro de autenticação");
    } finally {
      setBusy(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-sidebar to-primary/40">
        <div className="text-sidebar-foreground text-sm">Carregando...</div>
      </div>
    );
  }

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

        <div className="flex gap-1 p-1 bg-muted rounded-lg text-sm">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2 rounded-md transition ${mode === "login" ? "bg-card shadow font-medium" : "text-muted-foreground"}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 rounded-md transition ${mode === "signup" ? "bg-card shadow font-medium" : "text-muted-foreground"}`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="text-xs font-medium block mb-1">Nome</label>
              <input
                className={inputCls}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium block mb-1">E-mail</label>
            <input
              className={inputCls}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Senha</label>
            <input
              className={inputCls}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          <button type="submit" disabled={busy} className={btnPrimary + " w-full justify-center"}>
            {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <p className="text-[11px] text-center text-muted-foreground pt-4 border-t">
          Novos usuários entram como <strong>operador</strong>. Um gestor pode promover seu perfil depois.
        </p>
      </div>
    </div>
  );
}
