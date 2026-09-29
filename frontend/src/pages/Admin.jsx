import { useEffect, useState, useCallback, useRef } from "react";
import { Navigate } from "react-router-dom";
import { LayoutDashboard, Boxes, Inbox, MessageSquare, Users, Crown, Settings as Cog,
         Plus, Pencil, Trash2, Eye, EyeOff, Send, X } from "lucide-react";
import api, { mediaUrl, priceLabel, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { ListingForm } from "@/components/admin/ListingForm";
import { toast } from "sonner";

const STATUSES = ["new", "contacted", "in_progress", "confirmed", "closed"];
const STATUS_COLORS = {
  new: "bg-[#C87D55]/15 text-[#B36B45]", contacted: "bg-[#A3B899]/25 text-[#2C4035]",
  in_progress: "bg-[#2C4035]/10 text-[#2C4035]", confirmed: "bg-[#1A2E26] text-[#EAE3D2]", closed: "bg-[#8A847C]/20 text-[#8A847C]",
};

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "inquiries", label: "Inquiries", icon: Inbox },
  { id: "concierge", label: "Concierge", icon: MessageSquare },
  { id: "customers", label: "Customers", icon: Users },
  { id: "vip", label: "VIP", icon: Crown },
  { id: "settings", label: "Settings", icon: Cog },
];

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-lg border border-[#1A2E26]/10 p-5">
      <p className="text-[11px] uppercase tracking-wide text-[#8A847C]">{label}</p>
      <p className="font-serif text-4xl text-[#1A2E26] mt-2">{value}</p>
    </div>
  );
}

function Dashboard() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get("/admin/stats").then((r) => setS(r.data)).catch(() => {}); }, []);
  if (!s) return <div className="animate-pulse h-40" />;
  const cards = [["Total listings", s.total_listings], ["Published", s.published_listings], ["New inquiries", s.new_inquiries],
    ["Active conversations", s.active_conversations], ["Customers", s.customers], ["VIP members", s.vip_members]];
  return <div data-testid="admin-dashboard" className="grid grid-cols-2 lg:grid-cols-3 gap-4">{cards.map(([l, v]) => <StatCard key={l} label={l} value={v} />)}</div>;
}

