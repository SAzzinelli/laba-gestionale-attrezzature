import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Modal from "./Modal.jsx";

const fmt = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function Repairs() {
  const [list, setList] = useState([]);
  const [inv, setInv] = useState([]);
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState("");
  const [unitOverlayOpen, setUnitOverlayOpen] = useState(false);

  const load = () => axios.get("/api/riparazioni").then((r) => setList(r.data));
  useEffect(() => {
    load();
    axios.get("/api/inventario").then((r) => setInv(r.data));
  }, []);

  const filtered = useMemo(
    () =>
      list.filter((p) =>
        (p.inventario_nome + " " + (p.tipo || "")).toLowerCase().includes(search.toLowerCase()),
      ),
    [list, search],
  );

  function getItemById(id) {
    return inv.find((i) => i.id === id);
  }

  function getUnitsForItem(id) {
    const item = getItemById(id);
    if (!item) return [];
    // `unita` è un array di nomi/ID unità (persistente lato inventario)
    return Array.isArray(item.unita) ? item.unita : [];
  }

  const selectedUnitsCount = useMemo(() => {
    if (!form?.unit_ids) return 0;
    return (Array.isArray(form.unit_ids) ? form.unit_ids : []).filter((v) => String(v || "").trim()).length;
  }, [form]);

  async function save() {
    try {
      // Validazioni base
      if (!form.inventario_id) return alert("Seleziona un oggetto dell'inventario.");
      const units = Array.isArray(form.unit_ids) ? form.unit_ids.filter((v) => String(v || "").trim()) : [];
      if (units.length === 0) return alert("Seleziona almeno un'unità (ID) in riparazione.");
      if (!form.data_inizio) return alert("Imposta la data di inizio.");
      if (form.data_fine && form.data_fine < form.data_inizio) return alert("La data di fine non può essere precedente alla data di inizio.");

      const payload = { ...form, unit_ids: units };
      if (form.id) {
        await axios.put(`/api/riparazioni/${form.id}`, payload);
      } else {
        await axios.post("/api/riparazioni", payload);
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
        <h2 className="text-xl font-semibold">Riparazioni e guasti</h2>
        <button
          className="btn btn-primary"
          onClick={() =>
            setForm({
              inventario_id: "",
              unit_ids: [],
              data_inizio: todayISO(),
              data_fine: "",
              tipo: "RIPARAZIONE",
            })
          }
        >
          + Nuovo
        </button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <input
          className="input max-w-sm"
          placeholder="Cerca per oggetto o tipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Mobile list */}
      <div className="sm:hidden grid gap-2">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-lg border p-3 bg-white shadow-sm" onClick={() => setForm(r)}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold leading-tight">{r.inventario_nome}</div>
                <div className="text-xs text-neutral-600 mt-0.5">
                  {fmt(r.data_inizio)}{r.data_fine ? ` → ${fmt(r.data_fine)}` : ""} · {r.tipo}
                </div>
              </div>
              <button
                className="btn-danger text-xs px-3 py-1.5 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Eliminare?")) axios.delete(`/api/riparazioni/${r.id}`).then(load);
                }}
              >
                Elimina
              </button>
            </div>
            {Array.isArray(r.unit_ids) && r.unit_ids.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.unit_ids.map((u, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded border bg-neutral-50">{u}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block table-card overflow-hidden overflow-x-auto -mx-4 sm:mx-0">
        <table className="table min-w-[860px]">
          <thead>
            <tr>
              <th>Oggetto</th>
              <th>Unità</th>
              <th>Inizio</th>
              <th>Fine</th>
              <th>Tipo</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="cursor-pointer" onClick={() => setForm(r)}>
                <td>{r.inventario_nome}</td>
                <td>
                  {Array.isArray(r.unit_ids) && r.unit_ids.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {r.unit_ids.map((u, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded border bg-neutral-50">{u}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-500">-</span>
                  )}
                </td>
                <td>{fmt(r.data_inizio)}</td>
                <td>{r.data_fine ? fmt(r.data_fine) : "-"}</td>
                <td>{r.tipo}</td>
                <td>
                  <button
                    className="btn-danger solid"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Eliminare?")) axios.delete(`/api/riparazioni/${r.id}`).then(load);
                    }}
                  >
                    Elimina
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal
          title={form.id ? "Modifica intervento" : "Nuovo intervento"}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Oggetto</label>
              <select
                className="select w-full"
                value={form.inventario_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    inventario_id: parseInt(e.target.value, 10),
                    // reset unità quando cambia oggetto
                    unit_ids: [],
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
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                className="select w-full"
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              >
                <option value="RIPARAZIONE">In riparazione</option>
                <option value="GUASTO">Guasto</option>
                <option value="RIPARATO">Riparato</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data inizio</label>
              <input
                type="date"
                className="input w-full"
                value={form.data_inizio || ""}
                onChange={(e) => setForm((f) => ({ ...f, data_inizio: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data fine</label>
              <input
                type="date"
                className="input w-full"
                value={form.data_fine || ""}
                onChange={(e) => setForm((f) => ({ ...f, data_fine: e.target.value }))}
              />
            </div>

            {/* Selezione unità specifiche dell'oggetto */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Unità selezionate</label>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center h-9 px-3 min-w-[3.25rem] text-sm font-medium border border-neutral-300 rounded-md bg-white text-center">
                  {selectedUnitsCount}/{getUnitsForItem(form.inventario_id).length}
                </span>
                <button
                  type="button"
                  onClick={() => setUnitOverlayOpen(true)}
                  className="btn-secondary rounded-full text-sm px-3 py-1.5"
                >
                  Seleziona unità
                </button>
              </div>
              {Array.isArray(form.unit_ids) && form.unit_ids.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.unit_ids.map((u, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded border bg-neutral-50">{u}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Overlay selezione unità */}
      {unitOverlayOpen && form && (
        <Modal
          title="Seleziona unità in riparazione"
          onClose={() => setUnitOverlayOpen(false)}
          footer={
            <button className="btn btn-primary" onClick={() => setUnitOverlayOpen(false)}>
              Chiudi
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-2">
            {getUnitsForItem(form.inventario_id).length === 0 ? (
              <div className="text-sm text-neutral-600">Nessuna unità definita per questo oggetto.</div>
            ) : (
              getUnitsForItem(form.inventario_id).map((u, idx) => {
                const checked = Array.isArray(form.unit_ids) && form.unit_ids.includes(u);
                return (
                  <label key={idx} className="flex items-center gap-3 py-1">
                    <input
                      type="checkbox"
                      className="accent-[color:var(--brand)]"
                      checked={checked}
                      onChange={(e) =>
                        setForm((f) => {
                          const set = new Set(Array.isArray(f.unit_ids) ? f.unit_ids : []);
                          if (e.target.checked) set.add(u);
                          else set.delete(u);
                          return { ...f, unit_ids: Array.from(set) };
                        })
                      }
                    />
                    <span>{u || `Unità ${idx + 1}`}</span>
                  </label>
                );
              })
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
