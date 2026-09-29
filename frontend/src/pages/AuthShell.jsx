import { Link } from "react-router-dom";

const HERO = "https://images.unsplash.com/photo-1613977257363-707ba9348227?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400";

export function AuthShell({ title, eyebrow, children, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F5F0EB]">
      <div className="hidden lg:block relative">
        <img src={HERO} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1C16]/80 to-[#0D1C16]/30" />
        <Link to="/" className="absolute top-8 left-8 font-serif text-[#EAE3D2] text-2xl tracking-wide">
          Luxury<span className="text-[#C87D55]">Charter</span>Kings
        </Link>
        <div className="absolute bottom-10 left-8 right-8">
          <p className="font-serif text-4xl text-[#EAE3D2] leading-tight">Travel, arranged differently.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden font-serif text-2xl text-[#1A2E26] tracking-wide block mb-10">
            Luxury<span className="text-[#C87D55]">Charter</span>Kings
          </Link>
          <p className="eyebrow text-[#C87D55] mb-3">{eyebrow}</p>
          <h1 className="font-serif text-4xl text-[#1A2E26] mb-8">{title}</h1>
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}

export const inputClass = "w-full px-4 py-3 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55] transition-colors";
export const btnClass = "w-full py-3.5 bg-[#1A2E26] text-[#EAE3D2] text-sm tracking-wide rounded-md hover:bg-[#2C4035] transition-colors disabled:opacity-60";
