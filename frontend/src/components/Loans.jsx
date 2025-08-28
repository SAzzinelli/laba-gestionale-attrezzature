import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Modal from "./Modal.jsx";

const fmt = (s) => (s ? s.split("-").reverse().join("/") : "");
const toIso10 = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d);
const cmpDates = (a, b) => new Date(toIso10(a)) - new Date(toIso10(b));
const todayISO = toIso10(new Date());

// normalizza unita alla lunghezza richiesta
const ensureUnitaLen = (arr, len) => {
  let out = Array.isArray(arr) ? arr.slice(0, len) : [];
  if (out.length < len) out = out.concat(Array.from({ length: len - out.length }, () => ""));
  return out;
};

// helpers per mappare unità da inventario
const getItemById = (list, id) => list.find((x) => String(x.id) === String(id));
const namesToIdx = (names = [], unita = []) =>
  names.map((n) => unita.findIndex((u) => u === n)).filter((i) => i >= 0);

// === Export: Prestiti totali in CSV (apribile con Excel) ===
const csvEsc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const csvJoin = (arr) => arr.map(csvEsc).join(";"); // separatore ; per Excel ITA
function exportPrestitiCSV(allLoans, filename = `prestiti-totali-${todayISO}.csv`) {
  if (!Array.isArray(allLoans) || allLoans.length === 0) {
    alert("Non ci sono prestiti da esportare.");
    return;
  }
  const header = [
    "Prestato a",
    "Oggetto",
    "Uscita",
    "Riconsegna",
    "Q.tà",
    "Giorni totali",
    "Giorni mancanti"
  ];
  const rows = allLoans.map((r) => [
    r.chi || "",
    r.inventario_nome || "",
    r.data_uscita ? fmt(r.data_uscita) : "",
    r.data_rientro ? fmt(r.data_rientro) : "",
    r.quantita ?? "",
    r.giorni_totali ?? "",
    (r.giorni_rimanenti ?? "")
  ]);

  const csv = [csvJoin(header), ...rows.map(csvJoin)].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); // BOM UTF-8 per Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Loans() {
  const [list, setList] = useState([]);
  const [inv, setInv] = useState([]);
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState("");
  const [unitSelectOpen, setUnitSelectOpen] = useState(false);

  const load = () => axios.get("/api/prestiti").then((r) => setList(r.data));

  useEffect(() => {
    load();
    axios.get("/api/inventario").then((r) => setInv(r.data));
  }, []);

  useEffect(() => {
    if (form && !form.data_uscita) {
      setForm((f) => ({ ...f, data_uscita: todayISO }));
    }
  }, [form]);

  const filtered = useMemo(
    () =>
      list.filter((p) =>
        (p.chi + " " + p.inventario_nome)
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [list, search],
  );

  const flattened = useMemo(() => {
    return filtered.flatMap((r) => {
      if (Array.isArray(r.unita) && r.unita.length > 0) {
        return r.unita.map((u, idx) => ({ ...r, _sub: idx, _unitName: u || `Unità ${idx + 1}` }));
      }
      const q = Math.max(1, r.quantita || 1);
      return Array.from({ length: q }, (_, i) => ({ ...r, _sub: i, _unitName: r.unita?.[i] || `Unità ${i + 1}` }));
    });
  }, [filtered]);

  async function save() {
    // VALIDAZIONE: rientro non può essere prima dell'uscita
    if (form.data_uscita && form.data_rientro && cmpDates(form.data_rientro, form.data_uscita) < 0) {
      alert("La data di riconsegna non può essere precedente alla data di uscita.");
      return;
    }
    if (!form.inventario_id) {
      alert("Seleziona un oggetto dell'inventario.");
      return;
    }
    const item = getItemById(inv, form.inventario_id);
    const listUnita = ensureUnitaLen(item?.unita, Math.max(1, item?.quantita_totale || 1));
    const idx = Array.isArray(form.unita_idx) ? form.unita_idx : [];
    const units = idx.map((i) => listUnita[i] || `Unità ${i + 1}`);
    if (units.length === 0) {
      alert("Seleziona almeno una unità specifica dell'oggetto.");
      return;
    }
    const payload = { ...form, quantita: units.length, unita: units };
    delete payload.unita_idx;
    try {
      if (form.id) {
        await axios.put(`/api/prestiti/${form.id}`, payload);
      } else {
        await axios.post("/api/prestiti", payload);
      }
      setForm(null);
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Prestiti</h2>
        <div className="inline-flex items-center gap-2">
          <button
            className="btn btn-primary"
            onClick={() =>
              setForm({
                inventario_id: "",
                chi: "",
                data_uscita: todayISO,
                data_rientro: "",
                quantita: 0,
                unita: [],
                unita_idx: [],
                note: "",
              })
            }
          >
            + Nuovo
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <input
          className="input max-w-sm"
          placeholder="Cerca per nome o oggetto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="btn btn-secondary text-sm px-3 py-1.5"
          onClick={() => exportPrestitiCSV(list)}
          title="Esporta tutti i prestiti (CSV per Excel)"
        >
          Esporta Excel
        </button>
      </div>

      <div className="table-card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Prestato a</th>
              <th>Oggetto</th>
              <th>Unità</th>
              <th>Uscita</th>
              <th>Riconsegna</th>
              <th>Q.tà</th>
              <th>Giorni totali</th>
              <th>Giorni mancanti</th>
              <th className="[width:1%] whitespace-nowrap text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {flattened.map((r) => {
              const rem = r.giorni_rimanenti ?? 0;
              const displayRem = Math.max(0, rem);
              const clsBase = rem > 3 ? "bg-green-100" : rem >= 2 ? "bg-orange-100" : "bg-red-100";
              const cls = rem < 0 ? `${clsBase} blink-red` : clsBase;

              return (
                <tr
                  key={`${r.id}-${r._sub}`}
                  className="cursor-pointer"
                  onClick={() => {
                    const item = getItemById(inv, r.inventario_id);
                    const listUnita = ensureUnitaLen(item?.unita, Math.max(1, item?.quantita_totale || 1));
                    const idx = namesToIdx(Array.isArray(r.unita) ? r.unita : [], listUnita);
                    setForm({ ...r, unita: Array.isArray(r.unita) ? r.unita : [], unita_idx: idx });
                  }}
                >
                  <td>{r.chi}</td>
                  <td>{r.inventario_nome}</td>
                  <td>{r._unitName}</td>
                  <td>{fmt(r.data_uscita)}</td>
                  <td>{r.data_rientro ? fmt(r.data_rientro) : "-"}</td>
                  <td>1</td>
                  <td>{r.giorni_totali}</td>
                  <td className={cls}>{displayRem}</td>
                  <td className="[width:1%] whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        className="btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm(() => {
                            const item = getItemById(inv, r.inventario_id);
                            const listUnita = ensureUnitaLen(item?.unita, Math.max(1, item?.quantita_totale || 1));
                            const idx = namesToIdx(Array.isArray(r.unita) ? r.unita : [], listUnita);
                            return { ...r, unita: Array.isArray(r.unita) ? r.unita : [], unita_idx: idx };
                          });
                        }}
                      >
                        Modifica
                      </button>
                      <button
                        className="btn-danger solid"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Eliminare?")) axios.delete(`/api/prestiti/${r.id}`).then(load);
                        }}
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal
          title={form.id ? "Modifica prestito" : "Nuovo prestito"}
          onClose={() => setForm(null)}
          footer={
            <>
              <button className="btn" onClick={() => setForm(null)}>
                Annulla
              </button>
              <button className="btn btn-primary" onClick={save}>
                Salva
              </button>
            </>
          }
        >
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
          >
            <div>
              <label className="block text-sm mb-1">Oggetto</label>
              <select
                className="select"
                value={form.inventario_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    inventario_id: parseInt(e.target.value, 10),
                    unita: [],
                    unita_idx: [],
                    quantita: 0,
                  }))
                }
              >
                <option value="">Seleziona oggetto…</option>
                {inv.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Prestato a</label>
              <input
                className="input"
                placeholder="Nome della persona/classe"
                value={form.chi}
                onChange={(e) => setForm((f) => ({ ...f, chi: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Data uscita</label>
              <input
                type="date"
                className="input"
                value={form.data_uscita || ""}
                min={todayISO}
                onChange={(e) =>
                  setForm((f) => {
                    const v = e.target.value;
                    let r = f.data_rientro || "";
                    if (r && cmpDates(r, v) < 0) r = v; // forza rientro >= uscita
                    return { ...f, data_uscita: v, data_rientro: r };
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Riconsegna</label>
              <input
                type="date"
                className="input"
                value={form.data_rientro || ""}
                min={form.data_uscita || todayISO}
                onChange={(e) =>
                  setForm((f) => ({ ...f, data_rientro: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Unità selezionate</label>
              <div className="input bg-neutral-50">{Array.isArray(form.unita_idx) ? form.unita_idx.length : 0}</div>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setUnitSelectOpen(true)}
                disabled={!form.inventario_id}
                title={!form.inventario_id ? "Seleziona prima un oggetto" : ""}
              >
                Seleziona unità
              </button>
            </div>

            <textarea
              className="input md:col-span-2"
              placeholder="Note"
              value={form.note || ""}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
        </Modal>
      )}

      {unitSelectOpen && form && (
        <Modal
          title={(() => {
            const item = inv.find((x) => String(x.id) === String(form.inventario_id));
            return `Seleziona unità – ${item ? item.nome : "(seleziona oggetto)"}`;
          })()}
          onClose={() => setUnitSelectOpen(false)}
          footer={
            <div className="flex items-center gap-2">
              <button
                className="btn"
                onClick={() => {
                  const item = getItemById(inv, form.inventario_id);
                  if (!item) return;
                  const count = Math.max(1, item.quantita_totale || 1);
                  setForm((f) => ({ ...f, unita_idx: Array.from({ length: count }, (_, i) => i) }));
                }}
              >
                Seleziona tutto
              </button>
              <button className="btn" onClick={() => setForm((f) => ({ ...f, unita_idx: [] }))}>Nessuno</button>
              <button className="btn btn-primary" onClick={() => setUnitSelectOpen(false)}>Conferma</button>
            </div>
          }
        >
          {(() => {
            const item = getItemById(inv, form.inventario_id);
            if (!item) return <div className="text-sm text-neutral-500">Seleziona prima un oggetto dall'elenco.</div>;
            const unita = ensureUnitaLen(item.unita, Math.max(1, item.quantita_totale || 1));
            const selected = new Set(form.unita_idx || []);
            const toggle = (idx) => {
              setForm((f) => {
                const cur = new Set(f.unita_idx || []);
                if (cur.has(idx)) cur.delete(idx); else cur.add(idx);
                return { ...f, unita_idx: Array.from(cur) };
              });
            };
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {unita.map((name, idx) => (
                  <label key={idx} className="inline-flex items-center gap-2 border rounded px-2 py-1 hover:bg-neutral-50">
                    <input type="checkbox" checked={selected.has(idx)} onChange={() => toggle(idx)} />
                    <span className="text-sm truncate">{name || `Unità ${idx + 1}`}</span>
                  </label>
                ))}
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
