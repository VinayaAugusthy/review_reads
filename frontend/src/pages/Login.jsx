import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatApiErrorDetail } from "@/lib/api";
import { LOGIN } from "@/constants/testIds";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/reviews");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-16 bg-background">
      <div className="w-full max-w-md border border-border bg-card p-10">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen strokeWidth={1.5} className="text-primary" />
          <span className="font-serif text-2xl">Inkwell</span>
        </div>
        <h1 className="font-serif text-4xl italic font-light">Welcome back</h1>
        <p className="text-muted-foreground mt-2 mb-8">Sign in to continue your reading journey.</p>
        {error && (
          <p data-testid="login-error-message" className="text-destructive text-sm mb-4">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              data-testid={LOGIN.emailInput}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              data-testid={LOGIN.passwordInput}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1.5"
            />
          </div>
          <Button
            type="submit"
            data-testid={LOGIN.submitButton}
            disabled={loading}
            className="w-full rounded-sm h-11 hover:-translate-y-0.5 transition-transform"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground mt-6">
          Don't have an account?{" "}
          <Link to="/register" data-testid={LOGIN.registerLink} className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
