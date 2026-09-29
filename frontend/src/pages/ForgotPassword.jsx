import { useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { AuthShell, inputClass, btnClass } from "@/pages/AuthShell";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
    } catch (_) { /* generic response either way */ }
    setSent(true);
    setLoading(false);
  };

  return (
    <AuthShell
      eyebrow="Members"
      title="Reset Password"
      footer={
        <p className="text-sm text-[#2C4035]/70 mt-6 text-center">
          <Link to="/signin" data-testid="link-back-signin" className="text-[#C87D55] lck-underline">Back to sign in</Link>
        </p>
      }
    >
      {sent ? (
        <p data-testid="forgot-confirmation" className="text-sm text-[#2C4035] leading-relaxed bg-white p-4 rounded-md border border-[#1A2E26]/10">
          If that email is registered, a reset link has been sent. Please check your inbox.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4" data-testid="forgot-form">
          <p className="text-sm text-[#2C4035]/70 leading-relaxed">Enter your email and we'll send a link to reset your password.</p>
          <input data-testid="forgot-email" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          <button data-testid="forgot-submit" type="submit" disabled={loading} className={btnClass}>
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
