import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { QuotesMarquee } from "@/components/QuotesMarquee";
import { ReviewCard } from "@/components/ReviewCard";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { LANDING } from "@/constants/testIds";
import { ArrowRight, BookOpen, Heart, Feather } from "lucide-react";

const HERO_IMG =
  "https://images.unsplash.com/photo-1630343710506-89f8b9f21d31?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwyfHxwZXJzb24lMjByZWFkaW5nJTIwYm9vayUyMGNvenl8ZW58MHx8fHwxNzg0NTU0MTA5fDA&ixlib=rb-4.1.0&q=85";
const QUOTES_BG =
  "https://images.pexels.com/photos/32516751/pexels-photo-32516751.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Landing() {
  const { user } = useAuth();
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api
      .get("/reviews", { params: { sort: "top", limit: 3 } })
      .then(({ data }) => setFeatured(data.items))
      .catch(() => {});
  }, []);

  return (
    <div>
      <section className="relative">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary font-bold mb-6">A Home For Readers</p>
            <h1 className="font-serif text-5xl sm:text-6xl italic font-light leading-none">
              Every book is a door to somewhere else.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-foreground/80 max-w-md">
              Share honest reviews, suggest hidden gems, and talk books with a community that reads as much as you do.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/reviews">
                <Button
                  size="lg"
                  data-testid={LANDING.heroExploreButton}
                  className="rounded-sm h-12 px-8 hover:-translate-y-0.5 transition-transform"
                >
                  Explore Reviews <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
              {!user && (
                <Link to="/register">
                  <Button
                    size="lg"
                    variant="outline"
                    data-testid={LANDING.heroGetStartedButton}
                    className="rounded-sm h-12 px-8 hover:-translate-y-0.5 transition-transform"
                  >
                    Join Inkwell
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <div className="relative">
            <img src={HERO_IMG} alt="Person reading a book" className="w-full h-[420px] object-cover border border-border" />
            <div className="absolute -bottom-6 -left-6 bg-card border border-border p-5 max-w-[220px] hidden sm:block">
              <p className="font-serif italic text-lg">"A reader lives a thousand lives."</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20 border-y border-border overflow-hidden">
        <div className="absolute inset-0">
          <img src={QUOTES_BG} alt="" className="w-full h-full object-cover opacity-10" />
        </div>
        <div className="relative">
          <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground font-bold mb-10">
            Words On Reading
          </p>
          <QuotesMarquee />
        </div>
      </section>

      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">Loved By Readers</p>
          <h2 className="font-serif text-3xl sm:text-4xl mt-2 mb-10">Top Reviews This Season</h2>
          <div className="space-y-5">
            {featured.map((r) => (
              <ReviewCard key={r._id} review={r} />
            ))}
          </div>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-6 py-24 grid sm:grid-cols-3 gap-10">
        {[
          { icon: Feather, title: "Suggest Books", desc: "Add any title to the shelf, complete with cover and details fetched automatically." },
          { icon: BookOpen, title: "Write Reviews", desc: "Rate, reflect, and publish honest reviews other readers can trust." },
          { icon: Heart, title: "Like & Discuss", desc: "Like the reviews you love and jump into the comments to talk books." },
        ].map((f, i) => (
          <div key={i} className="border border-border p-8 bg-card">
            <f.icon strokeWidth={1.5} className="text-primary mb-4" size={28} />
            <h3 className="font-serif text-xl mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="bg-primary text-primary-foreground py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl italic font-light">
            Your next favorite book is waiting to be reviewed.
          </h2>
          <Link to={user ? "/reviews/new" : "/register"}>
            <Button size="lg" variant="secondary" data-testid={LANDING.ctaButton} className="mt-8 rounded-sm h-12 px-8">
              {user ? "Write a Review" : "Get Started — It's Free"}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
