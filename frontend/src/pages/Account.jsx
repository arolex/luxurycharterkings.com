import { useEffect, useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { User, ClipboardList, MessageSquare, Crown, LogOut } from "lucide-react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useConcierge } from "@/context/ConciergeContext";
import { toast } from "sonner";

const STATUS_COLORS = {
  new: "bg-[#C87D55]/15 text-[#B36B45]", contacted: "bg-[#A3B899]/25 text-[#2C4035]",
  in_progress: "bg-[#2C4035]/10 text-[#2C4035]", confirmed: "bg-[#1A2E26] text-[#EAE3D2]", closed: "bg-[#8A847C]/20 text-[#8A847C]",
};

export default function Account() {
  const { user, logout, updateProfile } = useAuth();
  const { openChat } = useConcierge();
  const navigate = useNavigate();
  const [tab, setTab] = useState("profile");
  const [requests, setRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [profile, setProfile] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name || "", phone: user.phone || "" });
      api.get("/requests/mine").then((r) => setRequests(r.data)).catch(() => {});
      api.get("/concierge/conversations/mine").then((r) => setConversations(r.data)).catch(() => {});
    }
  }, [user]);

  if (user === null) return <div className="h-screen bg-[#F5F0EB]" />;
  if (!user) return <Navigate to="/signin" replace />;

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await updateProfile(profile); toast.success("Profile updated"); }
    catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const TABS = [
    { id: "profile", label: "Profile", icon: User },
    { id: "requests", label: "My Requests", icon: ClipboardList },
    { id: "conversations", label: "Conversations", icon: MessageSquare },
    { id: "vip", label: "VIP", icon: Crown },
  ];

  return (
    <div className="pt-28 pb-24 min-h-screen mx-auto max-w-[1100px] px-5 lg:px-10">
      <p className="eyebrow text-[#C87D55] mb-3">My Account</p>
      <h1 className="font-serif text-4xl lg:text-5xl text-[#1A2E26] mb-8 flex items-center gap-3">
        {user.name} {user.vip && <Crown size={26} className="text-[#C87D55]" />}
      </h1>

      <div className="flex flex-wrap gap-2 mb-8 border-b border-[#1A2E26]/10">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} data-testid={`account-tab-${id}`} onClick={() => setTab(id)}
            className={`px-4 py-3 text-sm tracking-wide border-b-2 -mb-px transition-colors flex items-center gap-2 ${tab === id ? "border-[#C87D55] text-[#1A2E26]" : "border-transparent text-[#8A847C] hover:text-[#2C4035]"}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <form onSubmit={saveProfile} data-testid="account-profile" className="max-w-md space-y-4">
          <div><label className="text-[11px] uppercase tracking-wide text-[#8A847C]">Email</label><p className="text-[#1A2E26] mt-1">{user.email}</p></div>
          <div><label className="text-[11px] uppercase tracking-wide text-[#8A847C]">Name</label>
            <input data-testid="profile-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" /></div>
          <div><label className="text-[11px] uppercase tracking-wide text-[#8A847C]">Phone / WhatsApp</label>
            <input data-testid="profile-phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" /></div>
          <div className="flex gap-3 pt-2">
            <button data-testid="profile-save" type="submit" disabled={saving} className="px-6 py-3 bg-[#1A2E26] text-[#EAE3D2] text-sm rounded-md hover:bg-[#2C4035] disabled:opacity-60">{saving ? "Saving…" : "Save Changes"}</button>
            <button type="button" onClick={() => { logout(); navigate("/"); }} className="px-6 py-3 border border-[#1A2E26]/25 text-[#1A2E26] text-sm rounded-md hover:border-[#C87D55] flex items-center gap-2"><LogOut size={15} /> Sign Out</button>
          </div>
        </form>
      )}

      {tab === "requests" && (
        <div data-testid="account-requests" className="space-y-3">
          {requests.length === 0 ? <p className="text-[#8A847C] text-sm">You have no requests yet. <Link to="/" className="text-[#C87D55] lck-underline">Browse the collection</Link>.</p> :
            requests.map((r) => (
              <div key={r.id} className="bg-white rounded-lg border border-[#1A2E26]/10 p-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium text-[#1A2E26]">{r.listing_name}</p>
                    <p className="text-xs text-[#8A847C] capitalize">{r.request_type} · {r.start_date || "—"} → {r.end_date || "—"}</p>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full capitalize ${STATUS_COLORS[r.status] || STATUS_COLORS.new}`}>{r.status.replace("_", " ")}</span>
                </div>
              </div>
            ))}
        </div>
      )}

      {tab === "conversations" && (
        <div data-testid="account-conversations" className="space-y-3">
          {conversations.length === 0 ? <p className="text-[#8A847C] text-sm">No conversations yet. <button onClick={() => openChat()} className="text-[#C87D55] lck-underline">Chat with Concierge</button>.</p> :
            conversations.map((c) => (
              <button key={c.id} onClick={() => openChat()} className="w-full text-left bg-white rounded-lg border border-[#1A2E26]/10 p-5 hover:border-[#C87D55] transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-[#1A2E26]">{c.listing_name || "General enquiry"}</p>
                  {c.unread_customer > 0 && <span className="text-xs bg-[#C87D55] text-white px-2 py-0.5 rounded-full">{c.unread_customer} new</span>}
                </div>
                <p className="text-sm text-[#2C4035]/70 mt-1 truncate">{c.last_message}</p>
              </button>
            ))}
        </div>
      )}

      {tab === "vip" && (
        <div data-testid="account-vip">
          {user.vip ? (
            <div className="bg-[#0D1C16] text-[#EAE3D2] rounded-2xl p-8 max-w-lg">
              <Crown size={32} className="text-[#C87D55] mb-4" />
              <h3 className="font-serif text-2xl mb-2">You're a VIP member</h3>
              <p className="text-[#A3B899] text-sm leading-relaxed">Enjoy member pricing on every charter, priority concierge response and exclusive access. Member since {user.vip_since ? new Date(user.vip_since).toLocaleDateString() : "today"}.</p>
            </div>
          ) : (
            <div className="max-w-lg">
              <p className="text-[#2C4035] mb-4">Unlock member pricing and priority access.</p>
              <Link to="/vip/join" data-testid="account-vip-join" className="inline-block px-6 py-3 bg-[#C87D55] text-white text-sm rounded-full hover:bg-[#B36B45]">Become a VIP Member</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
