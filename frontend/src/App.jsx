import React, { useState } from "react";
import Dashboard from "./components/Dashboard.jsx";
import Inventory from "./components/Inventory.jsx";
import Loans from "./components/Loans.jsx";
import Repairs from "./components/Repairs.jsx";
import Footer from "./components/Footer.jsx";

export default function App() {
  const [tab, setTab] = useState("dashboard");
  return (
    <div className="min-h-screen flex flex-col">
      <header className="app-header bg-[color:var(--brand)] text-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <span className="text-xl font-semibold">Attrezzatura LABA</span>
          <nav className="ml-auto flex gap-2">
            <button
              type="button"
              className={`nav-pill ${tab === "dashboard" ? "active" : ""}`}
              onClick={() => setTab("dashboard")}
            >
              📊 Dashboard
            </button>

            <button
              type="button"
              className={`nav-pill ${tab === "inventario" ? "active" : ""}`}
              onClick={() => setTab("inventario")}
            >
              🗃️ Inventario
            </button>

            <button
              type="button"
              className={`nav-pill ${tab === "prestiti" ? "active" : ""}`}
              onClick={() => setTab("prestiti")}
            >
              🤝🏻 Prestiti
            </button>

            <button
              type="button"
              className={`nav-pill ${tab === "active" ? "disabled" : ""}`}
              onClick={() => setTab("riparazioni")}
            >
              ⚙️ Riparaz. e guasti
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full">
        {tab === "dashboard" && <Dashboard />}
        {tab === "inventario" && <Inventory />}
        {tab === "prestiti" && <Loans />}
        {tab === "riparazioni" && <Repairs />}
      </main>
      <Footer />
    </div>
  );
}
