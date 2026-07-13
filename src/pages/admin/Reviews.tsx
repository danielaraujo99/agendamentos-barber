import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Star,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAdminReviews, useUpdateReview, useDeleteReview, type Review } from "@/hooks/useReviews";
import { ReviewSettingsModal } from "@/components/admin/ReviewSettingsModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Stars = ({ n, size = 14 }: { n: number; size?: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className="shrink-0"
        style={{
          width: size,
          height: size,
          color: i <= n ? "hsl(45 95% 60%)" : "hsl(0 0% 25%)",
          fill: i <= n ? "currentColor" : "transparent",
        }}
      />
    ))}
  </div>
);

const Reviews = () => {
  const { data: reviews = [], isLoading } = useAdminReviews();
  const updateMut = useUpdateReview();
  const deleteMut = useDeleteReview();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [configOpen, setConfigOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);

  const filtered = useMemo(() => {
    let list = reviews;
    if (filter !== "all") list = list.filter((r) => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(q) ||
          (r.comment || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [reviews, search, filter]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const approved = reviews.filter((r) => r.status === "approved").length;
    const pending = reviews.filter((r) => r.status === "pending").length;
    const avg = total
      ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)
      : "0.0";
    return { total, approved, pending, avg };
  }, [reviews]);

  const togglePublic = async (r: Review) => {
    try {
      await updateMut.mutateAsync({ id: r.id, patch: { is_public: !r.is_public } });
    } catch (e) {
      toast({ title: "Erro", description: String(e), variant: "destructive" });
    }
  };
  const setStatus = async (r: Review, status: "approved" | "rejected") => {
    try {
      await updateMut.mutateAsync({ id: r.id, patch: { status } });
      toast({ title: status === "approved" ? "Aprovada" : "Recusada" });
    } catch (e) {
      toast({ title: "Erro", description: String(e), variant: "destructive" });
    }
  };

  const filterTabs = [
    { id: "all" as const, label: "Todas", count: reviews.length },
    { id: "approved" as const, label: "Aprovadas", count: stats.approved },
    { id: "pending" as const, label: "Pendentes", count: stats.pending },
    { id: "rejected" as const, label: "Recusadas", count: reviews.filter((r) => r.status === "rejected").length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6" /> Avaliações
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Depoimentos enviados pelos clientes via link de avaliação.
          </p>
        </div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Configurações (em breve)"
          className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-border bg-card/40 text-muted-foreground opacity-40 cursor-not-allowed"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "hsl(245 60% 70%)", bg: "hsl(245 60% 55% / 0.12)" },
          { label: "Aprovadas", value: stats.approved, color: "hsl(140 60% 60%)", bg: "hsl(140 60% 50% / 0.12)" },
          { label: "Pendentes", value: stats.pending, color: "hsl(40 90% 60%)", bg: "hsl(40 90% 55% / 0.12)" },
          { label: "Média", value: stats.avg, color: "hsl(45 95% 60%)", bg: "hsl(45 95% 55% / 0.12)" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card/60 p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </section>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {filterTabs.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border"
              style={{
                background: active ? "hsl(245 60% 55% / 0.12)" : "transparent",
                color: active ? "hsl(245 60% 70%)" : "hsl(var(--muted-foreground))",
                borderColor: active ? "hsl(245 60% 55% / 0.3)" : "hsl(var(--border))",
              }}
            >
              {f.label} <span className="opacity-60">· {f.count}</span>
            </button>
          );
        })}
        <div className="relative ml-auto w-full sm:w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou comentário..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card/40 text-sm outline-none focus:border-primary/40"
          />
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground rounded-xl border border-dashed border-border">
          Nenhuma avaliação encontrada.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => (
            <motion.article
              key={r.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card/60 p-4"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold uppercase shrink-0"
                  style={{
                    background: "hsl(245 60% 55% / 0.12)",
                    color: "hsl(245 60% 70%)",
                  }}
                >
                  {r.customer_name.slice(0, 2)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-foreground">{r.customer_name}</h4>
                    <Stars n={r.rating} />
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
                      style={
                        r.status === "approved"
                          ? { background: "hsl(140 60% 50% / 0.1)", color: "hsl(140 60% 60%)", borderColor: "hsl(140 60% 50% / 0.25)" }
                          : r.status === "rejected"
                          ? { background: "hsl(0 60% 50% / 0.1)", color: "hsl(0 60% 60%)", borderColor: "hsl(0 60% 50% / 0.25)" }
                          : { background: "hsl(40 90% 50% / 0.1)", color: "hsl(40 90% 60%)", borderColor: "hsl(40 90% 50% / 0.25)" }
                      }
                    >
                      {r.status === "approved" ? "aprovada" : r.status === "rejected" ? "recusada" : "pendente"}
                    </span>
                    {!r.is_public && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border bg-muted/50 text-muted-foreground border-border">
                        oculta no site
                      </span>
                    )}
                  </div>
                  {r.comment && (
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{r.comment}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground/70 mt-2">
                    {format(new Date(r.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 shrink-0">
                  {r.status !== "approved" && (
                    <button
                      onClick={() => setStatus(r, "approved")}
                      title="Aprovar"
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-card/40 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  {r.status !== "rejected" && (
                    <button
                      onClick={() => setStatus(r, "rejected")}
                      title="Recusar"
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-card/40 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => togglePublic(r)}
                    title={r.is_public ? "Ocultar do site" : "Exibir no site"}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-card/40 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  >
                    {r.is_public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(r)}
                    title="Excluir"
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-card/40 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <ReviewSettingsModal open={configOpen} onOpenChange={setConfigOpen} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await deleteMut.mutateAsync(deleteTarget.id);
                  toast({ title: "Excluída" });
                } catch (e) {
                  toast({ title: "Erro", description: String(e), variant: "destructive" });
                }
                setDeleteTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Reviews;
