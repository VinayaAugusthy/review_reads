import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BookCard } from "@/components/BookCard";
import { AddBookDialog } from "@/components/AddBookDialog";
import { Input } from "@/components/ui/input";
import { BOOK } from "@/constants/testIds";
import { Search } from "lucide-react";

export default function Books() {
  const [books, setBooks] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchBooks = async (query = "") => {
    setLoading(true);
    try {
      const { data } = await api.get("/books", { params: query ? { q: query } : {} });
      setBooks(data.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchBooks(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">The Catalog</p>
          <h1 className="font-serif text-4xl sm:text-5xl italic font-light mt-2">Book Shelf</h1>
        </div>
        <AddBookDialog onAdded={() => fetchBooks(q)} />
      </div>
      <div className="relative max-w-md mb-10">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-testid={BOOK.catalogSearchInput}
          placeholder="Search the shelf..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading books...</p>
      ) : books.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border">
          <p className="font-serif text-2xl italic text-muted-foreground">No books yet. Be the first to suggest one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {books.map((b) => (
            <BookCard key={b._id} book={b} />
          ))}
        </div>
      )}
    </div>
  );
}
