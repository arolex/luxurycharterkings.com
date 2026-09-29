import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Crown, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { toast } from "sonner";
import { formatApiErrorDetail } from "@/lib/api";

const BENEFITS = [
  "Member pricing on every charter, rental and experience",
  "Priority concierge — first response, 24/7",
  "Exclusive access to events, villas and off-market assets",
  "Dedicated relationship manager for bespoke itineraries",
];

const HERO = "https://images.unsplash.com/photo-1661954864180-e61dea14208a?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000";

export default function VipMembership() {
  const { user, joinVip } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const enroll = async () => {
    if (!user) { navigate("/signin"); return; }
    setLoading(true);
    try { await joinVip(); toast.success("Welcome to VIP membership"); navigate("/account"); }
    catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail)); }
    finally { setLoading(false); }
  };

  return (
    <div className="pt-24 lg:pt-28 min-h-screen">
      <section className="relative h-[46vh] min-h-[340px] overflow-hidden">
        <img src={HERO} alt="VIP" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0D1C16]/50 to-[#0D1C16]/85" />
        <div className="relative h-full mx-auto max-w-[1400px] px-5 lg:px-10 flex flex-col justify-end pb-14">
          <p className="eyebrow text-[#C87D55] mb-4 flex items-center gap-2"><Crown size={16} /> Membership</p>
          <h1 className="font-serif text-5xl lg:text-7xl text-[#EAE3D2] leading-none">The VIP Circle</h1>
        </div>
      </section>

      <section className="mx-auto max-w-[900px] px-5 lg:px-10 py-16 grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="font-serif text-3xl text-[#1A2E26] mb-6">Travel as a member.</h2>
          <ul className="space-y-4">
            {BENEFITS.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-[#2C4035]"><Check size={18} className="text-[#C87D55] shrink-0 mt-0.5" /> {b}</li>
            ))}
          </ul>
        </div>
        <div className="bg-[#0D1C16] text-[#EAE3D2] rounded-2xl p-8 flex flex-col">
          <p className="eyebrow text-[#C87D55] mb-3">Member Benefit</p>
          <p className="font-serif text-5xl">{settings.vip_discount}%<span className="text-lg text-[#A3B899]"> off</span></p>
          <p className="text-[#A3B899] text-sm mt-3 leading-relaxed">Applied automatically to eligible bookings, rentals and experiences the moment you enrol.</p>
          <div className="mt-auto pt-8">
            {user?.vip ? (
              <p data-testid="vip-already" className="text-[#C87D55] flex items-center gap-2"><Crown size={18} /> You are already a VIP member.</p>
            ) : (
              <button data-testid="vip-enroll" onClick={enroll} disabled={loading} className="w-full py-4 bg-[#C87D55] text-white text-sm tracking-wide rounded-md hover:bg-[#B36B45] transition-colors disabled:opacity-60">
                {loading ? "Enrolling…" : user ? "Enrol Now" : "Sign in to Enrol"}
              </button>
            )}
            {!user && <p className="text-xs text-[#A3B899] mt-3 text-center">New here? <Link to="/register" className="text-[#C87D55] lck-underline">Create an account</Link></p>}
          </div>
        </div>
      </section>
    </div>
  );
}
