import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Save, Search, ShieldCheck, UserCog, Loader2, Lock, Unlock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "manager" | "barber";

interface PanelUserRow {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  barber_id: string | null;
  permissions: Record<string, boolean>;
  active: boolean;
  created_at: string;
}

interface BarberOpt { id: string; name: string }

const PERMISSION_GROUPS: { label: string; keys: { key: string; label: string }[] }[] = [
  {
    label: "Operação",
    keys: [
      { key: "dashboard", label: "Dashboard" },
      { key: "appointments", label: "Agendamentos" },
      { key: "fila", label: "Fila de espera" },
      { key: "commands", label: "Comandas" },
      { key: "cashier", label: "Caixa" },
      { key: "services", label: "Serviços" },
      { key: "barbers", label: "Barbeiros" },
      { key: "reviews", label: "Avaliações" },
    ],
  },
  {
    label: "Financeiro",
    keys: [
      { key: "finance", label: "Financeiro" },
      { key: "commissions", label: "Comissões" },
      { key: "credit", label: "Fiados" },
      { key: "coupons", label: "Cupons" },
    ],
  },
  {
    label: "Loja & Estoque",
    keys: [
      { key: "store", label: "Loja" },
      { key: "inventory", label: "Estoque" },
      { key: "suppliers", label: "Fornecedores" },
    ],
  },
  {
    label: "Sistema",
    keys: [
      { key: "settings", label: "Configurações" },
    ],
  },
];

const DEFAULT_PERMISSIONS_BY_ROLE: Record<Role, Record<string, boolean>> = {
  admin: Object.fromEntries(PERMISSION_GROUPS.flatMap((g) => g.keys.map((k) => [k.key, true]))),
  manager: {
    dashboard: true, appointments: true, commands: true, cashier: true, services: true, barbers: true, reviews: true,
    finance: true, commissions: true, credit: true, coupons: true,
    store: true, inventory: true, suppliers: true,
    settings: false,
  },
  barber: {
    dashboard: true, appointments: true, commands: true, cashier: false, services: true, barbers: false, reviews: true,
    finance: false, commissions: true, credit: false, coupons: false,
    store: false, inventory: false, suppliers: false,
    settings: false,
  },
};

const ROLE_LABELS: Record<Role, string> = { admin: "Admin", manager: "Gerente", barber: "Barbeiro" };
const ROLE_BADGE: Record<Role, string> = {
  admin: "hsl(0 70% 50% / 0.15) ; hsl(0 80% 70%)",
  manager: "hsl(245 60% 55% / 0.15) ; hsl(245 70% 75%)",
  barber: "hsl(160 60% 40% / 0.15) ; hsl(160 60% 65%)",
};

const emptyForm = {
  email: "",
  full_name: "",
  password: "",
  role: "barber" as Role,
  barber_id: "" as string,
  permissions: { ...DEFAULT_PERMISSIONS_BY_ROLE.barber },
  active: true,
};

