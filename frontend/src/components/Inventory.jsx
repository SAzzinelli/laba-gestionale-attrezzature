import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Modal from "./Modal.jsx";

export default function Inventory() {
  const [inv, setInv] = useState([]);
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [cats, setCats] = useState([]);
  const [newCat, setNewCat] = useState({ madre: "TRIENNIO", figlia: "" });

  const load = () => axios.get("/api/inventario").then((r) => setInv(r.data));
  const loadCats = () =>
    axios.get("/api/categorie").then((r) => setCats(r.data));
  useEffect(() => {
    load();
    loadCats();
  }, []);

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
      if (form.id) {
        await axios.put(`/api/inventario/${form.id}`, form);
      } else {
        await axios.post("/api/inventario", form);
      }
      setForm(null);
      load();
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
          <button className="btn btn-primary" onClick={() => setCatOpen(true)}>
            Aggiungi sottocategoria
          </button>
          <button
            className="btn btn-primary"
            onClick={() =>
              setForm({
                nome: "",
                quantita_totale: 1,
                categoria_madre: "TRIENNIO",
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
      <div className="flex items-center gap-3 mb-3">
        <input
          className="input max-w-sm"
          placeholder="Cerca..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="table-card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Madre</th>
              <th>Sottocategoria</th>
              <th>Posizione</th>
              <th>Totale</th>
              <th>In prestito</th>
              <th>Disponibili</th>
              <th className="[width:1%] whitespace-nowrap text-right">
                Azioni
              </th>{" "}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer"
                onClick={() => setForm(r)}
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
            <input
              className="input"
              placeholder="Nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
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
              <option value="TRIENNIO">Triennio</option>
              <option value="BIENNIO">Biennio</option>
            </select>
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
            <input
              className="input"
              placeholder="Posizione"
              value={form.posizione || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, posizione: e.target.value }))
              }
            />
            <textarea
              className="input md:col-span-2"
              placeholder="Note"
              value={form.note || ""}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
        </Modal>
      )}

      {catOpen && (
        <Modal
          title="Nuova sottocategoria"
          onClose={() => setCatOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setCatOpen(false)}>
                Annulla
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    await axios.post("/api/categorie", newCat);
                    setCatOpen(false);
                    setNewCat({ madre: "TRIENNIO", figlia: "" });
                    loadCats();
                  } catch (e) {
                    alert(e?.response?.data?.error || e.message);
                  }
                }}
              >
                Crea
              </button>
            </>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              className="input"
              value={newCat.madre}
              onChange={(e) =>
                setNewCat((c) => ({ ...c, madre: e.target.value }))
              }
            >
              <option value="TRIENNIO">Triennio</option>
              <option value="BIENNIO">Biennio</option>
            </select>
            <input
              className="input"
              placeholder="Nome sottocategoria…"
              value={newCat.figlia}
              onChange={(e) =>
                setNewCat((c) => ({ ...c, figlia: e.target.value }))
              }
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
