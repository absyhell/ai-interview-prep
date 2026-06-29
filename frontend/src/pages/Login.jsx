import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, ArrowRight } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div
        className="hidden lg:flex relative items-end p-12 text-white"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.85)), url('https://images.unsplash.com/photo-1771814591138-6aaab1bce775?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2ODh8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMHNsZWVrJTIwZ3JhZGllbnQlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc3NzIzNDI3OXww&ixlib=rb-4.1.0&q=85')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-md space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white text-black flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <span className="font-display text-2xl font-black tracking-tighter">PREP/STACK</span>
          </div>
          <h1 className="font-display text-5xl xl:text-6xl font-black tracking-tighter leading-[0.95]">
            Practice like it's the real thing.
          </h1>
          <p className="text-white/70 text-sm leading-relaxed max-w-sm">
            AI-evaluated mock interviews, ATS resume scoring, and a private dashboard that tracks every weak spot you fix.
          </p>
          <div className="border-t border-white/20 pt-4 grid grid-cols-3 gap-4 text-xs">
            <div><div className="font-mono text-2xl">5–7</div><div className="text-white/50 mt-1 uppercase tracking-wider">Questions / set</div></div>
            <div><div className="font-mono text-2xl">0–10</div><div className="text-white/50 mt-1 uppercase tracking-wider">AI scoring</div></div>
            <div><div className="font-mono text-2xl">100%</div><div className="text-white/50 mt-1 uppercase tracking-wider">Private</div></div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-6 animate-fade-up" data-testid="login-form">
          <div>
            <div className="grid-overline mb-2">01 / Sign In</div>
            <h2 className="font-display text-4xl font-black tracking-tighter">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-2">Continue your interview prep.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="grid-overline block mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email"
                placeholder="you@domain.com"
                className="w-full px-4 py-3 bg-background border border-border focus:border-foreground focus:outline-none text-sm font-mono"
              />
            </div>
            <div>
              <label className="grid-overline block mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-background border border-border focus:border-foreground focus:outline-none text-sm font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            data-testid="login-submit"
            className="w-full py-3.5 bg-foreground text-background font-semibold text-sm uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? "Signing in..." : <>Sign In <ArrowRight size={14} /></>}
          </button>

          <div className="text-sm text-muted-foreground text-center">
            New here?{" "}
            <Link to="/signup" data-testid="goto-signup" className="text-foreground underline underline-offset-4 font-semibold">
              Create an account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
