import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground font-serif italic text-xl">
        Loading...
      </div>
    );
  }
  if (user === false) return <Navigate to="/login" replace />;
  return children;
}
