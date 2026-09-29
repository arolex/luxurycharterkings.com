import { Link } from "react-router-dom";
import { useConcierge } from "@/context/ConciergeContext";

export const Footer = () => {
  const { openChat } = useConcierge();
  return (
    <footer data-testid="site-footer" className="bg-[#0D1C16] text-[#EAE3D2] pt-20 pb-10">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-16 border-b border-[#A3B899]/15">
          <div className="md:col-span-2">
            <div className="font-serif text-2xl tracking-wide mb-4">
              Luxury<span className="text-[#C87D55]">Charter</span>Kings
            </div>
            <p className="text-[#A3B899] text-sm leading-relaxed max-w-sm">
              Bespoke charters, curated supercars, private sanctuaries and non-stop global concierge assistance.
              Travel, arranged differently.
            </p>
            <address className="not-italic mt-6 text-sm text-[#A3B899] leading-relaxed" data-testid="footer-address">
              1110 Brickell Avenue, Suite 450<br />
              Miami, FL 33131
            </address>
          </div>
          <div>
            <p className="eyebrow text-[#C87D55] mb-5">Collection</p>
            <ul className="space-y-3 text-sm text-[#EAE3D2]/80">
              <li><Link to="/jets" className="lck-underline hover:text-[#C87D55]">Private Jets</Link></li>
              <li><Link to="/yachts" className="lck-underline hover:text-[#C87D55]">Luxury Yachts</Link></li>
              <li><Link to="/cars" className="lck-underline hover:text-[#C87D55]">Luxury Cars</Link></li>
              <li><Link to="/tours" className="lck-underline hover:text-[#C87D55]">Tour Experience</Link></li>
              <li><Link to="/villas" className="lck-underline hover:text-[#C87D55]">Villas</Link></li>
              <li><Link to="/vip" className="lck-underline hover:text-[#C87D55]">VIP</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow text-[#C87D55] mb-5">Assistance</p>
            <ul className="space-y-3 text-sm text-[#EAE3D2]/80">
              <li>
                <button data-testid="footer-concierge" onClick={() => openChat()} className="lck-underline hover:text-[#C87D55]">
                  Speak with Concierge
                </button>
              </li>
              <li><Link to="/signin" className="lck-underline hover:text-[#C87D55]">Sign In</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#A3B899]">
          <p>© {new Date().getFullYear()} LuxuryCharterKings. All rights reserved.</p>
          <p>Available 24 / 7 / 365 — Worldwide</p>
        </div>
      </div>
    </footer>
  );
};
