import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ReviewCard } from "@/components/ReviewCard";
import { Button } from "@/components/ui/button";
import { FEED } from "@/constants/testIds";
import { Plus } from "lucide-react";

export default function Feed() {
  const [reviews, setReviews] = useState([]);
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/reviews", { params: { sort } })
      .then(({ data }) => setReviews(data.items))
      .finally(() => setLoading(false));
  }, [sort]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">The Feed</p>
          <h1 className="font-serif text-4xl sm:text-5xl italic font-light mt-2">Reader Reviews</h1>
        </div>
        <Link to="/reviews/new">
          <Button data-testid={FEED.writeReviewButton} className="rounded-sm">
            <Plus size={16} className="mr-1" /> Write a Review
          </Button>
        </Link>
      </div>
      <div className="flex gap-2 mb-8">
        <button
          data-testid={FEED.sortNewest}
          onClick={() => setSort("newest")}
          className={`text-xs uppercase tracking-[0.15em] font-bold px-4 py-2 border transition-colors ${
            sort === "newest" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
          }`}
        >
          Newest
        </button>
        <button
          data-testid={FEED.sortTop}
          onClick={() => setSort("top")}
          className={`text-xs uppercase tracking-[0.15em] font-bold px-4 py-2 border transition-colors ${
            sort === "top" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
          }`}
        >
          Most Liked
        </button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border">
          <p className="font-serif text-2xl italic text-muted-foreground mb-4">No reviews yet. Be the first storyteller.</p>
          <Link to="/reviews/new">
            <Button data-testid={FEED.emptyStateButton} className="rounded-sm">Write the First Review</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {reviews.map((r) => (
            <ReviewCard key={r._id} review={r} />
          ))}
        </div>
      )}
    </div>
  );
}
