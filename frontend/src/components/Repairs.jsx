import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Modal from "./Modal.jsx";

const fmt = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

export default function Repairs() {
  const [list, setList] = useState([]);
  const [inv, setInv] = useState([]);
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState("");

  const load = () => axios.get("/api/riparazioni").then((r) => setList(r.data));
  useEffect(() => {
    load();
    axios.get("/api/inventario").then((r) => setInv(r.data));
  }, []);

  const filtered = useMemo(
    () =>
      list.filter((p) =>
        (p.inventario_nome + " " + (p.descrizione || ""))
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [list, search],
  );

  async function save() {
    try {
      if (form.id) {
        await axios.put(`/api/riparazioni/${form.id}`, form);
      } else {
        await axios.post("/api/riparazioni", form);
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
              descrizione: "",
              data_inizio: "",
              data_fine: "",
              stato: "APERTO",
            })
          }
        >
          + Nuovo
        </button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <input
          className="input max-w-sm"
          placeholder="Cerca per oggetto o descrizione..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Oggetto</th>
              <th>Descrizione</th>
              <th>Inizio</th>
              <th>Fine</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer"
                onClick={() => setForm(r)}
              >
                <td>{r.inventario_nome}</td>
                <td>{r.descrizione || "-"}</td>
                <td>{fmt(r.data_inizio)}</td>
                <td>{r.data_fine ? fmt(r.data_fine) : "-"}</td>
                <td>{r.stato}</td>
                <td>
                  <button
                    className="btn-danger solid"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Eliminare?"))
                        axios.delete(`/api/riparazioni/${r.id}`).then(load);
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
            <select
              className="select"
              value={form.stato}
              onChange={(e) =>
                setForm((f) => ({ ...f, stato: e.target.value }))
              }
            >
              <option value="APERTO">Aperto</option>
              <option value="CHIUSO">Chiuso</option>
            </select>
            <input
              className="input md:col-span-2"
              placeholder="Descrizione"
              value={form.descrizione || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, descrizione: e.target.value }))
              }
            />
            <input
              type="date"
              className="input"
              value={form.data_inizio || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, data_inizio: e.target.value }))
              }
            />
            <input
              type="date"
              className="input"
              value={form.data_fine || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, data_fine: e.target.value }))
              }
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
