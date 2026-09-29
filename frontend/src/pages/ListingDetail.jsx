import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MapPin, Check, MessageCircle, ArrowLeft, Crown, Truck, FileText, CalendarDays } from "lucide-react";
import api, { priceLabel, mediaUrl, vipPrice, waLink, waMessageFor } from "@/lib/api";
import { useConcierge } from "@/context/ConciergeContext";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { RequestModal } from "@/components/RequestModal";
import { Calendar } from "@/components/ui/calendar";

const fmt = (d) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "");

export default function ListingDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { openChat } = useConcierge();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [listing, setListing] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [active, setActive] = useState(0);
  const [modal, setModal] = useState(null); // 'book' | 'quote'
  const [range, setRange] = useState(undefined);

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

  const isVip = user?.vip;
  const vipRate = isVip ? vipPrice(listing.price_per_day, settings.vip_discount) : null;
  const wa = waLink(settings.whatsapp_number, waMessageFor(listing));

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
              <img data-testid="gallery-main" src={mediaUrl(listing.images[active])} alt={listing.name} className="w-full h-full object-cover" />
            </div>
            {listing.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {listing.images.map((img, i) => (
                  <button key={i} data-testid={`gallery-thumb-${i}`} onClick={() => setActive(i)}
                    className={`aspect-square rounded-md overflow-hidden border-2 transition-colors ${active === i ? "border-[#C87D55]" : "border-transparent opacity-70 hover:opacity-100"}`}>
                    <img src={mediaUrl(img)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-1.5 text-[#8A847C] text-sm mb-3"><MapPin size={15} /> {listing.location}</div>
            <h1 data-testid="listing-name" className="font-serif text-4xl lg:text-5xl text-[#1A2E26] leading-tight">{listing.name}</h1>
            <p className="text-[#C87D55] text-sm tracking-wide mt-3">{listing.tagline}</p>
            <p className="text-[#2C4035]/85 leading-relaxed mt-6">{listing.description}</p>

            {/* Specs */}
            {listing.specs?.length > 0 && (
              <div className="grid grid-cols-2 gap-px bg-[#1A2E26]/10 rounded-lg overflow-hidden mt-8">
                {listing.specs.map(([label, value], i) => (
                  <div key={i} className="bg-[#F5F0EB] p-4">
                    <p className="text-[11px] uppercase tracking-wide text-[#8A847C]">{label}</p>
                    <p className="text-[#1A2E26] font-medium mt-1">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Pricing */}
            <div className="mt-8 flex items-center justify-between p-5 bg-white rounded-lg border border-[#1A2E26]/10">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[#8A847C]">Rate</p>
                {vipRate ? (
                  <div className="flex items-baseline gap-2 mt-1">
                    <p data-testid="listing-price" className="font-serif text-2xl text-[#1A2E26]">${vipRate.toLocaleString()}/day</p>
                    <span className="text-sm text-[#8A847C] line-through">${Number(listing.price_per_day).toLocaleString()}</span>
                  </div>
                ) : (
                  <p data-testid="listing-price" className="font-serif text-2xl text-[#1A2E26] mt-1">{priceLabel(listing)}</p>
                )}
                {listing.price_weekly && <p className="text-xs text-[#8A847C] mt-1">${Number(listing.price_weekly).toLocaleString()} / week</p>}
                {vipRate && <p className="text-xs text-[#C87D55] mt-1 flex items-center gap-1"><Crown size={12} /> VIP member price ({settings.vip_discount}% off)</p>}
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-[#8A847C]">Availability</p>
                <p className="text-[#1A2E26] font-medium mt-1">{listing.availability}</p>
              </div>
            </div>

            {/* Availability calendar — always open */}
            <div data-testid="availability-calendar" className="mt-8 bg-white rounded-lg border border-[#1A2E26]/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="eyebrow text-[#C87D55] flex items-center gap-2"><CalendarDays size={14} /> Availability</p>
                <span className="flex items-center gap-2 text-xs text-[#2C4035]"><span className="h-2.5 w-2.5 rounded-full bg-[#A3B899]" /> Open for booking</span>
              </div>
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={1}
                disabled={{ before: new Date() }}
                className="w-full"
              />
              <p className="text-xs text-[#8A847C] mt-2">
                {range?.from ? `Selected: ${fmt(range.from)}${range.to ? ` → ${fmt(range.to)}` : ""}` : "Every open date is available — select your dates to request a booking."}
              </p>
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              <button data-testid="request-to-book" onClick={() => setModal("book")} className="py-4 bg-[#1A2E26] text-[#EAE3D2] text-sm tracking-wide rounded-md hover:bg-[#2C4035] transition-colors">Request to Book</button>
              <button data-testid="request-a-quote" onClick={() => setModal("quote")} className="py-4 border border-[#1A2E26]/25 text-[#1A2E26] text-sm tracking-wide rounded-md hover:border-[#C87D55] hover:text-[#C87D55] transition-colors">Request a Quote</button>
              <button data-testid="chat-with-concierge" onClick={() => openChat(listing)} className="py-4 border border-[#1A2E26]/25 text-[#1A2E26] text-sm tracking-wide rounded-md hover:border-[#C87D55] hover:text-[#C87D55] transition-colors flex items-center justify-center gap-2">
                <MessageCircle size={16} /> Chat with Concierge
              </button>
              {wa && (
                <a data-testid="whatsapp-concierge" href={wa} target="_blank" rel="noopener noreferrer" className="py-4 bg-[#25D366]/10 border border-[#25D366]/40 text-[#1A2E26] text-sm tracking-wide rounded-md hover:bg-[#25D366]/20 transition-colors flex items-center justify-center gap-2">
                  WhatsApp Concierge
                </a>
              )}
            </div>

            {/* Pickup / delivery (cars) */}
            {listing.pickup_delivery && (
              <div className="mt-8 flex items-start gap-3 text-sm text-[#2C4035] bg-white p-4 rounded-lg border border-[#1A2E26]/10">
                <Truck size={18} className="text-[#C87D55] shrink-0 mt-0.5" />
                <div><p className="font-medium text-[#1A2E26]">Pickup & delivery</p><p className="text-[#2C4035]/80 mt-1">{listing.pickup_delivery}</p></div>
              </div>
            )}

            {/* Included / features */}
            {listing.included_services?.length > 0 && (
              <div className="mt-10">
                <p className="eyebrow text-[#C87D55] mb-4">Included</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {listing.included_services.map((s, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-[#2C4035]"><Check size={16} className="text-[#C87D55] shrink-0" /> {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rental requirements (cars) */}
            {listing.rental_requirements?.length > 0 && (
              <div className="mt-8">
                <p className="eyebrow text-[#C87D55] mb-4 flex items-center gap-2"><FileText size={14} /> Rental Requirements</p>
                <ul className="space-y-2">
                  {listing.rental_requirements.map((r, i) => (
                    <li key={i} className="text-sm text-[#2C4035]/80">• {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-24" />
      {modal && <RequestModal listing={listing} mode={modal} initialStart={fmt(range?.from)} initialEnd={fmt(range?.to)} onClose={() => setModal(null)} />}
    </div>
  );
}
