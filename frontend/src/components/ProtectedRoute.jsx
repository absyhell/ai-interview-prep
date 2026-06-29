import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground" data-testid="protected-loading">
        <span className="font-mono text-sm tracking-widest">LOADING...</span>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
