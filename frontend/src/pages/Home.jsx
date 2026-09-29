import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowRight, Search } from "lucide-react";
import api, { mediaUrl } from "@/lib/api";
import { useConcierge } from "@/context/ConciergeContext";
import { ListingCard } from "@/components/ListingCard";

const HERO = "https://images.unsplash.com/photo-1768346564210-f382cdf18375?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000";

const EXPERIENCES = [
  { id: "jets", label: "Private Jets" },
  { id: "yachts", label: "Luxury Yachts" },
  { id: "cars", label: "Luxury Cars" },
  { id: "tours", label: "Tour Experience" },
  { id: "villas", label: "Villas" },
  { id: "vip", label: "VIP" },
];

export default function Home() {
  const { openChat } = useConcierge();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [search, setSearch] = useState({ experience: "jets", pickup: "", destination: "", dates: "" });
  const gridRef = useRef(null);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
    api.get("/listings", { params: { featured: true } }).then((r) => setFeatured(r.data.slice(0, 3))).catch(() => {});
  }, []);

  const scrollToGrid = () => gridRef.current?.scrollIntoView({ behavior: "smooth" });

  const runSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const loc = search.destination || search.pickup;
    if (loc) params.set("location", loc);
    if (search.pickup) params.set("pickup", search.pickup);
    if (search.dates) params.set("dates", search.dates);
    navigate(`/${search.experience}?${params.toString()}`);
  };

  return (
    <div>
      <section className="relative h-screen min-h-[680px] w-full overflow-hidden">
        <img src={HERO} alt="Luxury travel" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0D1C16]/70 via-[#0D1C16]/30 to-[#0D1C16]/90" />
        <div className="relative h-full mx-auto max-w-[1400px] px-5 lg:px-10 flex flex-col justify-center">
          <p className="eyebrow text-[#C87D55] mb-6 lck-rise">LuxuryCharterKings</p>
          <h1 className="font-serif text-[#EAE3D2] text-5xl sm:text-6xl lg:text-8xl leading-[0.95] tracking-tight max-w-4xl lck-rise" style={{ animationDelay: "0.1s" }}>
            Travel, arranged<br />differently.
          </h1>
          <p className="text-[#EAE3D2]/80 text-base lg:text-lg max-w-xl mt-8 leading-relaxed lck-rise" style={{ animationDelay: "0.25s" }}>
            Bespoke charters, curated supercars, private sanctuaries, and non-stop global concierge assistance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-10 lck-rise" style={{ animationDelay: "0.4s" }}>
            <button data-testid="hero-cta-explore" onClick={scrollToGrid} className="group flex items-center justify-center gap-2 px-8 py-4 bg-[#EAE3D2] text-[#0D1C16] text-sm tracking-wide rounded-full hover:bg-[#C87D55] hover:text-white transition-all duration-300">
              Explore Collection <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button data-testid="hero-cta-concierge" onClick={() => openChat()} className="flex items-center justify-center gap-2 px-8 py-4 border border-[#EAE3D2]/40 text-[#EAE3D2] text-sm tracking-wide rounded-full hover:border-[#C87D55] hover:text-[#C87D55] transition-all duration-300">
              Speak with Concierge
            </button>
          </div>
        </div>
      </section>

      {/* Discovery search */}
      <section className="relative z-10 mx-auto max-w-[1200px] px-5 lg:px-10 -mt-16">
        <form onSubmit={runSearch} data-testid="discovery-search" className="bg-white rounded-2xl shadow-2xl border border-[#1A2E26]/8 p-4 md:p-5 grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-wide text-[#8A847C]">Experience</label>
            <select data-testid="search-experience" value={search.experience} onChange={(e) => setSearch({ ...search, experience: e.target.value })} className="px-4 py-3 rounded-md bg-[#F5F0EB] border border-[#1A2E26]/10 text-sm focus:outline-none focus:border-[#C87D55]">
              {EXPERIENCES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-wide text-[#8A847C]">Pick-up</label>
            <input data-testid="search-pickup" placeholder="City or terminal" value={search.pickup} onChange={(e) => setSearch({ ...search, pickup: e.target.value })} className="px-4 py-3 rounded-md bg-[#F5F0EB] border border-[#1A2E26]/10 text-sm focus:outline-none focus:border-[#C87D55]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-wide text-[#8A847C]">Destination</label>
            <input data-testid="search-destination" placeholder="Anywhere" value={search.destination} onChange={(e) => setSearch({ ...search, destination: e.target.value })} className="px-4 py-3 rounded-md bg-[#F5F0EB] border border-[#1A2E26]/10 text-sm focus:outline-none focus:border-[#C87D55]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-wide text-[#8A847C]">Dates</label>
            <input data-testid="search-dates" type="date" value={search.dates} onChange={(e) => setSearch({ ...search, dates: e.target.value })} className="px-4 py-3 rounded-md bg-[#F5F0EB] border border-[#1A2E26]/10 text-sm focus:outline-none focus:border-[#C87D55]" />
          </div>
          <button data-testid="search-submit" type="submit" className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1A2E26] text-[#EAE3D2] text-sm tracking-wide rounded-md hover:bg-[#2C4035] transition-colors">
            <Search size={16} /> Discover
          </button>
        </form>
      </section>

      <section ref={gridRef} className="py-20 lg:py-28 mx-auto max-w-[1400px] px-5 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <p className="eyebrow text-[#C87D55] mb-4">The Collection</p>
            <h2 className="font-serif text-4xl lg:text-5xl text-[#1A2E26] leading-tight max-w-lg">Six worlds, one standard of care.</h2>
          </div>
          <p className="text-[#2C4035]/70 text-sm max-w-xs leading-relaxed">Every asset is privately arranged and fully staffed — never sold, only chartered.</p>
        </div>

        <div className="grid grid-cols-12 gap-4 lg:gap-5">
          {categories.map((cat) => (
            <Link key={cat.id} to={cat.path} data-testid={`category-card-${cat.id}`} className={`col-span-12 ${cat.col_span} group relative overflow-hidden rounded-lg lck-img-zoom h-[340px] lg:h-[420px]`}>
              <img src={mediaUrl(cat.image)} alt={cat.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D1C16]/85 via-[#0D1C16]/15 to-transparent" />
              <div className="absolute inset-0 p-7 flex flex-col justify-end">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-3xl lg:text-4xl text-[#EAE3D2]">{cat.name}</h3>
                  <span className="h-10 w-10 rounded-full border border-[#EAE3D2]/40 flex items-center justify-center text-[#EAE3D2] group-hover:bg-[#C87D55] group-hover:border-[#C87D55] transition-all duration-300"><ArrowUpRight size={18} /></span>
                </div>
                <p className="text-[#EAE3D2]/75 text-sm mt-3 max-w-md leading-relaxed">{cat.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="pb-20 lg:pb-28 mx-auto max-w-[1400px] px-5 lg:px-10">
          <p className="eyebrow text-[#C87D55] mb-4">Currently Featured</p>
          <h2 className="font-serif text-4xl lg:text-5xl text-[#1A2E26] mb-12">Signature charters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((l, i) => <ListingCard key={l.slug} listing={l} index={i} />)}
          </div>
        </section>
      )}

      <section className="bg-[#0D1C16] py-24 lg:py-32">
        <div className="mx-auto max-w-[1400px] px-5 lg:px-10 text-center">
          <p className="eyebrow text-[#C87D55] mb-6">Global Concierge</p>
          <h2 className="font-serif text-4xl lg:text-6xl text-[#EAE3D2] leading-tight max-w-3xl mx-auto">A single point of contact for every journey.</h2>
          <button data-testid="banner-concierge" onClick={() => openChat()} className="mt-10 inline-flex items-center gap-2 px-8 py-4 bg-[#C87D55] text-white text-sm tracking-wide rounded-full hover:bg-[#B36B45] transition-colors">
            Speak with Concierge <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
