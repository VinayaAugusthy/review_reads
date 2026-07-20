import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { BookOpen, Menu, X, LogOut } from "lucide-react";
import { NAV, LOGOUT } from "@/constants/testIds";
import { toast } from "sonner";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out. See you soon!");
    setOpen(false);
    navigate("/");
  };

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors hover:text-primary ${isActive ? "text-primary" : "text-foreground/80"}`;

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" data-testid={NAV.logo} className="flex items-center gap-2">
          <BookOpen strokeWidth={1.5} className="text-primary" size={22} />
          <span className="font-serif text-xl">Inkwell</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <NavLink to="/reviews" data-testid={NAV.feedLink} className={linkClass}>
            Feed
          </NavLink>
          <NavLink to="/books" data-testid={NAV.booksLink} className={linkClass}>
            Shelf
          </NavLink>
          {user && (
            <NavLink to="/reviews/new" data-testid={NAV.newReviewLink} className={linkClass}>
              Write Review
            </NavLink>
          )}
        </nav>
        <div className="hidden md:flex items-center gap-4">
          {user === null ? null : user ? (
            <>
              <Link to="/profile" data-testid={NAV.profileLink} className="text-sm font-medium hover:text-primary transition-colors">
                {user.name}
              </Link>
              <Button variant="outline" size="sm" data-testid={LOGOUT.button} onClick={handleLogout} className="rounded-sm">
                <LogOut size={14} className="mr-1" /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" data-testid={NAV.loginLink} className="text-sm font-medium hover:text-primary transition-colors">
                Sign In
              </Link>
              <Link to="/register" data-testid={NAV.registerLink}>
                <Button size="sm" className="rounded-sm">Join Inkwell</Button>
              </Link>
            </>
          )}
        </div>
        <button className="md:hidden" data-testid={NAV.mobileMenuButton} onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border/50 bg-background px-6 py-4 space-y-4">
          <Link to="/reviews" onClick={() => setOpen(false)} className="block text-sm font-medium">Feed</Link>
          <Link to="/books" onClick={() => setOpen(false)} className="block text-sm font-medium">Shelf</Link>
          {user && <Link to="/reviews/new" onClick={() => setOpen(false)} className="block text-sm font-medium">Write Review</Link>}
          {user ? (
            <>
              <Link to="/profile" onClick={() => setOpen(false)} className="block text-sm font-medium">{user.name}</Link>
              <button onClick={handleLogout} className="block text-sm font-medium text-destructive">Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)} className="block text-sm font-medium">Sign In</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="block text-sm font-medium">Join Inkwell</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
