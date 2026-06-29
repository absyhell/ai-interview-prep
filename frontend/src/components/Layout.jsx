import { Outlet, NavLink } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { LayoutGrid, FileText, MessageSquare, GitCompare } from "lucide-react";

const mobileLinks = [
  { to: "/dashboard", icon: LayoutGrid, label: "Home" },
  { to: "/resume", icon: FileText, label: "Resume" },
  { to: "/interview", icon: MessageSquare, label: "Interview" },
  { to: "/compare", icon: GitCompare, label: "Compare" },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border grid grid-cols-4">
        {mobileLinks.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-3 text-xs gap-1 transition-colors ${
                isActive ? "bg-foreground text-background" : "text-muted-foreground"
              }`
            }
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
