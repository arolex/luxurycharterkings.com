import { useState } from "react";
import { X, Check } from "lucide-react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";

// Multi-step request modal: (cars) Dates -> Requirements -> Details ; else Details only
export function RequestModal({ listing, mode = "book", onClose }) {
  const isCars = listing.category === "cars";
  const steps = isCars ? ["dates", "requirements", "details"] : ["details"];
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", start_date: "", end_date: "",
    destination: listing.location || "", guests: "", duration: (listing.rental_durations || ["Daily"])[0],
    chauffeur: false, requirements: [], message: "",
  });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleReq = (r) => setForm((f) => ({ ...f, requirements: f.requirements.includes(r) ? f.requirements.filter((x) => x !== r) : [...f.requirements, r] }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/requests", {
        listing_id: listing.slug, request_type: mode, full_name: form.full_name, email: form.email,
        phone: form.phone, start_date: form.start_date, end_date: form.end_date, destination: form.destination,
        guests: form.guests ? Number(form.guests) : null, duration: form.duration, chauffeur: form.chauffeur,
        requirements: form.requirements, message: form.message,
      });
      setDone(true);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const current = steps[step];
  const title = mode === "quote" ? "Request a Quote" : "Request to Book";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#0D1C16]/70 backdrop-blur-sm" onClick={onClose}>
      <div data-testid="request-modal" onClick={(e) => e.stopPropagation()} className="bg-[#F5F0EB] w-full max-w-lg rounded-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="bg-[#0D1C16] text-[#EAE3D2] px-6 py-5 flex items-center justify-between">
          <div>
            <p className="eyebrow text-[#C87D55]">{title}</p>
            <p className="font-serif text-xl mt-1">{listing.name}</p>
          </div>
          <button data-testid="request-close" onClick={onClose} className="text-[#EAE3D2]/70 hover:text-[#C87D55]"><X size={20} /></button>
        </div>

        {steps.length > 1 && !done && (
          <div className="flex gap-1 px-6 pt-4">
            {steps.map((s, i) => <div key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-[#C87D55]" : "bg-[#1A2E26]/15"}`} />)}
          </div>
        )}

        {done ? (
          <div data-testid="request-success" className="p-8 text-center">
            <div className="h-14 w-14 rounded-full bg-[#C87D55] mx-auto flex items-center justify-center text-white mb-5"><Check size={26} /></div>
            <h3 className="font-serif text-2xl text-[#1A2E26] mb-3">Request received</h3>
            <p className="text-sm text-[#2C4035]/80 leading-relaxed">Our concierge team will be in touch shortly to arrange your {listing.name} {mode === "quote" ? "quote" : "booking"}. You can also continue the conversation via Chat with Concierge.</p>
            <button onClick={onClose} className="mt-6 px-6 py-3 bg-[#1A2E26] text-[#EAE3D2] text-sm rounded-md hover:bg-[#2C4035]">Close</button>
          </div>
        ) : (
          <form onSubmit={current === "details" ? submit : (e) => { e.preventDefault(); setStep((s) => s + 1); }} className="p-6 space-y-4">
            {current === "dates" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[#8A847C] uppercase tracking-wide">From</label>
                  <input data-testid="request-start" type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[#8A847C] uppercase tracking-wide">To</label>
                  <input data-testid="request-end" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" />
                </div>
                <select data-testid="request-duration" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="col-span-2 px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]">
                  {(listing.rental_durations || ["Daily", "Multi-Day", "Weekly"]).map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            )}
            {current === "requirements" && (
              <div className="space-y-3">
                <p className="text-sm text-[#2C4035]">Confirm the rental requirements you can meet:</p>
                {(listing.rental_requirements || ["Valid driving licence", "Passport or ID", "Security deposit"]).map((r) => (
                  <label key={r} data-testid={`req-${r.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`} className="flex items-center gap-3 text-sm text-[#2C4035] cursor-pointer bg-white p-3 rounded-md border border-[#1A2E26]/10">
                    <input type="checkbox" checked={form.requirements.includes(r)} onChange={() => toggleReq(r)} className="accent-[#C87D55] h-4 w-4" /> {r}
                  </label>
                ))}
                {listing.chauffeur_option && listing.chauffeur_option.toLowerCase().includes("chauffeur") && (
                  <label className="flex items-center gap-3 text-sm text-[#2C4035] cursor-pointer bg-white p-3 rounded-md border border-[#1A2E26]/10">
                    <input type="checkbox" checked={form.chauffeur} onChange={(e) => setForm({ ...form, chauffeur: e.target.checked })} className="accent-[#C87D55] h-4 w-4" /> Include chauffeur service
                  </label>
                )}
              </div>
            )}
            {current === "details" && (
              <div className="grid grid-cols-2 gap-4">
                <input data-testid="request-name" required placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="col-span-2 px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" />
                <input data-testid="request-email" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" />
                <input data-testid="request-phone" placeholder="Phone / WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" />
                {!isCars && (
                  <>
                    <input data-testid="request-destination" placeholder="Destination / Location" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" />
                    <input data-testid="request-guests" type="number" min="1" placeholder="Guests" value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} className="px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" />
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-[#8A847C] uppercase tracking-wide">From</label>
                      <input data-testid="request-start2" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-[#8A847C] uppercase tracking-wide">To</label>
                      <input data-testid="request-end2" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" />
                    </div>
                  </>
                )}
                <textarea data-testid="request-message" rows={3} placeholder="Requirements / message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="col-span-2 px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55] resize-none" />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {step > 0 && <button type="button" data-testid="request-back" onClick={() => setStep((s) => s - 1)} className="px-5 py-3.5 border border-[#1A2E26]/25 text-[#1A2E26] text-sm rounded-md hover:border-[#C87D55]">Back</button>}
              <button data-testid={current === "details" ? "request-submit" : "request-next"} type="submit" disabled={loading} className="flex-1 py-3.5 bg-[#C87D55] text-white text-sm tracking-wide rounded-md hover:bg-[#B36B45] transition-colors disabled:opacity-60">
                {loading ? "Submitting…" : current === "details" ? (mode === "quote" ? "Request Quote" : "Submit Request") : "Continue"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
