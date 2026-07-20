import { quotes } from "@/data/quotes";

export function QuotesMarquee() {
  const list = [...quotes, ...quotes];
  return (
    <div className="relative overflow-hidden">
      <div className="flex gap-16 animate-marquee w-max">
        {list.map((q, i) => (
          <div key={i} data-testid={`landing-quote-card-${i}`} className="flex-shrink-0 w-[380px] sm:w-[520px]">
            <p className="font-serif italic text-3xl sm:text-4xl text-foreground/90 leading-snug">"{q.text}"</p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">— {q.author}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
