import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, ArrowRight } from "lucide-react";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setBusy(true);
    try {
      await signup(name, email, password);
      toast.success("Account created");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Signup failed");
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
            "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.9)), url('https://images.unsplash.com/photo-1771814591138-6aaab1bce775?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2ODh8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMHNsZWVrJTIwZ3JhZGllbnQlMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc3NzIzNDI3OXww&ixlib=rb-4.1.0&q=85')",
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
            Get hired. <br/> One brutal rep at a time.
          </h1>
          <p className="text-white/70 text-sm leading-relaxed max-w-sm">
            Generate role-specific mock interviews. Score your answers. Fix the gaps. Track your streak.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-6 animate-fade-up" data-testid="signup-form">
          <div>
            <div className="grid-overline mb-2">02 / Create Account</div>
            <h2 className="font-display text-4xl font-black tracking-tighter">Start practicing</h2>
            <p className="text-sm text-muted-foreground mt-2">Free. No card. Your data stays yours.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="grid-overline block mb-2">Full name</label>
              <input
                required minLength={2}
                value={name} onChange={(e) => setName(e.target.value)}
                data-testid="signup-name"
                className="w-full px-4 py-3 bg-background border border-border focus:border-foreground focus:outline-none text-sm font-mono"
                placeholder="Ada Lovelace"
              />
            </div>
            <div>
              <label className="grid-overline block mb-2">Email</label>
              <input
                type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                data-testid="signup-email"
                className="w-full px-4 py-3 bg-background border border-border focus:border-foreground focus:outline-none text-sm font-mono"
                placeholder="you@domain.com"
              />
            </div>
            <div>
              <label className="grid-overline block mb-2">Password</label>
              <input
                type="password" required minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)}
                data-testid="signup-password"
                className="w-full px-4 py-3 bg-background border border-border focus:border-foreground focus:outline-none text-sm font-mono"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          <button
            type="submit" disabled={busy}
            data-testid="signup-submit"
            className="w-full py-3.5 bg-foreground text-background font-semibold text-sm uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? "Creating account..." : <>Create Account <ArrowRight size={14} /></>}
          </button>

          <div className="text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <Link to="/login" data-testid="goto-login" className="text-foreground underline underline-offset-4 font-semibold">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
