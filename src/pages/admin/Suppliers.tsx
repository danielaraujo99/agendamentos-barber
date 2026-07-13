/**
 * Fornecedores — CRUD simples para apoiar o módulo de estoque.
 */
import { useEffect, useState } from "react";
import { Plus, Loader2, Building2, X, Trash2, Pencil } from "lucide-react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import { toast } from "sonner";
import { ModuleSection, Stat, EmptyState, PrimaryButton, GhostButton, TextField } from "@/components/admin/ModuleUI";
import { ModuleHeader } from "@/components/admin/HelpModal";

interface Supplier {
  id: string; name: string; contact_name: string | null; phone: string | null;
  email: string | null; document: string | null; address: string | null; category: string | null;
  notes: string | null; active: boolean;
}

const empty: Omit<Supplier, "id" | "active"> = {
  name: "", contact_name: "", phone: "", email: "", document: "", address: "", category: "", notes: "",
};

import { usePanelSession } from "@/hooks/usePanelSession";
import BarberRestrictedNotice from "@/components/admin/BarberRestrictedNotice";

const Suppliers = () => {
  const session = usePanelSession();
  if (session.isBarberOnly) {
    return <BarberRestrictedNotice title="Fornecedores restrito" message="Apenas administradores e gerentes podem gerenciar fornecedores." />;
  }
  const [list, setList] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<Supplier | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("suppliers").select("*").order("name", { ascending: true });
    setList((data as Supplier[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEdit(null); setForm(empty); setShow(true); };
  const openEdit = (s: Supplier) => {
    setEdit(s);
    setForm({
      name: s.name, contact_name: s.contact_name || "", phone: s.phone || "", email: s.email || "",
      document: s.document || "", address: s.address || "", category: s.category || "", notes: s.notes || "",
    });
    setShow(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    const payload: any = {
      ...form,
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      email: form.email || null,
      document: form.document || null,
      address: form.address || null,
      category: form.category || null,
      notes: form.notes || null,
    };
    const { error } = edit
      ? await supabase.from("suppliers").update(payload).eq("id", edit.id)
      : await supabase.from("suppliers").insert({ ...payload, active: true });
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setShow(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este fornecedor?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Fornecedores"
        description="Cadastro de quem fornece produtos e insumos — usado pelo módulo de Estoque."
        help={{
          title: "Como funcionam os Fornecedores",
          intro: "Aqui você mantém o cadastro de quem vende pra você (distribuidoras, atacados, marcas).",
          steps: [
            { title: "Cadastrar", description: "Nome, contato, telefone, e-mail e categoria (cosméticos, ferramentas, etc.)." },
            { title: "Vincular ao estoque", description: "Em Estoque, ao cadastrar um item, você escolhe o fornecedor." },
            { title: "Histórico", description: "Saiba rapidamente quais itens cada fornecedor abastece." },
          ],
          tips: [
            "Use 'categoria' pra agrupar fornecedores — facilita busca depois.",
            "Cadastre o documento (CNPJ) pra emitir notas/comprovantes corretos.",
          ],
        }}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Cadastrados" value={String(list.length)} />
        <Stat label="Ativos" value={String(list.filter((s) => s.active).length)} tone="positive" />
        <Stat label="Categorias" value={String(new Set(list.map((s) => s.category).filter(Boolean)).size)} />
      </div>

      <ModuleSection title="Fornecedores"
        actions={
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Cadastro em breve"
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold border border-border bg-card/40 text-muted-foreground opacity-40 cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" /> Novo
          </button>
        }>
        {list.length === 0 ? (
          <EmptyState icon={<Building2 className="w-5 h-5" />} title="Nenhum fornecedor" description="Cadastre fornecedores para vincular a itens de estoque." />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs min-w-[700px]">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Nome</th>
                  <th className="px-2 py-2 text-left font-medium">Categoria</th>
                  <th className="px-2 py-2 text-left font-medium">Contato</th>
                  <th className="px-2 py-2 text-left font-medium">Telefone</th>
                  <th className="px-2 py-2 text-left font-medium">E-mail</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid hsl(0 0% 100% / 0.05)" }}>
                    <td className="px-2 py-2 text-foreground font-medium">{s.name}</td>
                    <td className="px-2 py-2 text-muted-foreground">{s.category || "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{s.contact_name || "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{s.phone || "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{s.email || "—"}</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(s)} className="p-1 rounded hover:bg-white/5"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button onClick={() => remove(s.id)} className="p-1 rounded hover:bg-white/5"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ModuleSection>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShow(false)}>
          <div className="w-full max-w-2xl rounded-2xl p-5 max-h-[90vh] overflow-y-auto"
            style={{ background: "hsl(220 25% 8%)", border: "1px solid hsl(0 0% 100% / 0.08)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">{edit ? "Editar fornecedor" : "Novo fornecedor"}</h3>
              <button onClick={() => setShow(false)} className="p-1 rounded hover:bg-white/5"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
              <TextField label="Categoria" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Cosméticos, Equipamentos…" />
              <TextField label="Contato" value={form.contact_name || ""} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              <TextField label="Telefone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <TextField label="E-mail" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <TextField label="CNPJ/CPF" value={form.document || ""} onChange={(e) => setForm({ ...form, document: e.target.value })} />
              <div className="sm:col-span-2"><TextField label="Endereço" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="sm:col-span-2"><TextField label="Observações" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <GhostButton onClick={() => setShow(false)}>Cancelar</GhostButton>
              <PrimaryButton onClick={save}>Salvar</PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
