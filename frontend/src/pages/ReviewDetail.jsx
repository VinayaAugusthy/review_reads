import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { REVIEW, COMMENT } from "@/constants/testIds";
import { toast } from "sonner";
import { Heart, Share2, Trash2, MessageCircle } from "lucide-react";
import { PLACEHOLDER_COVER } from "@/lib/utils";

export default function ReviewDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    const { data } = await api.get(`/reviews/${id}`);
    setReview(data);
    const { data: cs } = await api.get(`/reviews/${id}/comments`);
    setComments(cs);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleLike = async () => {
    if (!user) return navigate("/login");
    const { data } = await api.post(`/reviews/${id}/like`);
    setReview((r) => ({ ...r, liked_by_me: data.liked, likes_count: data.likes_count }));
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: review.title, url });
        return;
      } catch {
        // user cancelled
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

  const handleDeleteReview = async () => {
    if (!window.confirm("Delete this review? This cannot be undone.")) return;
    await api.delete(`/reviews/${id}`);
    toast.success("Review deleted");
    navigate("/reviews");
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login");
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const { data } = await api.post(`/reviews/${id}/comments`, { content: newComment });
      setComments((c) => [...c, data]);
      setReview((r) => ({ ...r, comments_count: r.comments_count + 1 }));
      setNewComment("");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    await api.delete(`/comments/${commentId}`);
    setComments((c) => c.filter((x) => x._id !== commentId));
    setReview((r) => ({ ...r, comments_count: r.comments_count - 1 }));
  };

  if (!review) {
    return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground font-serif italic text-xl">Loading review...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="flex gap-6 mb-8">
        <img src={review.book_cover || PLACEHOLDER_COVER} alt={review.book_title} className="w-24 h-36 object-cover border border-border" />
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">
            {review.book_title} · {review.book_author}
          </p>
          <h1 className="font-serif text-4xl italic font-light mt-2">{review.title}</h1>
          <div className="mt-3">
            <StarRating value={review.rating} readOnly />
          </div>
          <p className="text-sm text-muted-foreground mt-2">by {review.user_name}</p>
        </div>
      </div>
      <p className="text-lg leading-relaxed text-foreground/90 max-w-prose whitespace-pre-wrap">{review.content}</p>
      <div className="flex items-center gap-6 mt-10 border-t border-border pt-6 flex-wrap">
        <button
          data-testid={REVIEW.detailLikeButton}
          onClick={handleLike}
          className={`flex items-center gap-2 text-sm transition-colors hover:text-primary ${review.liked_by_me ? "text-primary" : "text-muted-foreground"}`}
        >
          <Heart size={18} strokeWidth={1.5} className={review.liked_by_me ? "fill-primary" : ""} /> {review.likes_count} Likes
        </button>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageCircle size={18} strokeWidth={1.5} /> {review.comments_count} Comments
        </span>
        <button
          data-testid={REVIEW.detailShareButton}
          onClick={handleShare}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <Share2 size={18} strokeWidth={1.5} /> Share
        </button>
        {user && (user.id === review.user_id || user.role === "admin") && (
          <button
            data-testid={REVIEW.detailDeleteButton}
            onClick={handleDeleteReview}
            className="flex items-center gap-2 text-sm text-destructive hover:underline ml-auto"
          >
            <Trash2 size={16} strokeWidth={1.5} /> Delete
          </button>
        )}
      </div>

      <div className="mt-12">
        <h2 className="font-serif text-2xl mb-6">Comments</h2>
        {user ? (
          <form onSubmit={handleComment} className="flex gap-3 mb-8">
            <Textarea
              data-testid={COMMENT.input}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              rows={2}
            />
            <Button type="submit" data-testid={COMMENT.submitButton} disabled={posting} className="rounded-sm shrink-0">
              Post
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground mb-8">
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>{" "}
            to join the conversation.
          </p>
        )}
        <div className="space-y-5">
          {comments.map((c) => (
            <div key={c._id} data-testid={COMMENT.item(c._id)} className="border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{c.user_name}</p>
                {user && (user.id === c.user_id || user.role === "admin") && (
                  <button
                    data-testid={COMMENT.deleteButton(c._id)}
                    onClick={() => handleDeleteComment(c._id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-base text-foreground/85 mt-1">{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment.</p>}
        </div>
      </div>
    </div>
  );
}
