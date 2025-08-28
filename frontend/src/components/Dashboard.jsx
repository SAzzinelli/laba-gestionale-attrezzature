import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Calendar from "./Calendar.jsx";
import Modal from "./Modal.jsx";

const fmt = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const [prestiti, setPrestiti] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [view, setView] = useState("month"); // "day" | "week" | "month"
  const [focus, setFocus] = useState(new Date());
  const [selected, setSelected] = useState(null);

  const [soglia, setSoglia] = useState(1);
  const [kpiInv, setKpiInv] = useState(null);
  const [low, setLow] = useState([]);

  // Carica dati
  useEffect(() => {
    axios.get("/api/prestiti").then((r) => setPrestiti(r.data));
    axios.get("/api/inventario").then((r) => setInventario(r.data));
  }, []);

  // Carica KPI inventario e lista sotto scorta dalla API con soglia
  useEffect(() => {
    (async () => {
      try {
        const [s, l] = await Promise.all([
          axios.get(`/api/inventario/summary?threshold=${soglia}`),
          axios.get(`/api/inventario/low-stock?threshold=${soglia}`),
        ]);
        setKpiInv(s.data);
        setLow(l.data);
      } catch (e) {
        console.error("Errore fetch soglia:", e);
      }
    })();
  }, [soglia, inventario, prestiti]);

  // Scorte basse visive: solo quelli con disponibili > 0 (gli esauriti vanno nella sezione dedicata)
  const scorteBasse = useMemo(
    () => low.filter((it) => Number(it.disponibili || 0) > 0),
    [low]
  );
  // Elenco esauriti (indipendente dalla soglia)
  const esauritiList = useMemo(
    () => inventario.filter((it) => Number(it.disponibili || 0) === 0),
    [inventario]
  );

  // Mappa: inventario_id -> prima data di rientro futura
  const nextReturnByInv = useMemo(() => {
    const map = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    prestiti.forEach((p) => {
      if (!p.data_rientro) return;
      const d = new Date(p.data_rientro);
      if (isNaN(d)) return;
      d.setHours(0, 0, 0, 0);
      if (d < today) return; // solo oggi o futuro
      const prev = map.get(p.inventario_id);
      if (!prev || d < prev) map.set(p.inventario_id, d);
    });
    return map;
  }, [prestiti]);

  // Avvisi riconsegne
  const now = todayISO();
  const dom = new Date();
  dom.setDate(dom.getDate() + 1);
  const domISO = dom.toISOString().slice(0, 10);

  const riconsegnaOggi = useMemo(
    () => prestiti.filter((p) => p.data_rientro === now),
    [prestiti, now],
  );
  const riconsegnaDomani = useMemo(
    () => prestiti.filter((p) => p.data_rientro === domISO),
    [prestiti, domISO],
  );

  const inRitardo = useMemo(
    () => prestiti.filter((p) => (p.giorni_rimanenti ?? 0) < 0),
    [prestiti],
  );

  // Summary
  const totStrumenti = inventario.reduce(
    (acc, it) => acc + Number(it.quantita_totale || 0),
    0
  );
  const inPrestito = inventario.reduce(
    (acc, it) => acc + Number(it.in_prestito || 0),
    0,
  );
  const esauriti = inventario.filter(
    (it) => Number(it.disponibili || 0) === 0,
  ).length;
  const scaduti = prestiti.filter((p) => (p.giorni_rimanenti ?? 0) < 0).length;

  // Navigazione calendario (pilota il Calendar.jsx classico)
  function goToday() {
    setFocus(new Date());
  }
  function prev() {
    const f = new Date(focus);
    if (view === "month") f.setMonth(f.getMonth() - 1);
    else f.setDate(f.getDate() - (view === "week" ? 7 : 1));
    setFocus(f);
  }
  function next() {
    const f = new Date(focus);
    if (view === "month") f.setMonth(f.getMonth() + 1);
    else f.setDate(f.getDate() + (view === "week" ? 7 : 1));
    setFocus(f);
  }

  function headerLabel() {
    if (view === "day") {
      return focus.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    }
    if (view === "week") {
      const start = new Date(focus);
      const day = start.getDay();
      const diff = (day + 6) % 7; // lunedì=0
      start.setDate(start.getDate() - diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const s = start.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const e = end.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      return `${s} → ${e}`;
    }
    // month
    return focus.toLocaleDateString("it-IT", {
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      {/* Widget riepilogo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="table-card p-4">
          <div className="text-sm text-slate-500">Strumenti totali</div>
          <div className="text-2xl font-semibold">{totStrumenti}</div>
        </div>
        <div className="table-card p-4">
          <div className="text-sm text-slate-500">In prestito</div>
          <div className="text-2xl font-semibold">{inPrestito}</div>
        </div>
        <div className="table-card p-4">
          <div className="text-sm text-slate-500">Esauriti</div>
          <div className={`text-2xl font-semibold ${esauriti > 0 ? "text-red-600" : ""}`}>{esauriti}</div>
        </div>
        <div className="table-card p-4">
          <div className="text-sm text-slate-500">Prestiti scaduti</div>
          <div className="text-2xl font-semibold">{scaduti}</div>
        </div>
      </div>

      {/* Avvisi riconsegna oggi / domani */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="table-card p-4">
          <div className="font-semibold text-red-600 mb-1">Riconsegna oggi</div>
          {riconsegnaOggi.length ? (
            <ul className="text-sm space-y-1">
              {riconsegnaOggi.map((p) => (
                <li key={p.id}>
                  <b>{p.chi}</b> — {p.inventario_nome} — quantità {p.quantita}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-slate-500 text-sm">
              Nessun prestito in scadenza oggi.
            </div>
          )}
        </div>
        <div className="table-card p-4">
          <div className="font-semibold text-orange-500 mb-1">
            Riconsegna domani
          </div>
          {riconsegnaDomani.length ? (
            <ul className="text-sm space-y-1">
              {riconsegnaDomani.map((p) => (
                <li key={p.id}>
                  <b>{p.chi}</b> — {p.inventario_nome} — q.tà {p.quantita}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-slate-500 text-sm">
              Nessun prestito in scadenza domani.
            </div>
          )}
        </div>
      </div>

      {inRitardo.length > 0 && (
        <div className="table-card p-4">
          <div className="font-semibold text-red-600 mb-1">In ritardo</div>
          <ul className="text-sm space-y-2">
            {inRitardo.map((p) => (
              <li key={p.id} className="bg-red-50 border border-red-200 rounded p-2">
                <div>
                  <b>{p.inventario_nome}</b> — q.tà {p.quantita}
                </div>
                <div>
                  {p.chi} — {fmt(p.data_rientro)}{" "}
                  <span className="ml-2 inline-block px-2 py-0.5 text-xs font-semibold bg-red-600 text-white rounded-full">
                    Ritardo di {Math.abs(p.giorni_rimanenti)} giorni
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scorte basse (se serve) */}
      {scorteBasse.length > 0 && (
        <div className="table-card p-4">
          <div className="font-semibold text-amber-600 mb-2">Scorte basse</div>
          <ul className="text-sm space-y-1">
            {scorteBasse.map((it) => (
              <li key={it.id}>
                <b>{it.nome}</b>{" — "} 
                <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                  {Number(it.disponibili) === 1 ? "ne rimane 1" : `ne rimangono ${Number(it.disponibili)}`}
                </span>
               
                {" — primo rientro utile: "}
                {nextReturnByInv.get(it.id)
                  ? (
                    <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                      {nextReturnByInv.get(it.id).toLocaleDateString("it-IT")}
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">—</span>
                  )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Esauriti (sempre a parte) */}
      {esauritiList.length > 0 && (
        <div className="table-card p-4">
          <div className="font-semibold text-red-600 mb-2">Esauriti</div>
          <ul className="text-sm space-y-1">
            {esauritiList.map((it) => (
              <li key={it.id}>
                <b>{it.nome}</b>{" — "}
                <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                  esaurito
                </span>
                {" — primo rientro utile: "}
                {nextReturnByInv.get(it.id) ? (
                  <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                    {nextReturnByInv.get(it.id).toLocaleDateString("it-IT")}
                  </span>
                ) : (
                  <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">—</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Calendario */}
      <div className="table-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={goToday}>
              Oggi
            </button>
            <button className="btn-secondary" onClick={prev}>
              ‹
            </button>
            <button className="btn-secondary" onClick={next}>
              ›
            </button>
            <div className="font-semibold text-[var(--brand)] ml-2 capitalize">
              {headerLabel()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`nav-pill nav-pill--light ${view === "day" ? "active" : ""}`}
              onClick={() => setView("day")}
            >
              Giorno
            </button>
            <button
              className={`nav-pill nav-pill--light ${view === "week" ? "active" : ""}`}
              onClick={() => setView("week")}
            >
              Settimana
            </button>
            <button
              className={`nav-pill nav-pill--light ${view === "month" ? "active" : ""}`}
              onClick={() => setView("month")}
            >
              Mese
            </button>
          </div>
        </div>

        <Calendar
          items={prestiti}
          view={view}
          focusDate={focus}
          onEventClick={(ev) => setSelected(ev)}
        />
      </div>

      {/* Modal dettaglio evento */}
      {selected && (
        <Modal
          title={`${selected.chi} — ${selected.inventario_nome}`}
          onClose={() => setSelected(null)}
          footer={
            <>
              <button
                className="btn btn-primary"
                onClick={() => setSelected(null)}
              >
                Chiudi
              </button>
            </>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="input !bg-transparent !border-0 !p-0">
              <div className="text-slate-500 text-sm">Uscita</div>
              <div className="font-semibold">{fmt(selected.data_uscita)}</div>
            </div>
            <div className="input !bg-transparent !border-0 !p-0">
              <div className="text-slate-500 text-sm">Riconsegna</div>
              <div className="font-semibold">
                {selected.data_rientro ? fmt(selected.data_rientro) : "-"}
              </div>
            </div>
            <div className="input !bg-transparent !border-0 !p-0">
              <div className="text-slate-500 text-sm">Quantità</div>
              <div className="font-semibold">{selected.quantita}</div>
            </div>
            <div className="input !bg-transparent !border-0 !p-0 md:col-span-2">
              <div className="text-slate-500 text-sm">Note</div>
              <div className="font-semibold">{selected.note || "—"}</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
