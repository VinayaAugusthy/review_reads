import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { AddBookDialog } from "@/components/AddBookDialog";
import { REVIEW } from "@/constants/testIds";
import { toast } from "sonner";
import { Search } from "lucide-react";

export default function NewReview() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const bookId = params.get("book_id");
    if (bookId) {
      api
        .get(`/books/${bookId}`)
        .then(({ data }) => setBook(data))
        .catch(() => {});
    }
  }, [params]);

  const searchCatalog = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const { data } = await api.get("/books", { params: { q: query } });
    setResults(data.items);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!book) {
      setError("Please select a book first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post("/reviews", { book_id: book._id, title, content, rating });
      toast.success("Review published!");
      navigate(`/reviews/${data._id}`);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  if (!book) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">Step 1 of 2</p>
        <h1 className="font-serif text-4xl italic font-light mt-2 mb-8">Which book are you reviewing?</h1>
        <form onSubmit={searchCatalog} className="flex gap-2 mb-6">
          <Input
            data-testid={REVIEW.createBookSearchInput}
            placeholder="Search the shelf..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" variant="secondary" size="icon">
            <Search size={16} />
          </Button>
        </form>
        <div className="space-y-2 mb-8">
          {results.map((r) => (
            <button
              key={r._id}
              type="button"
              onClick={() => setBook(r)}
              className="w-full flex gap-3 items-center text-left p-3 border border-border hover:border-primary/50 transition-colors"
            >
              <img src={r.cover_url || "https://via.placeholder.com/40x60?text=No+Cover"} className="w-10 h-14 object-cover" alt={r.title} />
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.author}</p>
              </div>
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mb-3">Can't find it on the shelf?</p>
        <AddBookDialog onAdded={(b) => setBook(b)} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">Step 2 of 2</p>
      <div className="flex gap-4 items-center mt-2 mb-8 p-4 border border-border bg-card">
        <img src={book.cover_url || "https://via.placeholder.com/40x60?text=No+Cover"} className="w-12 h-16 object-cover" alt={book.title} />
        <div>
          <h2 className="font-serif text-xl">{book.title}</h2>
          <p className="text-sm text-muted-foreground">{book.author}</p>
        </div>
        <button type="button" onClick={() => setBook(null)} className="ml-auto text-xs text-muted-foreground hover:text-primary">
          Change
        </button>
      </div>
      {error && (
        <p data-testid="new-review-error-message" className="text-destructive text-sm mb-4">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">Your Rating</label>
          <div className="mt-2">
            <StarRating value={rating} onChange={setRating} size={26} />
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">Review Title</label>
          <Input data-testid={REVIEW.createTitleInput} value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-2" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">Your Review</label>
          <Textarea
            data-testid={REVIEW.createContentInput}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={8}
            className="mt-2"
          />
        </div>
        <Button
          type="submit"
          data-testid={REVIEW.createSubmitButton}
          disabled={submitting}
          className="rounded-sm h-11 px-8 hover:-translate-y-0.5 transition-transform"
        >
          {submitting ? "Publishing..." : "Publish Review"}
        </Button>
      </form>
    </div>
  );
}
