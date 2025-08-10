import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Modal from "./Modal.jsx";

const fmt = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

export default function Loans() {
  const [list, setList] = useState([]);
  const [inv, setInv] = useState([]);
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState("");

  const load = () => axios.get("/api/prestiti").then((r) => setList(r.data));

  useEffect(() => {
    load();
    axios.get("/api/inventario").then((r) => setInv(r.data));
  }, []);

  const filtered = useMemo(
    () =>
      list.filter((p) =>
        (p.chi + " " + p.inventario_nome)
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [list, search],
  );

  async function save() {
    try {
      if (form.id) {
        await axios.put(`/api/prestiti/${form.id}`, form);
      } else {
        await axios.post("/api/prestiti", form);
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
        <button
          className="btn btn-primary"
          onClick={() =>
            setForm({
              inventario_id: "",
              chi: "",
              data_uscita: "",
              data_rientro: "",
              quantita: 1,
              note: "",
            })
          }
        >
          + Nuovo
        </button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <input
          className="input max-w-sm"
          placeholder="Cerca per nome o oggetto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Prestato a</th>
              <th>Oggetto</th>
              <th>Uscita</th>
              <th>Riconsegna</th>
              <th>Q.tà</th>
              <th>Giorni totali</th>
              <th>Giorni mancanti</th>
              <th className="[width:1%] whitespace-nowrap text-right">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              // Giorni mancanti: mostriamo solo positivo (gli scaduti diventano 0) ma coloriamo in rosso + blink
              const rem = r.giorni_rimanenti ?? 0;
              const displayRem = Math.max(0, rem);
              const clsBase =
                rem > 3
                  ? "bg-green-100"
                  : rem >= 2
                    ? "bg-orange-100"
                    : "bg-red-100";
              const cls = rem < 0 ? `${clsBase} blink-red` : clsBase;

              return (
                <tr
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => setForm(r)}
                >
                  <td>{r.chi}</td>
                  <td>{r.inventario_nome}</td>
                  <td>{fmt(r.data_uscita)}</td>
                  <td>{r.data_rientro ? fmt(r.data_rientro) : "-"}</td>
                  <td>{r.quantita}</td>
                  <td>{r.giorni_totali}</td>
                  <td className={cls}>{displayRem}</td>
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
                            axios.delete(`/api/prestiti/${r.id}`).then(load);
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
            <select
              className="select"
              value={form.inventario_id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  inventario_id: parseInt(e.target.value, 10),
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

            <input
              className="input"
              placeholder="Prestato a:"
              value={form.chi}
              onChange={(e) => setForm((f) => ({ ...f, chi: e.target.value }))}
            />

            <input
              type="date"
              className="input"
              value={form.data_uscita || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, data_uscita: e.target.value }))
              }
            />

            <input
              type="date"
              className="input"
              value={form.data_rientro || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, data_rientro: e.target.value }))
              }
            />

            <select
              className="select select-qty"
              value={form.quantita}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  quantita: parseInt(e.target.value, 10),
                }))
              }
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>

            <textarea
              className="input md:col-span-2"
              placeholder="Note"
              value={form.note || ""}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
