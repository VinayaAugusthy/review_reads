import { Link } from "react-router-dom";
import { PLACEHOLDER_COVER } from "@/lib/utils";

export function BookCard({ book }) {
  return (
    <div data-testid={`book-card-${book._id}`} className="group border border-border bg-card p-5 flex flex-col">
      <div className="overflow-hidden border border-border mb-4 aspect-[2/3] bg-secondary">
        <img
          src={book.cover_url || PLACEHOLDER_COVER}
          alt={book.title}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      </div>
      <h3 className="font-serif text-lg leading-snug line-clamp-2">{book.title}</h3>
      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{book.author}</p>
      <Link
        to={`/reviews/new?book_id=${book._id}`}
        data-testid={`book-card-review-button-${book._id}`}
        className="mt-4 text-xs uppercase tracking-[0.15em] font-bold text-primary hover:underline"
      >
        Write a review →
      </Link>
    </div>
  );
}
