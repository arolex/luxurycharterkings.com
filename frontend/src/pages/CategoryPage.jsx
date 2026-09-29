import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { SlidersHorizontal, Crown } from "lucide-react";
import api, { mediaUrl } from "@/lib/api";
import { ListingCard } from "@/components/ListingCard";
import { useAuth } from "@/context/AuthContext";

const META = {
  jets: { name: "Private Jets", tagline: "Ultra long-range cabin comfort & transcontinental agility", image: "https://images.unsplash.com/photo-1768346564233-d71f37bd19b6?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000" },
  yachts: { name: "Luxury Yachts", tagline: "Superyacht charters with full crew across the Mediterranean & Caribbean", image: "https://images.unsplash.com/photo-1759135695910-0a6aaaab6b14?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000" },
  cars: { name: "Luxury Cars", tagline: "Chauffeur or self-drive supercars, executive SUVs and motor homes", image: "https://images.unsplash.com/photo-1679506640590-f0152786dff0?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000" },
  tours: { name: "Tour Experience", tagline: "Tailored expeditions, private island escapes & wine country fly-ins", image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000" },
  villas: { name: "Villas", tagline: "Secluded coastal estates & alpine sanctuaries with private staff", image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000" },
  vip: { name: "VIP", tagline: "24/7 priority access, security detailing & bespoke itineraries", image: "https://images.unsplash.com/photo-1661954864180-e61dea14208a?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000" },
};

export default function CategoryPage({ category }) {
  const params = useParams();
  const cat = category || params.category;
  const meta = META[cat] || { name: cat, tagline: "", image: "" };
  const [qs] = useSearchParams();
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState("All");
  const [loc, setLoc] = useState(qs.get("location") || "All");
  const [chauffeur, setChauffeur] = useState(false);
  const [minCap, setMinCap] = useState(0);
  const [sort, setSort] = useState("featured");

  useEffect(() => {
    setLoading(true);
    setSub("All"); setChauffeur(false); setMinCap(0); setSort("featured");
    setLoc(qs.get("location") || "All");
    api.get("/listings", { params: { category: cat } }).then((r) => setListings(r.data)).finally(() => setLoading(false));
  }, [cat]); // eslint-disable-line

  const isCars = cat === "cars";
  const subcats = useMemo(() => ["All", ...Array.from(new Set(listings.map((l) => l.subcategory).filter(Boolean)))], [listings]);
  const locations = useMemo(() => ["All", ...Array.from(new Set(listings.map((l) => l.location)))], [listings]);

  let filtered = listings.filter((l) => {
    if (sub !== "All" && l.subcategory !== sub) return false;
    if (loc !== "All" && l.location !== loc) return false;
    if (chauffeur && !(l.chauffeur_option && l.chauffeur_option.toLowerCase().includes("chauffeur"))) return false;
    if (minCap && (l.passenger_capacity || l.guests || 0) < minCap) return false;
    return true;
  });
  filtered = [...filtered].sort((a, b) => {
    if (sort === "price-asc") return (a.price_per_day || Infinity) - (b.price_per_day || Infinity);
    if (sort === "price-desc") return (b.price_per_day || 0) - (a.price_per_day || 0);
    if (sort === "capacity") return (b.passenger_capacity || b.guests || 0) - (a.passenger_capacity || a.guests || 0);
    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
  });

  return (
    <div>
      <section className="relative h-[52vh] min-h-[380px] w-full overflow-hidden">
        <img src={mediaUrl(meta.image)} alt={meta.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0D1C16]/50 to-[#0D1C16]/80" />
        <div className="relative h-full mx-auto max-w-[1400px] px-5 lg:px-10 flex flex-col justify-end pb-14">
          <p className="eyebrow text-[#C87D55] mb-4">The Collection</p>
          <h1 className="font-serif text-5xl lg:text-7xl text-[#EAE3D2] leading-none">{meta.name}</h1>
          <p className="text-[#EAE3D2]/75 text-sm lg:text-base mt-4 max-w-xl">{meta.tagline}</p>
        </div>
      </section>

      {cat === "vip" && (
        <div className="bg-[#1A2E26]">
          <div className="mx-auto max-w-[1400px] px-5 lg:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[#EAE3D2] text-sm flex items-center gap-2"><Crown size={16} className="text-[#C87D55]" /> {user?.vip ? "You are a VIP member — priority rates applied." : "Join VIP for priority access and member pricing."}</p>
            {!user?.vip && <Link to="/vip/join" data-testid="vip-join-cta" className="px-6 py-3 bg-[#C87D55] text-white text-sm rounded-full hover:bg-[#B36B45] transition-colors">Become a VIP Member</Link>}
          </div>
        </div>
      )}

      <section className="mx-auto max-w-[1400px] px-5 lg:px-10 py-14 lg:py-20">
        {!loading && listings.length > 0 && (
          <div data-testid="category-filters" className="flex flex-col gap-5 mb-12 pb-8 border-b border-[#1A2E26]/10">
            {isCars && (
              <div className="flex flex-wrap gap-2">
                {subcats.map((s) => (
                  <button key={s} data-testid={`filter-sub-${s.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`} onClick={() => setSub(s)}
                    className={`px-4 py-2 rounded-full text-xs tracking-wide transition-colors ${sub === s ? "bg-[#1A2E26] text-[#EAE3D2]" : "bg-white border border-[#1A2E26]/15 text-[#2C4035] hover:border-[#C87D55]"}`}>{s}</button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 text-[#8A847C] text-xs"><SlidersHorizontal size={14} /> Filters</span>
              <select data-testid="filter-location" value={loc} onChange={(e) => setLoc(e.target.value)} className="px-4 py-2.5 rounded-md bg-white border border-[#1A2E26]/15 text-sm text-[#2C4035] focus:outline-none focus:border-[#C87D55]">
                {locations.map((l) => <option key={l} value={l}>{l === "All" ? "All Locations" : l}</option>)}
              </select>
              <select data-testid="filter-capacity" value={minCap} onChange={(e) => setMinCap(Number(e.target.value))} className="px-4 py-2.5 rounded-md bg-white border border-[#1A2E26]/15 text-sm text-[#2C4035] focus:outline-none focus:border-[#C87D55]">
                <option value={0}>Any capacity</option><option value={2}>2+</option><option value={4}>4+</option><option value={6}>6+</option><option value={10}>10+</option>
              </select>
              <select data-testid="filter-sort" value={sort} onChange={(e) => setSort(e.target.value)} className="px-4 py-2.5 rounded-md bg-white border border-[#1A2E26]/15 text-sm text-[#2C4035] focus:outline-none focus:border-[#C87D55]">
                <option value="featured">Featured</option><option value="price-asc">Price: Low to High</option><option value="price-desc">Price: High to Low</option><option value="capacity">Capacity</option>
              </select>
              {isCars && (
                <label data-testid="filter-chauffeur" className="flex items-center gap-2 text-sm text-[#2C4035] cursor-pointer select-none">
                  <input type="checkbox" checked={chauffeur} onChange={(e) => setChauffeur(e.target.checked)} className="accent-[#C87D55] h-4 w-4" /> Chauffeur available
                </label>
              )}
              <span className="ml-auto text-xs text-[#8A847C]">{filtered.length} available</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <div key={i} className="aspect-[4/3] rounded-lg bg-[#1A2E26]/5 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p data-testid="no-results" className="text-[#2C4035]/70 py-16 text-center">No listings match your selection.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((l, i) => <ListingCard key={l.slug} listing={l} index={i} />)}
          </div>
        )}
      </section>
    </div>
  );
}
