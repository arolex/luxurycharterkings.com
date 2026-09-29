import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, MessageCircle, User, Crown } from "lucide-react";
import { useConcierge } from "@/context/ConciergeContext";
import { useAuth } from "@/context/AuthContext";

const LINKS = [
  { label: "Private Jets", path: "/jets", id: "nav-private-jets" },
  { label: "Luxury Yachts", path: "/yachts", id: "nav-luxury-yachts" },
  { label: "Luxury Cars", path: "/cars", id: "nav-luxury-cars" },
  { label: "Tour Experience", path: "/tours", id: "nav-tour-experience" },
  { label: "Villas", path: "/villas", id: "nav-villas" },
  { label: "VIP", path: "/vip", id: "nav-vip" },
];

export const Navbar = () => {
  const { openChat } = useConcierge();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const doLogout = () => { logout(); navigate("/"); setOpen(false); };

  return (
    <header
      data-testid="site-header"
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${scrolled ? "bg-[#0D1C16]/90 backdrop-blur-xl border-b border-[#A3B899]/15 py-3" : "bg-transparent py-5"}`}
    >
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10 flex items-center justify-between">
        <Link to="/" data-testid="nav-logo" className="font-serif text-[#EAE3D2] text-xl lg:text-2xl tracking-wide">
          Luxury<span className="text-[#C87D55]">Charter</span>Kings
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {LINKS.map((l) => (
            <NavLink key={l.path} to={l.path} data-testid={l.id}
              className={({ isActive }) => `lck-underline text-[13px] tracking-wide transition-colors ${isActive ? "text-[#C87D55]" : "text-[#EAE3D2]/85 hover:text-[#EAE3D2]"}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-5">
          <button data-testid="nav-concierge-trigger" onClick={() => openChat()} className="flex items-center gap-2 text-[13px] text-[#EAE3D2]/85 hover:text-[#C87D55] transition-colors">
            <MessageCircle size={15} /> Concierge
          </button>
          {user ? (
            <div className="flex items-center gap-4">
              {user.role === "admin" && (
                <Link to="/admin" data-testid="nav-admin" className="text-[13px] text-[#C87D55] hover:text-[#EAE3D2]">Dashboard</Link>
              )}
              <Link to="/account" data-testid="nav-account" className="flex items-center gap-1.5 text-[13px] text-[#EAE3D2]/85 hover:text-[#C87D55] transition-colors">
                {user.vip && <Crown size={13} className="text-[#C87D55]" />} {user.name?.split(" ")[0] || "Account"}
              </Link>
              <button data-testid="nav-sign-out" onClick={doLogout} className="text-[13px] text-[#EAE3D2]/85 hover:text-[#C87D55] transition-colors">Sign Out</button>
            </div>
          ) : (
            <Link to="/signin" data-testid="nav-sign-in" className="flex items-center gap-2 text-[13px] text-[#EAE3D2]/85 hover:text-[#C87D55] transition-colors">
              <User size={15} /> Sign In
            </Link>
          )}
        </div>

        <button data-testid="nav-mobile-toggle" className="lg:hidden text-[#EAE3D2]" onClick={() => setOpen((v) => !v)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div data-testid="nav-mobile-menu" className="lg:hidden bg-[#0D1C16] border-t border-[#A3B899]/15 mt-3">
          <div className="flex flex-col px-5 py-4 gap-1">
            {LINKS.map((l) => (
              <NavLink key={l.path} to={l.path} onClick={() => setOpen(false)} className="py-3 text-[#EAE3D2] border-b border-[#A3B899]/10 text-sm tracking-wide">{l.label}</NavLink>
            ))}
            <button onClick={() => { setOpen(false); openChat(); }} className="py-3 text-left text-[#EAE3D2] border-b border-[#A3B899]/10 flex items-center gap-2 text-sm">
              <MessageCircle size={15} /> Concierge
            </button>
            {user ? (
              <>
                {user.role === "admin" && <Link to="/admin" onClick={() => setOpen(false)} className="py-3 text-[#C87D55] text-sm border-b border-[#A3B899]/10">Dashboard</Link>}
                <Link to="/account" onClick={() => setOpen(false)} className="py-3 text-[#EAE3D2] text-sm border-b border-[#A3B899]/10">My Account</Link>
                <button onClick={doLogout} className="py-3 text-left text-[#C87D55] text-sm">Sign Out</button>
              </>
            ) : (
              <Link to="/signin" onClick={() => setOpen(false)} className="py-3 text-[#C87D55] flex items-center gap-2 text-sm"><User size={15} /> Sign In</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
