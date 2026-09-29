import { useState, useRef } from "react";
import { X, Upload, Plus } from "lucide-react";
import api, { mediaUrl, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";

const CATEGORIES = ["jets", "yachts", "cars", "tours", "villas", "vip"];
const EMPTY = {
  name: "", category: "cars", subcategory: "", location: "", tagline: "", description: "",
  images: [], passenger_capacity: 0, price_per_day: "", price_weekly: "", price_multiday: "",
  request_quote: false, chauffeur_option: "", availability: "Available", featured: false, published: true,
  included_services: [], rental_requirements: [], amenities: [], pickup_delivery: "", vehicle_type: "",
  bedrooms: "", guests: "", specs: [],
};

const inp = "w-full px-3 py-2.5 rounded-md bg-white border border-[#1A2E26]/15 text-sm focus:outline-none focus:border-[#C87D55]";

export function ListingForm({ initial, onClose, onSaved }) {
  const [f, setF] = useState(initial ? {
    ...EMPTY, ...initial,
    price_per_day: initial.price_per_day ?? "", price_weekly: initial.price_weekly ?? "",
    price_multiday: initial.price_multiday ?? "", bedrooms: initial.bedrooms ?? "", guests: initial.guests ?? "",
    included_services: initial.included_services || [], rental_requirements: initial.rental_requirements || [],
    amenities: initial.amenities || [], specs: initial.specs || [], images: initial.images || [],
  } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const listStr = (arr) => (arr || []).join("\n");
  const specsStr = (s) => (s || []).map((r) => Array.isArray(r) ? `${r[0]}: ${r[1]}` : "").join("\n");

  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        setF((p) => ({ ...p, images: [...p.images, data.url] }));
      }
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...f,
      passenger_capacity: Number(f.passenger_capacity) || 0,
      price_per_day: f.price_per_day === "" ? null : Number(f.price_per_day),
      price_weekly: f.price_weekly === "" ? null : Number(f.price_weekly),
      price_multiday: f.price_multiday === "" ? null : Number(f.price_multiday),
      bedrooms: f.bedrooms === "" ? null : Number(f.bedrooms),
      guests: f.guests === "" ? null : Number(f.guests),
      subcategory: f.subcategory || null,
      chauffeur_option: f.chauffeur_option || null,
    };
    try {
      if (initial) await api.put(`/admin/listings/${initial.slug}`, payload);
      else await api.post("/admin/listings", payload);
      toast.success(initial ? "Listing updated" : "Listing created");
      onSaved();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[#0D1C16]/70 backdrop-blur-sm" onClick={onClose}>
      <div data-testid="listing-form" onClick={(e) => e.stopPropagation()} className="bg-[#F5F0EB] w-full max-w-2xl rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-[#0D1C16] text-[#EAE3D2] px-6 py-4 flex items-center justify-between shrink-0">
          <p className="font-serif text-xl">{initial ? "Edit Listing" : "New Listing"}</p>
          <button data-testid="listing-form-close" onClick={onClose} className="text-[#EAE3D2]/70 hover:text-[#C87D55]"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <input data-testid="lf-name" required placeholder="Name" value={f.name} onChange={(e) => set("name", e.target.value)} className={`col-span-2 ${inp}`} />
            <select data-testid="lf-category" value={f.category} onChange={(e) => set("category", e.target.value)} className={inp}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input data-testid="lf-subcategory" placeholder="Subcategory (e.g. Motor Homes)" value={f.subcategory} onChange={(e) => set("subcategory", e.target.value)} className={inp} />
            <input data-testid="lf-location" placeholder="Location" value={f.location} onChange={(e) => set("location", e.target.value)} className={inp} />
            <input data-testid="lf-vehicle-type" placeholder="Type / Vehicle type" value={f.vehicle_type} onChange={(e) => set("vehicle_type", e.target.value)} className={inp} />
            <input data-testid="lf-tagline" placeholder="Tagline" value={f.tagline} onChange={(e) => set("tagline", e.target.value)} className={`col-span-2 ${inp}`} />
            <textarea data-testid="lf-description" rows={2} placeholder="Short description" value={f.description} onChange={(e) => set("description", e.target.value)} className={`col-span-2 ${inp} resize-none`} />
          </div>

          {/* Images */}
          <div>
            <label className="text-[11px] uppercase tracking-wide text-[#8A847C]">Images</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {f.images.map((img, i) => (
                <div key={i} className="relative h-16 w-16 rounded-md overflow-hidden group">
                  <img src={mediaUrl(img)} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => set("images", f.images.filter((_, x) => x !== i))} className="absolute inset-0 bg-[#0D1C16]/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"><X size={16} /></button>
                </div>
              ))}
              <button type="button" data-testid="lf-upload-btn" onClick={() => fileRef.current?.click()} disabled={uploading} className="h-16 w-16 rounded-md border-2 border-dashed border-[#1A2E26]/25 flex items-center justify-center text-[#8A847C] hover:border-[#C87D55]">
                {uploading ? "…" : <Upload size={18} />}
              </button>
              <input ref={fileRef} data-testid="lf-file-input" type="file" accept="image/*" multiple onChange={upload} className="hidden" />
            </div>
            <div className="flex gap-2 mt-2">
              <input data-testid="lf-url-input" placeholder="…or paste image URL" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className={inp} />
              <button type="button" onClick={() => { if (urlInput) { set("images", [...f.images, urlInput]); setUrlInput(""); } }} className="px-3 py-2 bg-[#1A2E26] text-[#EAE3D2] rounded-md"><Plus size={16} /></button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-[11px] uppercase text-[#8A847C]">Capacity</label><input data-testid="lf-capacity" type="number" value={f.passenger_capacity} onChange={(e) => set("passenger_capacity", e.target.value)} className={inp} /></div>
            <div><label className="text-[11px] uppercase text-[#8A847C]">Daily $</label><input data-testid="lf-price" type="number" value={f.price_per_day} onChange={(e) => set("price_per_day", e.target.value)} className={inp} /></div>
            <div><label className="text-[11px] uppercase text-[#8A847C]">Weekly $</label><input type="number" value={f.price_weekly} onChange={(e) => set("price_weekly", e.target.value)} className={inp} /></div>
            <div><label className="text-[11px] uppercase text-[#8A847C]">Multi-day $</label><input type="number" value={f.price_multiday} onChange={(e) => set("price_multiday", e.target.value)} className={inp} /></div>
            <div><label className="text-[11px] uppercase text-[#8A847C]">Bedrooms</label><input type="number" value={f.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} className={inp} /></div>
            <div><label className="text-[11px] uppercase text-[#8A847C]">Guests</label><input type="number" value={f.guests} onChange={(e) => set("guests", e.target.value)} className={inp} /></div>
            <input data-testid="lf-chauffeur" placeholder="Chauffeur option" value={f.chauffeur_option} onChange={(e) => set("chauffeur_option", e.target.value)} className={inp} />
            <input data-testid="lf-availability" placeholder="Availability" value={f.availability} onChange={(e) => set("availability", e.target.value)} className={inp} />
            <input placeholder="Pickup / delivery" value={f.pickup_delivery} onChange={(e) => set("pickup_delivery", e.target.value)} className={inp} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-[11px] uppercase text-[#8A847C]">Included / Features (one per line)</label><textarea rows={3} value={listStr(f.included_services)} onChange={(e) => set("included_services", e.target.value.split("\n").filter(Boolean))} className={`${inp} resize-none`} /></div>
            <div><label className="text-[11px] uppercase text-[#8A847C]">Rental requirements (one per line)</label><textarea rows={3} value={listStr(f.rental_requirements)} onChange={(e) => set("rental_requirements", e.target.value.split("\n").filter(Boolean))} className={`${inp} resize-none`} /></div>
            <div><label className="text-[11px] uppercase text-[#8A847C]">Amenities (one per line)</label><textarea rows={3} value={listStr(f.amenities)} onChange={(e) => set("amenities", e.target.value.split("\n").filter(Boolean))} className={`${inp} resize-none`} /></div>
            <div><label className="text-[11px] uppercase text-[#8A847C]">Specs (Label: Value per line)</label><textarea rows={3} value={specsStr(f.specs)} onChange={(e) => set("specs", e.target.value.split("\n").filter(Boolean).map((l) => { const i = l.indexOf(":"); return i > -1 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l.trim(), ""]; }))} className={`${inp} resize-none`} /></div>
          </div>

          <div className="flex flex-wrap gap-5 pt-1">
            <label className="flex items-center gap-2 text-sm text-[#2C4035]"><input data-testid="lf-featured" type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} className="accent-[#C87D55] h-4 w-4" /> Featured</label>
            <label className="flex items-center gap-2 text-sm text-[#2C4035]"><input data-testid="lf-published" type="checkbox" checked={f.published} onChange={(e) => set("published", e.target.checked)} className="accent-[#C87D55] h-4 w-4" /> Published</label>
            <label className="flex items-center gap-2 text-sm text-[#2C4035]"><input data-testid="lf-request-quote" type="checkbox" checked={f.request_quote} onChange={(e) => set("request_quote", e.target.checked)} className="accent-[#C87D55] h-4 w-4" /> Price on request</label>
          </div>

          <button data-testid="lf-save" type="submit" disabled={saving} className="w-full py-3.5 bg-[#C87D55] text-white text-sm tracking-wide rounded-md hover:bg-[#B36B45] disabled:opacity-60">{saving ? "Saving…" : "Save Listing"}</button>
        </form>
      </div>
    </div>
  );
}
