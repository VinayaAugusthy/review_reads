import { BookOpen } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border mt-24 bg-secondary/40">
      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpen strokeWidth={1.5} size={18} className="text-primary" />
          <span className="font-serif text-lg">Inkwell</span>
        </div>
        <p className="text-sm text-muted-foreground text-center">A quiet corner of the internet for people who love books.</p>
      </div>
    </footer>
  );
}