const Users = () => {
  const [users, setUsers] = useState<PanelUserRow[]>([]);
  const [barbers, setBarbers] = useState<BarberOpt[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const [uRes, bRes] = await Promise.all([
      supabase.from("panel_users").select("*").order("created_at", { ascending: false }),
      supabase.from("barbers").select("id,name").eq("active", true).order("sort_order"),
    ]);
    if (uRes.data) setUsers(uRes.data as PanelUserRow[]);
    if (bRes.data) setBarbers(bRes.data as BarberOpt[]);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter((u) => u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q));
  }, [users, search]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowPwd(false);
    setShowModal(true);
  };

  const openEdit = (u: PanelUserRow) => {
    setEditing(u.id);
    setForm({
      email: u.email,
      full_name: u.full_name,
      password: "",
      role: u.role,
      barber_id: u.barber_id || "",
      permissions: { ...DEFAULT_PERMISSIONS_BY_ROLE[u.role], ...(u.permissions || {}) },
      active: u.active,
    });
    setShowPwd(false);
    setShowModal(true);
  };

  const onChangeRole = (role: Role) => {
    setForm((p) => ({ ...p, role, permissions: { ...DEFAULT_PERMISSIONS_BY_ROLE[role] } }));
  };

  const togglePerm = (key: string) => {
    setForm((p) => ({ ...p, permissions: { ...p.permissions, [key]: !p.permissions[key] } }));
  };

  const handleSave = async () => {
    if (!form.email.trim() || !form.full_name.trim()) {
      toast.error("Preencha nome e e-mail");
      return;
    }
    if (!editing && form.password.length < 6) {
      toast.error("Senha mínima de 6 caracteres");
      return;
    }
    if (form.role === "barber" && !form.barber_id) {
      toast.error("Selecione o barbeiro vinculado");
      return;
    }

    setSaving(true);
    try {
      let password_hash: string | null = null;
      if (form.password) {
        const { data: hash, error: hashErr } = await supabase.rpc("hash_panel_password", { _plain: form.password });
        if (hashErr) throw hashErr;
        password_hash = hash as string;
      }

      const payload: Record<string, any> = {
        email: form.email.trim().toLowerCase(),
        full_name: form.full_name.trim(),
        role: form.role,
        barber_id: form.role === "barber" ? form.barber_id : null,
        permissions: form.permissions,
        active: form.active,
      };
      if (password_hash) payload.password_hash = password_hash;

      if (editing) {
        const { error } = await supabase.from("panel_users").update(payload as any).eq("id", editing);
        if (error) throw error;
        toast.success("Usuário atualizado");
      } else {
        if (!payload.password_hash) {
          throw new Error("Senha obrigatória para novo usuário");
        }
        const { error } = await supabase.from("panel_users").insert(payload as any);
        if (error) throw error;
        toast.success("Usuário criado");
      }
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: PanelUserRow) => {
    const { error } = await supabase.from("panel_users").update({ active: !u.active }).eq("id", u.id);
    if (error) { toast.error("Erro ao alterar status"); return; }
    toast.success(!u.active ? "Usuário ativado" : "Usuário desativado");
    fetchUsers();
  };

  const handleDelete = async (u: PanelUserRow) => {
    if (!confirm(`Excluir o usuário ${u.full_name}?`)) return;
    const { error } = await supabase.from("panel_users").delete().eq("id", u.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Usuário removido");
    fetchUsers();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50 mb-1">Equipe</p>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Usuários do painel</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Crie logins individuais para barbeiros e gerentes — cada um vê apenas o que você liberar.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:translate-y-[-1px]"
          style={{ background: "hsl(245 60% 55%)", color: "white" }}
        >
          <Plus className="w-4 h-4" /> Novo usuário
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="glass-input pl-10"
        />
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: "hsl(0 0% 100% / 0.04)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
          <UserCog className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum usuário ainda. Crie o primeiro.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((u) => {
            const [bg, color] = ROLE_BADGE[u.role].split(";").map((s) => s.trim());
            const linkedBarber = u.barber_id ? barbers.find((b) => b.id === u.barber_id)?.name : null;
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 flex flex-col gap-2"
                style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.08)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{u.full_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md shrink-0" style={{ background: bg, color }}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                  {linkedBarber && <span className="px-1.5 py-0.5 rounded-md bg-foreground/5">{linkedBarber}</span>}
                  <span className={`px-1.5 py-0.5 rounded-md ${u.active ? "bg-emerald-500/10 text-emerald-500" : "bg-foreground/5"}`}>
                    {u.active ? "Ativo" : "Inativo"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-foreground/5">
                    {Object.values(u.permissions || {}).filter(Boolean).length} permissões
                  </span>
                </div>

                <div className="flex gap-2 mt-2">
                  <button onClick={() => openEdit(u)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-foreground/5 hover:bg-foreground/10 transition">
                    <Pencil className="w-3 h-3" /> Editar
                  </button>
                  <button onClick={() => toggleActive(u)} className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-foreground/5 hover:bg-foreground/10 transition">
                    {u.active ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                  <button onClick={() => handleDelete(u)} className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 transition">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            style={{ background: "hsl(0 0% 0% / 0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              className="w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
              style={{ background: "hsl(220 25% 6%)", border: "1px solid hsl(0 0% 100% / 0.1)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b" style={{ background: "hsl(220 25% 6%)", borderColor: "hsl(0 0% 100% / 0.08)" }}>
                <div>
                  <h3 className="text-lg font-black">{editing ? "Editar usuário" : "Novo usuário"}</h3>
                  <p className="text-[11px] text-muted-foreground">Acesso ao painel administrativo</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg bg-foreground/5 hover:bg-foreground/10">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Nome completo *</label>
                    <input className="glass-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="João da Silva" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">E-mail *</label>
                    <input className="glass-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="joao@barbearia.com" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                      Senha {editing ? "(deixe vazio para manter)" : "*"}
                    </label>
                    <div className="relative">
                      <input
                        className="glass-input pr-10"
                        type={showPwd ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder={editing ? "Nova senha" : "Mínimo 6 caracteres"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:bg-foreground/5"
                      >
                        {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Função</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["admin", "manager", "barber"] as Role[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => onChangeRole(r)}
                        className="p-3 rounded-xl text-xs font-bold transition"
                        style={{
                          background: form.role === r ? "hsl(245 60% 55%)" : "hsl(0 0% 100% / 0.04)",
                          color: form.role === r ? "white" : "hsl(var(--muted-foreground))",
                          border: `1px solid ${form.role === r ? "hsl(245 60% 55%)" : "hsl(0 0% 100% / 0.08)"}`,
                        }}
                      >
                        {ROLE_LABELS[r]}
                      </button>
                    ))}
                  </div>
                </div>

                {form.role === "barber" && (
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Barbeiro vinculado *</label>
                    <select className="glass-input" value={form.barber_id} onChange={(e) => setForm({ ...form, barber_id: e.target.value })}>
                      <option value="">Selecione…</option>
                      {barbers.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      O barbeiro só verá agendamentos, comandas e comissões vinculados ao seu nome.
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Permissões</label>
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {Object.values(form.permissions).filter(Boolean).length} ativas
                    </span>
                  </div>

                  <div className="space-y-3">
                    {PERMISSION_GROUPS.map((g) => (
                      <div key={g.label} className="rounded-xl p-3" style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{g.label}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {g.keys.map((k) => {
                            const active = !!form.permissions[k.key];
                            return (
                              <button
                                key={k.key}
                                type="button"
                                onClick={() => togglePerm(k.key)}
                                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition"
                                style={{
                                  background: active ? "hsl(245 60% 55% / 0.15)" : "hsl(0 0% 100% / 0.025)",
                                  border: `1px solid ${active ? "hsl(245 60% 55% / 0.4)" : "hsl(0 0% 100% / 0.06)"}`,
                                  color: active ? "hsl(245 70% 80%)" : "hsl(var(--muted-foreground))",
                                }}
                              >
                                <span className="truncate">{k.label}</span>
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: active ? "hsl(245 70% 70%)" : "hsl(0 0% 100% / 0.15)" }} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Usuário ativo</span>
                  </label>
                </div>
              </div>

              <div className="sticky bottom-0 p-4 flex gap-2 border-t" style={{ background: "hsl(220 25% 6%)", borderColor: "hsl(0 0% 100% / 0.08)" }}>
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-foreground/5 hover:bg-foreground/10">
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: "hsl(245 60% 55%)", color: "white" }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editing ? "Salvar alterações" : "Criar usuário"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Users;
