import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid, FileText, MessageSquare, GitCompare,
  LogOut, Sun, Moon, Sparkles, History,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid, id: "nav-dashboard" },
  { to: "/resume", label: "Resume Analyzer", icon: FileText, id: "nav-resume" },
  { to: "/resume/history", label: "Resume History", icon: History, id: "nav-resume-history" },
  { to: "/interview", label: "Mock Interview", icon: MessageSquare, id: "nav-interview" },
  { to: "/compare", label: "Compare", icon: GitCompare, id: "nav-compare" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="hidden lg:flex flex-col w-72 border-r border-border bg-card h-screen sticky top-0" data-testid="sidebar">
      <div className="px-6 py-8 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="font-display font-black text-lg leading-none tracking-tighter">PREP/STACK</div>
            <div className="grid-overline mt-1">AI Interview Lab</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        <div className="grid-overline px-3 mb-3">Navigate</div>
        {links.map(({ to, label, icon: Icon, id }) => (
          <NavLink
            key={to}
            to={to}
            data-testid={id}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-none border-l-2 transition-colors text-sm hover-lift ${
                isActive
                  ? "bg-foreground text-background border-l-foreground font-semibold"
                  : "border-l-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
              }`
            }
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-5 border-t border-border space-y-3">
        <button
          onClick={toggle}
          data-testid="theme-toggle"
          className="w-full flex items-center justify-between px-3 py-2 border border-border hover:bg-accent transition-colors text-sm"
        >
          <span className="flex items-center gap-2">
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            <span>{theme === "dark" ? "Light" : "Dark"} mode</span>
          </span>
          <span className="font-mono text-xs text-muted-foreground">{theme.toUpperCase()}</span>
        </button>

        <div className="border border-border p-3">
          <div className="grid-overline mb-1">Signed in</div>
          <div className="text-sm font-medium truncate" data-testid="user-name">{user?.name}</div>
          <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs uppercase tracking-widest border border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
          >
            <LogOut size={12} /> Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
