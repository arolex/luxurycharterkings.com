import axios from "axios";

const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  withCredentials: true,
});

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function mediaUrl(url) {
  if (!url) return url;
  if (url.startsWith("/api/")) return `${process.env.REACT_APP_BACKEND_URL}${url}`;
  return url;
}

export function priceLabel(listing) {
  if (!listing) return "Request a Quote";
  if (listing.request_quote || !listing.price_per_day) return "Request a Quote";
  return `From $${Number(listing.price_per_day).toLocaleString()}/day`;
}

export function vipPrice(price, discount) {
  if (!price) return null;
  return Math.round(Number(price) * (1 - (Number(discount) || 0) / 100));
}

export function waLink(number, text) {
  const n = (number || "").replace(/[^0-9]/g, "");
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(text || "")}`;
}

export function waMessageFor(listing) {
  if (!listing) return "Hello LuxuryCharterKings, I'd like to speak with a concierge about your collection.";
  return `Hello LuxuryCharterKings, I'm interested in the ${listing.name} in ${listing.location}. Please let me know the availability and rental price.`;
}

// Category-adaptive card metadata: [{label, value}]
export function cardMeta(l) {
  const out = [];
  const specs = Object.fromEntries((l.specs || []).filter((s) => Array.isArray(s)));
  if (l.category === "cars") {
    if (l.passenger_capacity) out.push({ icon: "users", value: `${l.passenger_capacity} seats` });
    if (l.chauffeur_option) out.push({ icon: "key", value: l.chauffeur_option });
  } else if (l.category === "jets") {
    if (l.passenger_capacity) out.push({ icon: "users", value: `${l.passenger_capacity} pax` });
    if (specs.Range) out.push({ icon: "compass", value: specs.Range });
  } else if (l.category === "yachts") {
    if (l.passenger_capacity) out.push({ icon: "users", value: `${l.passenger_capacity} guests` });
    if (specs.Length) out.push({ icon: "ruler", value: specs.Length });
  } else if (l.category === "villas") {
    if (l.bedrooms) out.push({ icon: "bed", value: `${l.bedrooms} beds` });
    if (l.guests || l.passenger_capacity) out.push({ icon: "users", value: `${l.guests || l.passenger_capacity} guests` });
  } else if (l.category === "tours") {
    if (specs.Duration) out.push({ icon: "clock", value: specs.Duration });
    if (specs.Guests || l.passenger_capacity) out.push({ icon: "users", value: specs.Guests || `${l.passenger_capacity}` });
  } else if (l.category === "vip") {
    if (specs.Availability) out.push({ icon: "clock", value: specs.Availability });
    if (specs.Coverage) out.push({ icon: "compass", value: specs.Coverage });
  }
  return out.slice(0, 2);
}

export default api;
