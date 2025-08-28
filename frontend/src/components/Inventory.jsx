import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Modal from "./Modal.jsx";

// Persistenza locale dei nomi/ID unità per ogni item
const LS_KEY_UNITA = "inv_unita_by_id";
const lsGetStore = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_UNITA) || "{}");
  } catch {
    return {};
  }
};
const lsSetStore = (s) => localStorage.setItem(LS_KEY_UNITA, JSON.stringify(s));
const lsGetUnita = (id) => (id ? lsGetStore()[id] : undefined);
const lsSetUnita = (id, unita) => {
  if (!id) return;
  const s = lsGetStore();
  s[id] = Array.isArray(unita) ? unita : [];
  lsSetStore(s);
};
const ensureUnitaLen = (arr, len) => {
  let out = Array.isArray(arr) ? arr.slice(0, len) : [];
  if (out.length < len)
    out = out.concat(Array.from({ length: len - out.length }, () => ""));
  return out;
};
// Validators/helpers for unita fields
const isAllFilled = (arr, len) =>
  ensureUnitaLen(arr, len).every((v) => String(v || "").trim().length > 0);
const trimToLen = (arr, len) =>
  ensureUnitaLen(arr, len).map((v) => String(v || "").trim());

// === Export: Inventario in CSV (apribile con Excel) ===
const csvEsc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const csvJoin = (arr) => arr.map(csvEsc).join(";"); // separatore ; per Excel ITA
function exportInventarioCSV(
  allItems,
  filename = `inventario-${new Date().toISOString().slice(0, 10)}.csv`,
) {
  if (!Array.isArray(allItems) || allItems.length === 0) {
    alert("Non ci sono elementi in inventario da esportare.");
    return;
  }
  const header = [
    "Nome",
    "Corso Accademico",
    "Categoria",
    "Posizione",
    "Totale",
    "In prestito",
    "Disponibili",
    "Unità (ID)",
  ];
  const rows = allItems.map((r) => [
    r.nome || "",
    r.categoria_madre || "",
    r.categoria_figlia || "",
    r.posizione || "",
    r.quantita_totale ?? "",
    r.in_prestito ?? "",
    r.disponibili ?? "",
    Array.isArray(r.unita) ? r.unita.join(" | ") : "",
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

export default function Inventory() {
  const [inv, setInv] = useState([]);
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState("");
  const [cats, setCats] = useState([]);
  const [catsOverlayOpen, setCatsOverlayOpen] = useState(false);
  const [catEdit, setCatEdit] = useState(null); // { type: 'figlia', madre, figlia, new_figlia }
  const [catDelete, setCatDelete] = useState(null); // { madre, figlia }
  const [activeMadre, setActiveMadre] = useState("GRAPHIC DESIGN");
  const [catSearch, setCatSearch] = useState("");
  const [overlayItem, setOverlayItem] = useState(null);
  const [idOverlayOpen, setIdOverlayOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const load = () =>
    axios.get("/api/inventario").then((r) => {
      const data = r.data.map((it) => {
        const fromLS = lsGetUnita(it.id);
        if ((!it.unita || !Array.isArray(it.unita)) && Array.isArray(fromLS)) {
          return {
            ...it,
            unita: ensureUnitaLen(fromLS, Math.max(1, it.quantita_totale || 1)),
          };
        }
        if (Array.isArray(it.unita)) {
          // allinea e salva anche in LS per resilienza
          const aligned = ensureUnitaLen(
            it.unita,
            Math.max(1, it.quantita_totale || 1),
          );
          if (it.id) lsSetUnita(it.id, aligned);
          return { ...it, unita: aligned };
        }
        return it;
      });
      setInv(data);
    });
  const loadCats = () =>
    axios.get("/api/categorie").then((r) => setCats(r.data));
  useEffect(() => {
    load();
    loadCats();
  }, []);

  const affectedBySubcat = (madre, figlia) =>
    inv.filter(
      (i) => i.categoria_madre === madre && i.categoria_figlia === figlia,
    );

  const groupedCats = useMemo(() => {
    const m = {};
    cats.forEach((c) => {
      if (!m[c.madre]) m[c.madre] = [];
      m[c.madre].push(c.figlia);
    });
    return m;
  }, [cats]);

  const filtered = useMemo(
    () =>
      inv.filter((i) =>
        (i.nome + " " + (i.categoria_figlia || "") + " " + (i.posizione || ""))
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [inv, search],
  );

  async function save() {
    try {
      const formToSave = { ...form };
      const size = Math.max(1, formToSave.quantita_totale || 1);
      formToSave.unita = ensureUnitaLen(formToSave.unita, size);
      // Validate all unità filled
      if (!isAllFilled(formToSave.unita, size)) {
        alert(
          "Compila tutti i campi 'Assegna ID' (nessuna unità può essere vuota).",
        );
        return;
      }
      // normalizziamo togliendo spazi
      formToSave.unita = trimToLen(formToSave.unita, size);
      let savedId = formToSave.id;
      if (formToSave.id) {
        await axios.put(`/api/inventario/${formToSave.id}`, formToSave);
      } else {
        const { data: created } = await axios.post(
          "/api/inventario",
          formToSave,
        );
        if (created && (created.id || created.insertId)) {
          savedId = created.id || created.insertId;
        }
      }
      if (savedId) lsSetUnita(savedId, formToSave.unita);
      await load();
      setForm(null);
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    }
  }

  const figlieForMadre = (madre) =>
    cats.filter((c) => c.madre === madre).map((c) => c.figlia);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Inventario</h2>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-primary"
            onClick={() => setCatsOverlayOpen(true)}
          >
            Gestisci categorie
          </button>
          <button
            className="btn btn-primary"
            onClick={() =>
              setForm({
                nome: "",
                quantita_totale: 1,
                categoria_madre: "GRAPHIC DESIGN",
                categoria_figlia: "",
                posizione: "",
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
          placeholder="Cerca..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="btn btn-secondary text-sm px-3 py-1.5"
          onClick={() => exportInventarioCSV(inv)}
          title="Esporta l'inventario completo (CSV per Excel)"
        >
          Esporta Excel
        </button>
      </div>
      <div className="table-card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Corso Accademico</th>
              <th>Categoria</th>
              <th>Posizione</th>
              <th>Totale</th>
              <th>In prestito</th>
              <th>Disponibili</th>
              <th className="[width:1%] whitespace-nowrap text-right">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer"
                onClick={() => {
                  const unita = ensureUnitaLen(
                    r.unita ?? lsGetUnita(r.id),
                    Math.max(1, r.quantita_totale || 1),
                  );
                  setForm({ ...r, unita });
                }}
              >
                <td>{r.nome}</td>
                <td>{r.categoria_madre}</td>
                <td>{r.categoria_figlia || "-"}</td>
                <td>{r.posizione || "-"}</td>
                <td>{r.quantita_totale}</td>
                <td>{r.in_prestito}</td>
                <td className={r.disponibili === 0 ? "blink-red" : ""}>
                  {r.disponibili}
                </td>
                <td className="[width:1%] whitespace-nowrap text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      className="btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOverlayItem({
                          ...r,
                          unita: ensureUnitaLen(
                            r.unita ?? lsGetUnita(r.id),
                            Math.max(1, r.quantita_totale || 1),
                          ),
                        });
                      }}
                    >
                      ID Assegnati
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm(r);
                      }}
                    >
                      Modifica
                    </button>
                    <button
                      className="btn-danger solid"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Eliminare?"))
                          axios.delete(`/api/inventario/${r.id}`).then(load);
                      }}
                    >
                      Elimina
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {catsOverlayOpen && (
        <Modal
          title="Gestisci categorie"
          onClose={() => setCatsOverlayOpen(false)}
          footer={
            <div className="flex items-center justify-end gap-2">
              <button className="btn btn-primary" onClick={() => setCatsOverlayOpen(false)}>
                Salva
              </button>
            </div>
          }
        >
          <div className="w-[min(98vw,1280px)] max-w-full mx-auto max-h-[70vh] overflow-y-auto">
            <div className="flex gap-6">
              {/* Sidebar madri */}
              <div className="w-56 shrink-0">
                <div className="text-xs uppercase text-neutral-500 mb-2">
                  Corsi Accademici
                </div>
                {[
                  {
                    key: "GRAPHIC DESIGN",
                    label: "Graphic Design",
                  },
                  { key: "REGIA E VIDEOMAKING", label: "Regia e Videomaking" },
                  { key: "FASHION DESIGN", label: "Fashion Design" },
                  { key: "FOTOGRAFIA", label: "Fotografia" },
                  { key: "PITTURA", label: "Pittura" },
                  { key: "DESIGN", label: "Design" },
                  {
                    key: "CINEMA E AUDIOVISIVI",
                    label: "Cinema e Audiovisivi",
                  },
                  { key: "INTERIOR DESIGN", label: "Interior Design" },
                ].map((m) => {
                  const count = (groupedCats[m.key] || []).length;
                  const active = activeMadre === m.key;
                  return (
                    <button
                      key={m.key}
                      className={`w-full text-left rounded px-3 py-2 mb-2 border ${active ? "bg-neutral-100 border-neutral-300 font-semibold" : "border-transparent hover:bg-neutral-50"}`}
                      onClick={() => setActiveMadre(m.key)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{m.label}</span>
                        <span className="text-xs bg-neutral-200 rounded-full px-2 py-0.5">
                          {count}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pannello sottocategorie */}
              <div className="flex-1">
                <div className="flex items-end justify-between gap-2 mb-4">
                  <input
                    className="input w-72 mt-1"
                    placeholder="Cerca categoria…"
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                  />
                </div>

                {(() => {
                  const all = groupedCats[activeMadre] || [];
                  const figlie = catSearch
                    ? all.filter((n) =>
                        n.toLowerCase().includes(catSearch.toLowerCase()),
                      )
                    : all;
                  const q = (catSearch || "").trim();
                  if (figlie.length === 0) {
                    if (q.length > 0) {
                      return (
                        <div className="flex items-center justify-between gap-3 border rounded p-4">
                          <div className="text-sm">
                            Nessun risultato per <b>{q}</b>. Vuoi crearla?
                          </div>
                          <button
                            className="btn btn-primary text-sm whitespace-nowrap"
                            onClick={async () => {
                              try {
                                const exists = (all || []).some((n) => n.toLowerCase() === q.toLowerCase());
                                if (exists) {
                                  alert("Categoria già esistente.");
                                  return;
                                }
                                await axios.post("/api/categorie", { madre: activeMadre, figlia: q });
                                setCatSearch("");
                                await loadCats();
                                await load();
                              } catch (e) {
                                alert(e?.response?.data?.error || e.message);
                              }
                            }}
                          >
                            Crea “{q}”
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div className="text-sm text-neutral-500 border rounded p-6 text-center">
                        Nessuna categoria per questo corso. Digita un nome sopra per crearla.
                      </div>
                    );
                  }
                  return (
                    <ul className="space-y-3">
                      {figlie.map((f) => (
                        <li
                          key={f}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border rounded-lg px-4 py-3"
                        >
                          {catEdit &&
                          catEdit.type === "figlia" &&
                          catEdit.madre === activeMadre &&
                          catEdit.figlia === f ? (
                            <>
                              <input
                                className="input flex-1"
                                value={catEdit.new_figlia}
                                onChange={(e) =>
                                  setCatEdit((c) => ({
                                    ...c,
                                    new_figlia: e.target.value,
                                  }))
                                }
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  className="btn btn-primary text-sm px-3 py-1.5"
                                  onClick={async () => {
                                    try {
                                      if (
                                        !catEdit.new_figlia ||
                                        !catEdit.new_figlia.trim()
                                      ) {
                                        alert("Il nome non può essere vuoto.");
                                        return;
                                      }
                                      await axios.put("/api/categorie", {
                                        madre: activeMadre,
                                        figlia: f,
                                        new_figlia: catEdit.new_figlia.trim(),
                                      });
                                      setCatEdit(null);
                                      await loadCats();
                                      await load();
                                    } catch (e) {
                                      alert(
                                        e?.response?.data?.error || e.message,
                                      );
                                    }
                                  }}
                                >
                                  Salva
                                </button>
                                <button
                                  className="btn text-sm px-3 py-1.5"
                                  onClick={() => setCatEdit(null)}
                                >
                                  Annulla
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 truncate">{f}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  className="btn-secondary text-xs px-3 py-1.5 rounded-full"
                                  onClick={() =>
                                    setCatEdit({
                                      type: "figlia",
                                      madre: activeMadre,
                                      figlia: f,
                                      new_figlia: f,
                                    })
                                  }
                                >
                                  Rinomina
                                </button>
                                <button
                                  className="btn-danger text-xs px-3 py-1.5 rounded-full"
                                  onClick={() =>
                                    setCatDelete({
                                      madre: activeMadre,
                                      figlia: f,
                                    })
                                  }
                                >
                                  Elimina
                                </button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {catDelete && (
        <Modal
          title="Elimina categoria"
          onClose={() => setCatDelete(null)}
          footer={
            <div className="flex items-center gap-2">
              <button className="btn" onClick={() => setCatDelete(null)}>
                Annulla
              </button>
              <button
                className="btn btn-danger solid"
                onClick={async () => {
                  try {
                    const { madre, figlia } = catDelete;
                    const attempts = [
                      () =>
                        axios.delete("/api/categorie", {
                          data: { madre, figlia },
                        }),
                      () =>
                        axios.delete("/api/categorie", {
                          params: { madre, figlia },
                        }),
                      () =>
                        axios.delete(
                          `/api/categorie/${encodeURIComponent(madre)}/${encodeURIComponent(figlia)}`,
                        ),
                      () =>
                        axios.post("/api/categorie/delete", { madre, figlia }),
                      () =>
                        axios.post("/api/categorie/remove", { madre, figlia }),
                    ];
                    let lastErr = null;
                    for (const run of attempts) {
                      try {
                        await run();
                        lastErr = null;
                        break;
                      } catch (e) {
                        lastErr = e;
                      }
                    }
                    if (lastErr) throw lastErr;
                    setCatDelete(null);
                    await loadCats();
                    await load();
                  } catch (e) {
                    const msg =
                      e?.response?.data?.error || e?.message || "Errore";
                    alert(msg);
                  }
                }}
              >
                Elimina
              </button>
            </div>
          }
        >
          {(() => {
            const items = affectedBySubcat(catDelete.madre, catDelete.figlia);
            return (
              <div className="space-y-2">
                {items.length > 0 ? (
                  <>
                    <div className="text-sm">
                      La categoria <b>{catDelete.figlia}</b> (madre:{" "}
                      <b>{catDelete.madre}</b>) è assegnata a{" "}
                      <b>{items.length}</b> oggetto/i:
                    </div>
                    <ul className="list-disc pl-5 text-sm space-y-1 max-h-48 overflow-auto">
                      {items.map((it) => (
                        <li key={it.id}>{it.nome}</li>
                      ))}
                    </ul>
                    <div className="text-sm text-red-600">
                      Se la elimini, questi oggetti{" "}
                      <b>perderanno la categoria</b> e il campo resterà vuoto.
                    </div>
                  </>
                ) : (
                  <div className="text-sm">
                    Nessun oggetto utilizza questa categoria.
                  </div>
                )}
              </div>
            );
          })()}
        </Modal>
      )}

      {form && (
        <Modal
          title={form.id ? "Modifica oggetto" : "Nuovo oggetto"}
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
              <label className="block text-sm font-medium mb-1">Nome</label>
              <input
                className="input"
                placeholder="Nome"
                value={form.nome}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nome: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantità</label>
              <select
                className="select select-qty"
                value={form.quantita_totale}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    quantita_totale: parseInt(e.target.value, 10),
                  }))
                }
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Corso Accademico
              </label>
              <select
                className="select"
                value={form.categoria_madre}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    categoria_madre: e.target.value,
                    categoria_figlia: "",
                  }))
                }
              >
                <option value="GRAPHIC DESIGN">Graphic Design</option>
                <option value="REGIA E VIDEOMAKING">Regia e Videomaking</option>
                <option value="FASHION DESIGN">Fashion Design</option>
                <option value="FOTOGRAFIA">Fotografia</option>
                <option value="PITTURA">Pittura</option>
                <option value="DESIGN">Design</option>
                <option value="CINEMA E AUDIOVISIVI">
                  Cinema e Audiovisivi
                </option>
                <option value="INTERIOR DESIGN">Interior Design</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Categoria
              </label>
              <select
                className="select"
                value={form.categoria_figlia || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, categoria_figlia: e.target.value }))
                }
              >
                <option value="">-- Nessuna --</option>
                {figlieForMadre(form.categoria_madre).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Posizione
              </label>
              <input
                className="input"
                placeholder="Posizione"
                value={form.posizione || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, posizione: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Unità selezionate
              </label>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center h-9 px-4 min-w-[4rem] text-base font-medium border border-neutral-300 rounded-md bg-white text-center">
                  {`${ensureUnitaLen(form.unita, Math.max(1, form.quantita_totale || 1)).filter((v) => String(v || "").trim().length > 0).length}/${Math.max(1, form.quantita_totale || 1)}`}
                </span>
                <button
                  type="button"
                  onClick={() => setIdOverlayOpen(true)}
                  className="btn-secondary rounded-full text-sm px-3 py-1.5"
                >
                  Seleziona unità
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Note</label>
              <textarea
                className="input"
                placeholder="Note"
                value={form.note || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
              />
            </div>
          </div>
        </Modal>
      )}

      {idOverlayOpen && form && (
        <Modal
          title={`Assegna ID per ${form.nome || "Nuovo oggetto"}`}
          onClose={() => setIdOverlayOpen(false)}
          footer={
            <button
              className="btn btn-primary"
              onClick={() => setIdOverlayOpen(false)}
            >
              Chiudi
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-3 md:gap-4">
            {Array.from(
              { length: Math.max(1, form.quantita_totale || 1) },
              (_, i) => (
                <input
                  key={i}
                  className="input"
                  placeholder={`Unità ${i + 1}`}
                  value={
                    ensureUnitaLen(
                      form.unita,
                      Math.max(1, form.quantita_totale || 1),
                    )[i] || ""
                  }
                  onChange={(e) =>
                    setForm((f) => {
                      const len = Math.max(1, f.quantita_totale || 1);
                      const unita = ensureUnitaLen(f.unita, len);
                      unita[i] = e.target.value;
                      return { ...f, unita };
                    })
                  }
                />
              ),
            )}
          </div>
        </Modal>
      )}

      {overlayItem && (
        <Modal
          title={`Unità di ${overlayItem.nome}`}
          onClose={() => setOverlayItem(null)}
          footer={
            <button
              className="btn btn-primary"
              onClick={async () => {
                try {
                  const size = Math.max(1, overlayItem.quantita_totale || 1);
                  if (!isAllFilled(overlayItem.unita, size)) {
                    alert(
                      "Compila tutti i nomi/ID delle unità prima di salvare.",
                    );
                    return;
                  }
                  const payload = {
                    ...overlayItem,
                    unita: trimToLen(overlayItem.unita, size),
                  };
                  await axios.put(`/api/inventario/${overlayItem.id}`, payload);
                  lsSetUnita(overlayItem.id, payload.unita);
                  if (form && form.id === overlayItem.id) {
                    setForm((f) => ({ ...payload }));
                  }
                  setOverlayItem(null);
                  load();
                } catch (e) {
                  alert(e?.response?.data?.error || e.message);
                }
              }}
            >
              Salva
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-3 md:gap-4">
            {Array.from({ length: overlayItem.quantita_totale }, (_, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                {editingIndex === i ? (
                  <>
                    <input
                      className="input flex-1"
                      value={
                        ensureUnitaLen(
                          overlayItem.unita,
                          Math.max(1, overlayItem.quantita_totale || 1),
                        )[i] || ""
                      }
                      onChange={(e) =>
                        setOverlayItem((o) => {
                          const unita = ensureUnitaLen(
                            o.unita,
                            Math.max(1, o.quantita_totale || 1),
                          );
                          unita[i] = e.target.value;
                          return { ...o, unita };
                        })
                      }
                    />
                    <button
                      className="btn btn-primary text-sm px-3 py-1.5"
                      onClick={() => setEditingIndex(null)}
                    >
                      Salva
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1">
                      {ensureUnitaLen(
                        overlayItem.unita,
                        Math.max(1, overlayItem.quantita_totale || 1),
                      )[i] || `Unità ${i + 1}`}
                    </span>
                    <button
                      className="btn-secondary text-sm px-3 py-1.5 rounded-full"
                      onClick={() => setEditingIndex(i)}
                    >
                      Modifica nome
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}

    </div>
  );
}