function Inventory() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // listing | 'new'
  const load = useCallback(() => api.get("/admin/listings").then((r) => setItems(r.data)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const togglePublish = async (l) => {
    await api.put(`/admin/listings/${l.slug}`, { ...l, published: !l.published });
    load();
  };
  const del = async (l) => {
    if (!window.confirm(`Delete ${l.name}?`)) return;
    await api.delete(`/admin/listings/${l.slug}`); toast.success("Deleted"); load();
  };

  return (
    <div data-testid="admin-inventory">
      <div className="flex justify-between items-center mb-5">
        <p className="text-sm text-[#8A847C]">{items.length} listings</p>
        <button data-testid="inventory-new" onClick={() => setEditing("new")} className="flex items-center gap-2 px-4 py-2.5 bg-[#1A2E26] text-[#EAE3D2] text-sm rounded-md hover:bg-[#2C4035]"><Plus size={16} /> New Listing</button>
      </div>
      <div className="space-y-2">
        {items.map((l) => (
          <div key={l.slug} data-testid={`inventory-row-${l.slug}`} className="bg-white rounded-lg border border-[#1A2E26]/10 p-3 flex items-center gap-4">
            <img src={mediaUrl(l.images?.[0])} alt="" className="h-14 w-14 rounded-md object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#1A2E26] truncate">{l.name}</p>
              <p className="text-xs text-[#8A847C]">{l.category}{l.subcategory ? ` · ${l.subcategory}` : ""} · {l.location} · {priceLabel(l)}</p>
            </div>
            {l.featured && <span className="text-[10px] uppercase bg-[#C87D55]/15 text-[#B36B45] px-2 py-1 rounded-full">Featured</span>}
            <span className={`text-[10px] uppercase px-2 py-1 rounded-full ${l.published ? "bg-[#1A2E26] text-[#EAE3D2]" : "bg-[#8A847C]/20 text-[#8A847C]"}`}>{l.published ? "Published" : "Draft"}</span>
            <div className="flex items-center gap-1">
              <button data-testid={`inventory-publish-${l.slug}`} onClick={() => togglePublish(l)} title="Publish/unpublish" className="p-2 text-[#2C4035] hover:text-[#C87D55]">{l.published ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              <button data-testid={`inventory-edit-${l.slug}`} onClick={() => setEditing(l)} className="p-2 text-[#2C4035] hover:text-[#C87D55]"><Pencil size={16} /></button>
              <button data-testid={`inventory-delete-${l.slug}`} onClick={() => del(l)} className="p-2 text-[#2C4035] hover:text-red-600"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      {editing && <ListingForm initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function Inquiries() {
  const [items, setItems] = useState([]);
  const [openRow, setOpenRow] = useState(null);
  const load = useCallback(() => api.get("/admin/requests").then((r) => setItems(r.data)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const setStatus = async (id, status) => { await api.patch(`/admin/requests/${id}/status`, { status }); load(); };

  if (items.length === 0) return <p data-testid="admin-inquiries" className="text-[#8A847C] text-sm">No inquiries yet.</p>;
  return (
    <div data-testid="admin-inquiries" className="space-y-2">
      {items.map((r) => (
        <div key={r.id} className="bg-white rounded-lg border border-[#1A2E26]/10">
          <button onClick={() => setOpenRow(openRow === r.id ? null : r.id)} className="w-full text-left p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-[#1A2E26] truncate">{r.listing_name} <span className="text-xs text-[#8A847C] capitalize">· {r.request_type}</span></p>
              <p className="text-xs text-[#8A847C]">{r.customer_name} · {r.customer_email} · {new Date(r.created_at).toLocaleDateString()}</p>
            </div>
            <span className={`text-xs px-3 py-1.5 rounded-full capitalize shrink-0 ${STATUS_COLORS[r.status] || STATUS_COLORS.new}`}>{r.status.replace("_", " ")}</span>
          </button>
          {openRow === r.id && (
            <div data-testid={`inquiry-detail-${r.id}`} className="px-4 pb-4 border-t border-[#1A2E26]/10 pt-3 text-sm text-[#2C4035] space-y-1">
              <p><b>Category:</b> {r.category} · <b>Location:</b> {r.location || "—"}</p>
              <p><b>Dates:</b> {r.start_date || "—"} → {r.end_date || "—"} · <b>Guests:</b> {r.guests ?? "—"} · <b>Duration:</b> {r.duration || "—"}</p>
              <p><b>Phone:</b> {r.phone || "—"} {r.chauffeur ? "· Chauffeur" : ""}</p>
              {r.requirements?.length > 0 && <p><b>Requirements:</b> {r.requirements.join(", ")}</p>}
              {r.notes && <p><b>Message:</b> {r.notes}</p>}
              <div className="flex items-center gap-2 pt-3">
                <span className="text-xs text-[#8A847C]">Status</span>
                <select data-testid={`inquiry-status-${r.id}`} value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} className="px-3 py-2 rounded-md bg-[#F5F0EB] border border-[#1A2E26]/15 text-sm capitalize">
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Concierge() {
  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const activeId = active?.id;

  const loadList = useCallback(() => api.get("/concierge/conversations").then((r) => setConvs(r.data)).catch(() => {}), []);
  const loadConv = useCallback((id) => api.get(`/concierge/conversations/${id}`).then((r) => setActive(r.data)).catch(() => {}), []);

  useEffect(() => { loadList(); const t = setInterval(loadList, 5000); return () => clearInterval(t); }, [loadList]);
  useEffect(() => { if (!activeId) return; const t = setInterval(() => loadConv(activeId), 4000); return () => clearInterval(t); }, [activeId, loadConv]);
  useEffect(() => { if (activeId) api.post(`/admin/conversations/${activeId}/read`).then(loadList).catch(() => {}); }, [activeId, active?.messages?.length, loadList]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [active]);

  const openConv = (c) => loadConv(c.id);
  const reply = async (e) => {
    e.preventDefault();
    if (!input.trim() || !active) return;
    const body = input.trim(); setInput("");
    setActive((a) => ({ ...a, messages: [...(a.messages || []), { id: Math.random(), sender: "admin", body }] }));
    await api.post(`/admin/conversations/${active.id}/messages`, { body });
    loadConv(active.id);
  };

  return (
    <div data-testid="admin-concierge" className="grid md:grid-cols-[320px_1fr] gap-4 h-[600px]">
      <div className="bg-white rounded-lg border border-[#1A2E26]/10 overflow-y-auto">
        {convs.length === 0 && <p className="p-5 text-sm text-[#8A847C]">No conversations.</p>}
        {convs.map((c) => (
          <button key={c.id} data-testid={`conv-item-${c.id}`} onClick={() => openConv(c)} className={`w-full text-left p-4 border-b border-[#1A2E26]/8 hover:bg-[#F5F0EB] ${activeId === c.id ? "bg-[#F5F0EB]" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-[#1A2E26] text-sm truncate">{c.customer_name}</p>
              {c.unread_admin > 0 && <span className="text-[10px] bg-[#C87D55] text-white px-2 py-0.5 rounded-full shrink-0">{c.unread_admin}</span>}
            </div>
            {c.listing_name && <p className="text-[11px] text-[#C87D55]">{c.listing_name}</p>}
            <p className="text-xs text-[#8A847C] truncate mt-0.5">{c.last_message}</p>
          </button>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-[#1A2E26]/10 flex flex-col">
        {!active ? <div className="flex-1 flex items-center justify-center text-[#8A847C] text-sm">Select a conversation</div> : (
          <>
            <div className="px-5 py-3 border-b border-[#1A2E26]/10">
              <p className="font-medium text-[#1A2E26]">{active.customer_name} <span className="text-xs text-[#8A847C]">· {active.customer_email}</span></p>
              {active.listing_name && <p className="text-xs text-[#C87D55]">{active.listing_name}</p>}
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
              {active.messages?.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${m.sender === "admin" ? "bg-[#C87D55] text-white rounded-br-sm" : "bg-[#F5F0EB] text-[#2C4035] rounded-bl-sm"}`}>{m.body}</div>
                </div>
              ))}
            </div>
            <form onSubmit={reply} className="p-3 border-t border-[#1A2E26]/10 flex items-center gap-2">
              <input data-testid="admin-reply-input" placeholder="Reply to customer…" value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 px-4 py-2.5 rounded-full bg-[#F5F0EB] border border-[#1A2E26]/10 text-sm focus:outline-none focus:border-[#C87D55]" />
              <button data-testid="admin-reply-send" type="submit" className="h-10 w-10 rounded-full bg-[#1A2E26] text-[#EAE3D2] flex items-center justify-center hover:bg-[#2C4035]"><Send size={16} /></button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Customers() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/admin/customers").then((r) => setItems(r.data)).catch(() => {}); }, []);
  return (
    <div data-testid="admin-customers" className="space-y-2">
      {items.length === 0 && <p className="text-[#8A847C] text-sm">No customers yet.</p>}
      {items.map((c) => (
        <div key={c.id} className="bg-white rounded-lg border border-[#1A2E26]/10 p-4 flex items-center justify-between gap-3">
          <div><p className="font-medium text-[#1A2E26] flex items-center gap-2">{c.name} {c.vip && <Crown size={14} className="text-[#C87D55]" />}</p><p className="text-xs text-[#8A847C]">{c.email} · {c.phone || "no phone"}</p></div>
          <span className="text-xs text-[#2C4035]">{c.requests} requests</span>
        </div>
      ))}
    </div>
  );
}

function Vip() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/admin/vip-members").then((r) => setItems(r.data)).catch(() => {}); }, []);
  return (
    <div data-testid="admin-vip" className="space-y-2">
      {items.length === 0 && <p className="text-[#8A847C] text-sm">No VIP members yet.</p>}
      {items.map((c) => (
        <div key={c.id} className="bg-white rounded-lg border border-[#1A2E26]/10 p-4 flex items-center justify-between gap-3">
          <div><p className="font-medium text-[#1A2E26] flex items-center gap-2"><Crown size={14} className="text-[#C87D55]" /> {c.name}</p><p className="text-xs text-[#8A847C]">{c.email}</p></div>
          <span className="text-xs text-[#2C4035]">since {c.vip_since ? new Date(c.vip_since).toLocaleDateString() : "—"}</span>
        </div>
      ))}
    </div>
  );
}

function SettingsPanel() {
  const { settings, refresh } = useSettings();
  const [f, setF] = useState(settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setF(settings); }, [settings]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const inp = "w-full mt-1 px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]";

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put("/admin/settings", { ...f, vip_discount: Number(f.vip_discount) });
      refresh(); toast.success("Settings saved");
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={save} data-testid="admin-settings" className="max-w-lg space-y-4">
      <div><label className="text-[11px] uppercase text-[#8A847C]">Company name</label><input data-testid="settings-company" value={f.company_name || ""} onChange={(e) => set("company_name", e.target.value)} className={inp} /></div>
      <div><label className="text-[11px] uppercase text-[#8A847C]">Logo URL</label><input value={f.logo_url || ""} onChange={(e) => set("logo_url", e.target.value)} className={inp} /></div>
      <div><label className="text-[11px] uppercase text-[#8A847C]">WhatsApp number (with country code)</label><input data-testid="settings-whatsapp" placeholder="+971501234567" value={f.whatsapp_number || ""} onChange={(e) => set("whatsapp_number", e.target.value)} className={inp} /></div>
      <div><label className="text-[11px] uppercase text-[#8A847C]">Concierge email</label><input value={f.concierge_email || ""} onChange={(e) => set("concierge_email", e.target.value)} className={inp} /></div>
      <div><label className="text-[11px] uppercase text-[#8A847C]">Concierge phone</label><input value={f.concierge_phone || ""} onChange={(e) => set("concierge_phone", e.target.value)} className={inp} /></div>
      <div><label className="text-[11px] uppercase text-[#8A847C]">VIP discount (%)</label><input data-testid="settings-vip-discount" type="number" value={f.vip_discount ?? 10} onChange={(e) => set("vip_discount", e.target.value)} className={inp} /></div>
      <button data-testid="settings-save" type="submit" disabled={saving} className="px-6 py-3 bg-[#C87D55] text-white text-sm rounded-md hover:bg-[#B36B45] disabled:opacity-60">{saving ? "Saving…" : "Save Settings"}</button>
    </form>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [section, setSection] = useState("dashboard");
  if (user === null) return <div className="h-screen bg-[#F5F0EB]" />;
  if (!user || user.role !== "admin") return <Navigate to="/signin" replace />;

  const SECTIONS = { dashboard: <Dashboard />, inventory: <Inventory />, inquiries: <Inquiries />, concierge: <Concierge />, customers: <Customers />, vip: <Vip />, settings: <SettingsPanel /> };

  return (
    <div className="pt-24 lg:pt-28 pb-20 min-h-screen mx-auto max-w-[1400px] px-5 lg:px-10">
      <p className="eyebrow text-[#C87D55] mb-3">Concierge Desk</p>
      <h1 className="font-serif text-4xl lg:text-5xl text-[#1A2E26] mb-8">Management</h1>
      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible border-b lg:border-b-0 lg:border-r border-[#1A2E26]/10 pb-2 lg:pb-0 lg:pr-4">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} data-testid={`admin-nav-${id}`} onClick={() => setSection(id)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-md text-sm tracking-wide whitespace-nowrap transition-colors ${section === id ? "bg-[#1A2E26] text-[#EAE3D2]" : "text-[#2C4035] hover:bg-white"}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
        <div>{SECTIONS[section]}</div>
      </div>
    </div>
  );
}
