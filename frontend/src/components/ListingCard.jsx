import { Link } from "react-router-dom";
import { Users, MapPin, ArrowUpRight, Compass, Clock, Key, Ruler, Bed } from "lucide-react";
import { priceLabel, mediaUrl, cardMeta } from "@/lib/api";

const ICONS = { users: Users, compass: Compass, clock: Clock, key: Key, ruler: Ruler, bed: Bed };

export const ListingCard = ({ listing, index = 0 }) => {
  const cta = listing.category === "cars" ? "View Vehicle" : "View Details";
  const meta = cardMeta(listing);
  return (
    <Link
      to={`/listing/${listing.slug}`}
      data-testid={`listing-card-${listing.slug}`}
      className="group block bg-white border border-[#1A2E26]/8 rounded-lg overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-500"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="lck-img-zoom relative aspect-[4/3] overflow-hidden">
        <img src={mediaUrl(listing.images?.[0])} alt={listing.name} loading="lazy" className="w-full h-full object-cover" />
        {listing.subcategory && (
          <span className="absolute top-3 left-3 bg-[#0D1C16]/80 backdrop-blur-sm text-[#EAE3D2] text-[10px] tracking-widest uppercase px-3 py-1.5 rounded-full">{listing.subcategory}</span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-1.5 text-[#8A847C] text-xs mb-2">
          <MapPin size={13} /> {listing.location}
        </div>
        <h3 className="font-serif text-2xl text-[#1A2E26] leading-tight mb-3">{listing.name}</h3>
        <div className="flex items-center justify-between pt-3 border-t border-[#1A2E26]/8">
          <div className="flex items-center gap-3 text-xs text-[#2C4035]">
            {meta.map((m, i) => {
              const Icon = ICONS[m.icon] || Users;
              return <span key={i} className="flex items-center gap-1.5"><Icon size={13} className="text-[#C87D55]" /> {m.value}</span>;
            })}
          </div>
          <span className="text-sm font-medium text-[#1A2E26] whitespace-nowrap">{priceLabel(listing)}</span>
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-[#C87D55] text-sm tracking-wide group-hover:gap-2.5 transition-all">
          {cta} <ArrowUpRight size={15} />
        </div>
      </div>
    </Link>
  );
};
