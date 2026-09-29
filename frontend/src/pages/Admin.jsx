import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { MessageSquare, ClipboardList } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState("conversations");
  const [conversations, setConversations] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (user && user.role === "admin") {
      api.get("/concierge/conversations").then((r) => setConversations(r.data)).catch(() => {});
      api.get("/booking-requests").then((r) => setBookings(r.data)).catch(() => {});
    }
  }, [user]);

  if (user === null) return <div className="h-screen bg-[#F5F0EB]" />;
  if (!user || user.role !== "admin") return <Navigate to="/signin" replace />;

  return (
    <div className="pt-28 pb-24 min-h-screen mx-auto max-w-[1400px] px-5 lg:px-10">
      <p className="eyebrow text-[#C87D55] mb-3">Concierge Desk</p>
      <h1 className="font-serif text-4xl lg:text-5xl text-[#1A2E26] mb-8">Dashboard</h1>

      <div className="flex gap-2 mb-8 border-b border-[#1A2E26]/10">
        {[["conversations", "Conversations", conversations.length], ["bookings", "Booking Requests", bookings.length]].map(([id, label, count]) => (
          <button
            key={id}
            data-testid={`admin-tab-${id}`}
            onClick={() => setTab(id)}
            className={`px-4 py-3 text-sm tracking-wide border-b-2 -mb-px transition-colors ${tab === id ? "border-[#C87D55] text-[#1A2E26]" : "border-transparent text-[#8A847C] hover:text-[#2C4035]"}`}
          >
            {label} <span className="text-[#C87D55]">({count})</span>
          </button>
        ))}
      </div>

      {tab === "conversations" ? (
        <div data-testid="admin-conversations" className="space-y-3">
          {conversations.length === 0 && <p className="text-[#8A847C] text-sm flex items-center gap-2"><MessageSquare size={16} /> No conversations yet.</p>}
          {conversations.map((c) => (
            <div key={c.id} className="bg-white rounded-lg border border-[#1A2E26]/10 p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium text-[#1A2E26]">{c.customer_name}</p>
                  <p className="text-xs text-[#8A847C]">{c.customer_email}</p>
                </div>
                {c.listing_name && <span className="text-xs bg-[#1A2E26]/5 text-[#2C4035] px-3 py-1.5 rounded-full">{c.listing_name}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div data-testid="admin-bookings" className="space-y-3">
          {bookings.length === 0 && <p className="text-[#8A847C] text-sm flex items-center gap-2"><ClipboardList size={16} /> No booking requests yet.</p>}
          {bookings.map((b) => (
            <div key={b.id} className="bg-white rounded-lg border border-[#1A2E26]/10 p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium text-[#1A2E26]">{b.listing_name}</p>
                  <p className="text-xs text-[#8A847C]">{b.customer_name} · {b.customer_email}</p>
                </div>
                <span className="text-xs text-[#2C4035]">{b.start_date || "—"} → {b.end_date || "—"} · {b.duration}</span>
              </div>
              {b.notes && <p className="text-sm text-[#2C4035]/80 mt-3">{b.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
