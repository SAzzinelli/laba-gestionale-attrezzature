// src/components/Calendar.jsx
import React, { useMemo } from "react";

/* ---------- util date ---------- */
const toISO = (d) => d.toISOString().slice(0, 10);
const fromISO = (iso) => {
 const [y, m, d] = iso.split("-").map(Number);
 return new Date(y, m - 1, d);
};
const addDays = (d, n) => {
 const x = new Date(d);
 x.setDate(x.getDate() + n);
 return x;
};
const startOfWeek = (d) => {
 const diff = (d.getDay() + 6) % 7;
 return addDays(d, -diff);
};
const sameDay = (a, b) =>
 a.getFullYear() === b.getFullYear() &&
 a.getMonth() === b.getMonth() &&
 a.getDate() === b.getDate();

/* ---------- colori pastello deterministici ---------- */
function hash(s) {
 let h = 0;
 const str = String(s || "");
 for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
 return h;
}
const PAL = [
 ["hsla(10,90%,90%,.95)", "hsl(10,70%,56%)", "hsl(10,40%,28%)"],
 ["hsla(40,95%,90%,.95)", "hsl(40,70%,52%)", "hsl(35,40%,26%)"],
 ["hsla(145,60%,90%,.95)", "hsl(145,45%,45%)", "hsl(145,35%,25%)"],
 ["hsla(200,70%,90%,.95)", "hsl(200,60%,50%)", "hsl(200,40%,26%)"],
 ["hsla(260,65%,92%,.95)", "hsl(260,55%,55%)", "hsl(260,35%,28%)"],
 ["hsla(320,60%,92%,.95)", "hsl(320,55%,56%)", "hsl(320,40%,28%)"],
];
const pastelFor = (seed) => {
 const [bg, br, tx] = PAL[hash(seed) % PAL.length];
 return { bg, br, tx };
};

/* ---------- helpers layout ---------- */
function buildMonthGrid(focusDate) {
 const first = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
 const start = startOfWeek(first);
 const weeks = [];
 for (let w = 0; w < 6; w++) {
 const row = [];
 for (let d = 0; d < 7; d++) row.push(addDays(start, w * 7 + d));
 weeks.push(row);
 }
 return weeks;
}
function weekSegment(evStart, evEnd, weekStart) {
 const weekEnd = addDays(weekStart, 6);
 const s = evStart > weekStart ? evStart : weekStart;
 const e = evEnd < weekEnd ? evEnd : weekEnd;
 if (e < weekStart || s > weekEnd) return null;
 const colStart = Math.max(0, (s.getDay() + 6) % 7);
 const colEnd = Math.max(0, (e.getDay() + 6) % 7);
 return { colStart, span: colEnd - colStart + 1 };
}

/* ---------- sotto-componenti “senza hook” ---------- */
function EventRich({ ev, onClick }) {
 // head pieno + body testo (giorno/settimana)
 const css = {
 borderColor: ev.color.br,
 // per body chiaro ricavo un bg leggibile
 ["--accent"]: ev.color.br,
 ["--event-bg"]: ev.color.bg,
 ["--event-tx"]: ev.color.tx,
 };
 return (
 <button
 className="cal-eventBar--rich"
 style={css}
 onClick={() => onClick(ev.raw)}
 title={`${ev.chi} — ${ev.nome} — Q.${ev.qty}`}
 >
 <div className="head">{ev.chi}</div>
 <div className="body">
 <div className="object">{ev.nome}</div>
 <div className="qty">Quantità {ev.qty}</div>
 </div>
 </button>
 );
}
function EventCompact({ ev, onClick }) {
 // una riga (mese)
 const css = {
 background: ev.color.bg,
 borderColor: ev.color.br,
 color: ev.color.tx,
 ["--accent"]: ev.color.br,
 };
 return (
 <button
 className="cal-eventBar cal-eventBar--compact"
 style={css}
 onClick={() => onClick(ev.raw)}
 title={`${ev.chi} — ${ev.nome} — Q.${ev.qty}`}
 >
 <div className="title">{ev.chi}</div>
 <div className="object">• {ev.nome}</div>
 <div className="qty" style={{ marginLeft: "auto" }}>
 Q.{ev.qty}
 </div>
 </button>
 );
}

