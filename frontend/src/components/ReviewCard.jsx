import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { StarRating } from "@/components/StarRating";
import { REVIEW } from "@/constants/testIds";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { PLACEHOLDER_COVER } from "@/lib/utils";

export function ReviewCard({ review }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(review.liked_by_me);
  const [count, setCount] = useState(review.likes_count);
  const [busy, setBusy] = useState(false);

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/reviews/${review._id}/like`);
      setLiked(data.liked);
      setCount(data.likes_count);
    } catch {
      toast.error("Could not update like right now");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/reviews/${review._id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: review.title, text: `Check out this review of ${review.book_title}`, url });
        return;
      } catch {
        // user cancelled share sheet
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error(`Could not copy automatically. Link: ${url}`);
    }
  };

  return (
    <Link
      to={`/reviews/${review._id}`}
      data-testid={REVIEW.card(review._id)}
      className="group block border border-border bg-card p-6 sm:p-8 transition-colors hover:border-primary/40"
    >
      <div className="flex gap-5">
        <img
          src={review.book_cover || PLACEHOLDER_COVER}
          alt={review.book_title}
          className="w-16 h-24 object-cover border border-border shrink-0 transition-transform duration-500 group-hover:scale-105"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold truncate">
            {review.book_title} · {review.book_author}
          </p>
          <h3 className="font-serif text-xl sm:text-2xl mt-1">{review.title}</h3>
          <div className="mt-2">
            <StarRating value={review.rating} readOnly size={14} />
          </div>
          <p className="mt-3 text-base leading-relaxed text-foreground/80 line-clamp-3 max-w-prose">{review.content}</p>
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <span>by {review.user_name}</span>
            <span>·</span>
            <button
              data-testid={REVIEW.cardLikeButton(review._id)}
              onClick={handleLike}
              className={`flex items-center gap-1 transition-colors hover:text-primary ${liked ? "text-primary" : ""}`}
            >
              <Heart size={16} strokeWidth={1.5} className={liked ? "fill-primary" : ""} /> {count}
            </button>
            <span data-testid={REVIEW.cardCommentButton(review._id)} className="flex items-center gap-1">
              <MessageCircle size={16} strokeWidth={1.5} /> {review.comments_count}
            </span>
            <button
              data-testid={REVIEW.cardShareButton(review._id)}
              onClick={handleShare}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Share2 size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
