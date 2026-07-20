import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatApiErrorDetail } from "@/lib/api";
import { REGISTER } from "@/constants/testIds";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success("Welcome to Inkwell!");
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
        <h1 className="font-serif text-4xl italic font-light">Join the shelf</h1>
        <p className="text-muted-foreground mt-2 mb-8">Create an account to review, suggest, and discuss books.</p>
        {error && (
          <p data-testid="register-error-message" className="text-destructive text-sm mb-4">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              data-testid={REGISTER.nameInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              data-testid={REGISTER.emailInput}
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
              data-testid={REGISTER.passwordInput}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              data-testid={REGISTER.passwordConfirmInput}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mt-1.5"
            />
          </div>
          <Button
            type="submit"
            data-testid={REGISTER.submitButton}
            disabled={loading}
            className="w-full rounded-sm h-11 hover:-translate-y-0.5 transition-transform"
          >
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground mt-6">
          Already a member?{" "}
          <Link to="/login" data-testid={REGISTER.loginLink} className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
