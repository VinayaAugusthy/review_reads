import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { PLACEHOLDER_COVER } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api, formatApiErrorDetail } from "@/lib/api";
import { BOOK } from "@/constants/testIds";
import { toast } from "sonner";
import { Search, Plus } from "lucide-react";

export function AddBookDialog({ onAdded, trigger }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [manual, setManual] = useState({ title: "", author: "", cover_url: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { data } = await api.get("/books/search", { params: { q: query } });
      setResults(data);
    } catch {
      toast.error("Search failed, please try again");
    } finally {
      setSearching(false);
    }
  };

  const addFromResult = async (r) => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/books", r);
      toast.success(`Added "${data.title}" to the shelf`);
      setOpen(false);
      onAdded && onAdded(data);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  const addManual = async (e) => {
    e.preventDefault();
    if (!manual.title || !manual.author) return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/books", manual);
      toast.success(`Added "${data.title}" to the shelf`);
      setOpen(false);
      onAdded && onAdded(data);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button data-testid={BOOK.addBookButton} className="rounded-sm">
            <Plus size={16} className="mr-1" /> Suggest a Book
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Suggest a Book</DialogTitle>
          <DialogDescription>Search for a title or add its details manually to add it to the shelf.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="search">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="manual">Enter Manually</TabsTrigger>
          </TabsList>
          <TabsContent value="search" className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                data-testid={BOOK.searchInput}
                placeholder="Search by title or author..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button type="submit" size="icon" variant="secondary">
                <Search size={16} />
              </Button>
            </form>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {searching && <p className="text-sm text-muted-foreground">Searching...</p>}
              {results.map((r) => (
                <button
                  key={r.google_books_id}
                  type="button"
                  data-testid={BOOK.searchResultItem(r.google_books_id)}
                  onClick={() => addFromResult(r)}
                  disabled={submitting}
                  className="w-full flex gap-3 items-center text-left p-2 border border-border hover:border-primary/50 transition-colors"
                >
                  <img
                    src={r.cover_url || PLACEHOLDER_COVER}
                    alt={r.title}
                    className="w-10 h-14 object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.author}</p>
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="manual">
            <form onSubmit={addManual} className="space-y-3">
              <Input
                data-testid={BOOK.manualTitleInput}
                placeholder="Title"
                value={manual.title}
                onChange={(e) => setManual({ ...manual, title: e.target.value })}
                required
              />
              <Input
                data-testid={BOOK.manualAuthorInput}
                placeholder="Author"
                value={manual.author}
                onChange={(e) => setManual({ ...manual, author: e.target.value })}
                required
              />
              <Input
                data-testid={BOOK.manualCoverInput}
                placeholder="Cover image URL (optional)"
                value={manual.cover_url}
                onChange={(e) => setManual({ ...manual, cover_url: e.target.value })}
              />
              <Textarea
                data-testid={BOOK.manualDescriptionInput}
                placeholder="Short description (optional)"
                value={manual.description}
                onChange={(e) => setManual({ ...manual, description: e.target.value })}
              />
              <Button type="submit" data-testid={BOOK.manualSubmitButton} disabled={submitting} className="w-full rounded-sm">
                Add to Shelf
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
