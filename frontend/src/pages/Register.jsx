import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, formatApiErrorDetail } from "@/context/AuthContext";
import { AuthShell, inputClass, btnClass } from "@/pages/AuthShell";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await register(form);
      navigate("/account");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Members"
      title="Create Account"
      footer={<p className="text-sm text-[#2C4035]/70 mt-6 text-center">Already a member? <Link to="/signin" data-testid="link-signin" className="text-[#C87D55] lck-underline">Sign in</Link></p>}
    >
      <form onSubmit={submit} className="space-y-4" data-testid="register-form">
        <input data-testid="register-name" required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        <input data-testid="register-email" type="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
        <input data-testid="register-phone" placeholder="Phone / WhatsApp (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
        <input data-testid="register-password" type="password" required placeholder="Password (min 6 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} />
        {error && <p data-testid="register-error" className="text-sm text-red-700">{error}</p>}
        <button data-testid="register-submit" type="submit" disabled={loading} className={btnClass}>{loading ? "Creating…" : "Create Account"}</button>
      </form>
    </AuthShell>
  );
}
