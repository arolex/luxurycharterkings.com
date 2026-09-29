import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { AuthShell, inputClass, btnClass } from "@/pages/AuthShell";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      navigate("/signin");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Members"
      title="New Password"
      footer={
        <p className="text-sm text-[#2C4035]/70 mt-6 text-center">
          <Link to="/signin" data-testid="link-back-signin" className="text-[#C87D55] lck-underline">Back to sign in</Link>
        </p>
      }
    >
      {!token ? (
        <p className="text-sm text-red-700">This reset link is invalid or incomplete.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4" data-testid="reset-form">
          <input data-testid="reset-password" type="password" required placeholder="New password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          {error && <p data-testid="reset-error" className="text-sm text-red-700">{error}</p>}
          <button data-testid="reset-submit" type="submit" disabled={loading} className={btnClass}>
            {loading ? "Updating…" : "Reset Password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
