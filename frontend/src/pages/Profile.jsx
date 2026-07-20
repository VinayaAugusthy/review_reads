import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { ReviewCard } from "@/components/ReviewCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Profile() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .get("/reviews", { params: { user_id: user.id } })
      .then(({ data }) => setReviews(data.items))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="flex items-center gap-5 mb-12">
        <Avatar className="h-16 w-16 border border-border">
          <AvatarFallback className="font-serif text-2xl bg-secondary">{user.name?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h1 data-testid="profile-user-name" className="font-serif text-3xl">
            {user.name}
          </h1>
          <p className="text-muted-foreground text-sm">{user.email}</p>
        </div>
      </div>
      <h2 className="font-serif text-2xl italic font-light mb-6">My Reviews ({reviews.length})</h2>
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : reviews.length === 0 ? (
        <p className="text-muted-foreground">You haven't written any reviews yet.</p>
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
