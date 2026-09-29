import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { useConcierge } from "@/context/ConciergeContext";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";

const STORAGE_KEY = "lck_conversation_id";

export const ConciergeChat = () => {
  const { open, openChat, closeChat, activeListing } = useConcierge();
  const { user } = useAuth();
  const [conv, setConv] = useState(null);
  const [form, setForm] = useState({ customer_name: "", customer_email: "", message: "" });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const convId = conv?.id;

  const loadConv = useCallback((id) => {
    return api.get(`/concierge/conversations/${id}`).then((r) => setConv(r.data)).catch(() => localStorage.removeItem(STORAGE_KEY));
  }, []);

  useEffect(() => {
    const id = localStorage.getItem(STORAGE_KEY);
    if (id) loadConv(id);
  }, [loadConv]);

  // Prefill from auth + listing context
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, customer_name: f.customer_name || user.name, customer_email: f.customer_email || user.email }));
  }, [user]);

  useEffect(() => {
    if (open && activeListing && !conv) {
      setForm((f) => ({ ...f, message: f.message || `I'd like to enquire about the ${activeListing.name} (${activeListing.location}).` }));
    }
  }, [open, activeListing, conv]);

  // Poll for new messages every 4s while a conversation exists
  useEffect(() => {
    if (!convId) return;
    const t = setInterval(() => loadConv(convId), 4000);
    return () => clearInterval(t);
  }, [convId, loadConv]);

  // Mark read when panel open
  useEffect(() => {
    if (open && convId) api.post(`/concierge/conversations/${convId}/read`).then(() => setConv((c) => c && { ...c, unread_customer: 0 })).catch(() => {});
  }, [open, convId, conv?.messages?.length]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [conv, open]);

  const startConversation = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_email || !form.message) return;
    setLoading(true);
    try {
      const { data } = await api.post("/concierge/conversations", { ...form, listing_id: activeListing?.slug || null });
      setConv(data);
      localStorage.setItem(STORAGE_KEY, data.id);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !conv) return;
    const body = input.trim();
    setInput("");
    setConv((c) => ({ ...c, messages: [...(c.messages || []), { id: Math.random(), sender: "customer", body }] }));
    try {
      await api.post(`/concierge/conversations/${conv.id}/messages`, { body });
      loadConv(conv.id);
    } catch {
      toast.error("Message failed to send");
    }
  };

  const unread = !open && conv?.unread_customer > 0 ? conv.unread_customer : 0;

  return (
    <>
      {!open && (
        <button
          data-testid="floating-concierge-chat-button"
          onClick={() => openChat()}
          className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-[#1A2E26] text-[#EAE3D2] shadow-2xl border border-[#A3B899]/25 hover:bg-[#2C4035] transition-all duration-300"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C87D55] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C87D55]"></span>
          </span>
          <MessageCircle size={18} />
          <span className="text-sm tracking-wide">Concierge</span>
          {unread > 0 && (
            <span data-testid="concierge-unread-badge" className="ml-1 h-5 min-w-5 px-1 rounded-full bg-[#C87D55] text-white text-[11px] flex items-center justify-center">{unread}</span>
          )}
        </button>
      )}

      {open && (
        <div
          data-testid="concierge-chat-panel"
          className="fixed z-[60] bg-[#F5F0EB] shadow-2xl flex flex-col overflow-hidden inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[600px] sm:rounded-2xl border border-[#1A2E26]/10"
        >
          <div className="bg-[#0D1C16] text-[#EAE3D2] px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#C87D55] flex items-center justify-center font-serif text-lg">C</div>
              <div>
                <p className="font-serif text-lg leading-none">Concierge</p>
                <p className="text-[11px] text-[#A3B899] mt-1">Typically replies within minutes</p>
              </div>
            </div>
            <button data-testid="concierge-close" onClick={closeChat} className="text-[#EAE3D2]/70 hover:text-[#C87D55]"><X size={20} /></button>
          </div>

          {activeListing && (
            <div className="bg-[#1A2E26]/5 px-5 py-2.5 border-b border-[#1A2E26]/10 flex items-center gap-2 text-xs text-[#2C4035]">
              <span className="eyebrow text-[#C87D55]">Enquiry</span>
              <span className="font-medium">{activeListing.name}</span>
            </div>
          )}

          {!conv ? (
            <form onSubmit={startConversation} className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto">
              <p className="text-sm text-[#2C4035] leading-relaxed">Share a few details and our concierge team will assist with your request.</p>
              <input data-testid="concierge-name-input" required placeholder="Your name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" />
              <input data-testid="concierge-email-input" required type="email" placeholder="Email address" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className="w-full px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" />
              <textarea data-testid="concierge-message-input" required rows={4} placeholder="How may we assist you?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55] resize-none" />
              <button data-testid="concierge-start-button" type="submit" disabled={loading} className="mt-auto w-full py-3 rounded-md bg-[#1A2E26] text-[#EAE3D2] text-sm tracking-wide hover:bg-[#2C4035] transition-colors disabled:opacity-60">
                {loading ? "Sending…" : "Start Conversation"}
              </button>
            </form>
          ) : (
            <>
              <div ref={scrollRef} data-testid="concierge-thread" className="flex-1 overflow-y-auto p-5 space-y-4">
                {conv.messages?.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "customer" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.sender === "customer" ? "bg-[#1A2E26] text-[#EAE3D2] rounded-br-sm" : "bg-white text-[#2C4035] border border-[#1A2E26]/10 rounded-bl-sm"}`}>{m.body}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} className="p-4 border-t border-[#1A2E26]/10 flex items-center gap-2 bg-white">
                <input data-testid="concierge-reply-input" placeholder="Write a message…" value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 px-4 py-2.5 rounded-full bg-[#F5F0EB] border border-[#1A2E26]/10 text-sm focus:outline-none focus:border-[#C87D55]" />
                <button data-testid="concierge-send-button" type="submit" className="h-10 w-10 rounded-full bg-[#C87D55] text-white flex items-center justify-center hover:bg-[#B36B45] transition-colors"><Send size={16} /></button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};
