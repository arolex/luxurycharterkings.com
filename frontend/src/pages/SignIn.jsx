import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, formatApiErrorDetail } from "@/context/AuthContext";
import { AuthShell, inputClass, btnClass } from "@/pages/AuthShell";

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const u = await login(email, password);
      navigate(u.role === "admin" ? "/admin" : "/");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Members"
      title="Sign In"
      footer={
        <p className="text-sm text-[#2C4035]/70 mt-6 text-center">
          New to LuxuryCharterKings?{" "}
          <Link to="/register" data-testid="link-register" className="text-[#C87D55] lck-underline">Create account</Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4" data-testid="signin-form">
        <input data-testid="signin-email" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        <input data-testid="signin-password" type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        {error && <p data-testid="signin-error" className="text-sm text-red-700">{error}</p>}
        <div className="text-right">
          <Link to="/forgot-password" data-testid="link-forgot" className="text-xs text-[#8A847C] lck-underline hover:text-[#C87D55]">Forgot password?</Link>
        </div>
        <button data-testid="signin-submit" type="submit" disabled={loading} className={btnClass}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </AuthShell>
  );
}
