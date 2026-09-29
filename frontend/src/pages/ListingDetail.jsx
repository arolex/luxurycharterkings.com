import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MapPin, Users, Check, MessageCircle, ArrowLeft, X } from "lucide-react";
import api, { priceLabel, formatApiErrorDetail } from "@/lib/api";
import { useConcierge } from "@/context/ConciergeContext";
import { toast } from "sonner";

function BookingModal({ listing, onClose }) {
  const [form, setForm] = useState({
    customer_name: "", customer_email: "", phone: "",
    start_date: "", end_date: "", duration: "Daily", chauffeur: false, notes: "",
  });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/booking-requests", { ...form, listing_id: listing.slug });
      setDone(true);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#0D1C16]/70 backdrop-blur-sm" onClick={onClose}>
      <div data-testid="booking-modal" onClick={(e) => e.stopPropagation()} className="bg-[#F5F0EB] w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-[#0D1C16] text-[#EAE3D2] px-6 py-5 flex items-center justify-between">
          <div>
            <p className="eyebrow text-[#C87D55]">Request to Book</p>
            <p className="font-serif text-xl mt-1">{listing.name}</p>
          </div>
          <button data-testid="booking-close" onClick={onClose} className="text-[#EAE3D2]/70 hover:text-[#C87D55]"><X size={20} /></button>
        </div>
        {done ? (
          <div data-testid="booking-success" className="p-8 text-center">
            <div className="h-14 w-14 rounded-full bg-[#C87D55] mx-auto flex items-center justify-center text-white mb-5"><Check size={26} /></div>
            <h3 className="font-serif text-2xl text-[#1A2E26] mb-3">Request received</h3>
            <p className="text-sm text-[#2C4035]/80 leading-relaxed">Our concierge team will be in touch shortly to arrange the details of your {listing.name} booking.</p>
            <button onClick={onClose} className="mt-6 px-6 py-3 bg-[#1A2E26] text-[#EAE3D2] text-sm rounded-md hover:bg-[#2C4035]">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input data-testid="booking-name" required placeholder="Full name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="col-span-2 px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" />
              <input data-testid="booking-email" required type="email" placeholder="Email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className="px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" />
              <input data-testid="booking-phone" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" />
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[#8A847C] uppercase tracking-wide">From</label>
                <input data-testid="booking-start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[#8A847C] uppercase tracking-wide">To</label>
                <input data-testid="booking-end" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]" />
              </div>
              <select data-testid="booking-duration" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="col-span-2 px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]">
                {(listing.rental_durations || ["Daily", "Multi-Day", "Weekly"]).map((d) => <option key={d}>{d}</option>)}
              </select>
              {listing.chauffeur_option && listing.chauffeur_option.toLowerCase().includes("chauffeur") && (
                <label data-testid="booking-chauffeur" className="col-span-2 flex items-center gap-2 text-sm text-[#2C4035] cursor-pointer">
                  <input type="checkbox" checked={form.chauffeur} onChange={(e) => setForm({ ...form, chauffeur: e.target.checked })} className="accent-[#C87D55] h-4 w-4" />
                  Include chauffeur service
                </label>
              )}
              <textarea data-testid="booking-notes" rows={3} placeholder="Special requests" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="col-span-2 px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55] resize-none" />
            </div>
            <button data-testid="booking-submit" type="submit" disabled={loading} className="w-full py-3.5 bg-[#C87D55] text-white text-sm tracking-wide rounded-md hover:bg-[#B36B45] transition-colors disabled:opacity-60">
              {loading ? "Submitting…" : "Submit Request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ListingDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { openChat } = useConcierge();
  const [listing, setListing] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [active, setActive] = useState(0);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get(`/listings/${slug}`).then((r) => { setListing(r.data); setActive(0); }).catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-5">
      <p className="font-serif text-3xl text-[#1A2E26]">Listing not found</p>
      <Link to="/" className="text-[#C87D55] lck-underline">Return home</Link>
    </div>
  );
  if (!listing) return <div className="h-screen bg-[#F5F0EB]" />;

  return (
    <div className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <button data-testid="back-button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-[#2C4035] hover:text-[#C87D55] mb-6">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Gallery */}
          <div>
            <div className="lck-img-zoom aspect-[4/3] rounded-lg overflow-hidden mb-4">
              <img data-testid="gallery-main" src={listing.images[active]} alt={listing.name} className="w-full h-full object-cover" />
            </div>
            {listing.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {listing.images.map((img, i) => (
                  <button
                    key={i}
                    data-testid={`gallery-thumb-${i}`}
                    onClick={() => setActive(i)}
                    className={`aspect-square rounded-md overflow-hidden border-2 transition-colors ${active === i ? "border-[#C87D55]" : "border-transparent opacity-70 hover:opacity-100"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-1.5 text-[#8A847C] text-sm mb-3">
              <MapPin size={15} /> {listing.location}
            </div>
            <h1 data-testid="listing-name" className="font-serif text-4xl lg:text-5xl text-[#1A2E26] leading-tight">{listing.name}</h1>
            <p className="text-[#C87D55] text-sm tracking-wide mt-3">{listing.tagline}</p>

            <p className="text-[#2C4035]/85 leading-relaxed mt-6">{listing.description}</p>

            {/* Specs */}
            <div className="grid grid-cols-2 gap-px bg-[#1A2E26]/10 rounded-lg overflow-hidden mt-8">
              {listing.specs?.map(([label, value], i) => (
                <div key={i} className="bg-[#F5F0EB] p-4">
                  <p className="text-[11px] uppercase tracking-wide text-[#8A847C]">{label}</p>
                  <p className="text-[#1A2E26] font-medium mt-1">{value}</p>
                </div>
              ))}
            </div>

            {/* Pricing */}
            <div className="mt-8 flex items-center justify-between p-5 bg-white rounded-lg border border-[#1A2E26]/10">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[#8A847C]">Rate</p>
                <p data-testid="listing-price" className="font-serif text-2xl text-[#1A2E26] mt-1">{priceLabel(listing)}</p>
                {listing.price_weekly && <p className="text-xs text-[#8A847C] mt-1">${listing.price_weekly.toLocaleString()} / week</p>}
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-[#8A847C]">Availability</p>
                <p className="text-[#1A2E26] font-medium mt-1">{listing.availability}</p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                data-testid="request-to-book"
                onClick={() => setShowBooking(true)}
                className="flex-1 py-4 bg-[#1A2E26] text-[#EAE3D2] text-sm tracking-wide rounded-md hover:bg-[#2C4035] transition-colors"
              >
                Request to Book
              </button>
              <button
                data-testid="chat-with-concierge"
                onClick={() => openChat(listing)}
                className="flex-1 py-4 border border-[#1A2E26]/25 text-[#1A2E26] text-sm tracking-wide rounded-md hover:border-[#C87D55] hover:text-[#C87D55] transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} /> Chat with Concierge
              </button>
            </div>

            {/* Included */}
            {listing.included_services?.length > 0 && (
              <div className="mt-10">
                <p className="eyebrow text-[#C87D55] mb-4">Included</p>
                <ul className="space-y-2.5">
                  {listing.included_services.map((s, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-[#2C4035]">
                      <Check size={16} className="text-[#C87D55] shrink-0" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-24" />
      {showBooking && <BookingModal listing={listing} onClose={() => setShowBooking(false)} />}
    </div>
  );
}