/* ===================== COMPONENTE PRINCIPALE ===================== */
export default function CalendarClassic({
 items = [],
 view = "month", // "day" | "week" | "month"
 focusDate = new Date(),
 onEventClick = () => {},
}) {
 // ✅ un solo hook in cima, mai nei rami
 const events = useMemo(
 () =>
 items
 .filter((r) => r.data_uscita)
 .map((r) => {
 const start = fromISO(r.data_uscita);
 const end = fromISO(r.data_rientro || r.data_uscita);
 const key = r.id ?? `${r.inventario_id || "x"}-${r.data_uscita}`;
 return {
 key: String(key),
 start,
 end,
 chi: r.chi,
 nome: r.inventario_nome,
 qty: r.quantita,
 raw: r,
 color: pastelFor(
 r.id ?? r.inventario_id ?? r.chi ?? r.inventario_nome,
 ),
 };
 }),
 [items],
 );

 const today = new Date();

 let content = null; // 👈 prepariamo il contenuto, poi un solo return

 if (view === "day") {
 const list = events.filter(
 (ev) => ev.start <= focusDate && ev.end >= focusDate,
 );
 content = (
 <div className="cal-stack">
 {list.length === 0 && (
 <div className="text-sm text-slate-500">
 Nessun prestito in questa data.
 </div>
 )}
 {list.map((ev) => (
 <EventRich key={ev.key} ev={ev} onClick={onEventClick} />
 ))}
 </div>
 );
 } else if (view === "week") {
 const weekStart = startOfWeek(focusDate);
 const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
 const segments = [];
 events.forEach((ev) => {
 const seg = weekSegment(ev.start, ev.end, weekStart);
 if (seg) segments.push({ ev, ...seg });
 });

 content = (
 <div className="cal-row cal-week">
 <div className="cal-grid">
 {days.map((d) => (
 <div key={toISO(d)} className="cal-cell">
 <div className="cal-day">
 <span
 className={
 sameDay(d, today)
 ? "inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white"
 : ""
 }
 >
 {d.getDate()}
 </span>
 </div>
 </div>
 ))}
 </div>
 <div className="cal-overlay">
 {segments.map(({ ev, colStart, span }) => (
 <div
 key={ev.key}
 style={{ gridColumn: `${colStart + 1} / span ${span}` }}
 >
 <EventRich ev={ev} onClick={onEventClick} />
 </div>
 ))}
 </div>
 </div>
 );
 } else {
 // month
 const weeks = buildMonthGrid(focusDate);
 const monthSegments = weeks.map((week) => {
 const ws = week[0];
 const segs = [];
 events.forEach((ev) => {
 const seg = weekSegment(ev.start, ev.end, ws);
 if (seg) segs.push({ ev, ...seg });
 });
 return segs;
 });

 content = (
 <div className="space-y-2">
 {weeks.map((week, wi) => (
 <div key={wi} className="cal-row">
 <div className="cal-grid">
 {week.map((d) => (
 <div key={toISO(d)} className="cal-cell">
 <div className="cal-day">
 <span
 className={
 sameDay(d, today)
 ? "inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white"
 : ""
 }
 >
 {d.getDate()}
 </span>
 </div>
 </div>
 ))}
 </div>
 <div className="cal-overlay">
 {monthSegments[wi].map(({ ev, colStart, span }) => (
 <div
 key={ev.key}
 style={{ gridColumn: `${colStart + 1} / span ${span}` }}
 >
 <EventCompact ev={ev} onClick={onEventClick} />
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 );
 }

 return <div className="space-y-3">{content}</div>;
}
