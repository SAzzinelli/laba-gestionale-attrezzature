import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function Login({ branding = "LABA – Gestione Attrezzature" }) {
  const { login } = useAuth();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    setErr("");
    if (!login(user.trim(), pass)) setErr("Credenziali non valide");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm rounded-2xl shadow p-6 bg-white">
        <div className="mb-6 text-center">
          <div className="text-xl font-semibold">{branding}</div>
          <div className="text-sm text-neutral-500">Accesso riservato</div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Utente</label>
            <input
              className="w-full border rounded-lg p-2"
              autoFocus
              value={user}
              onChange={(e) => setUser(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              className="w-full border rounded-lg p-2"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>
          {err && <div className="text-red-600 text-sm">{err}</div>}
          <button className="w-full rounded-lg p-2 bg-black text-white">
            Entra
          </button>
        </form>
      </div>
    </div>
  );
}
