import React, { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// --- Tiny utilities
const fmt = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
const uid = () => Math.random().toString(36).slice(2);
const clamp = (n, min=0, max=100) => Math.max(min, Math.min(max, n));

// --- Default categories (very "girly travel" coded ✈️🩷)
const DEFAULT_CATEGORIES = [
  { key: "flights", label: "Flights", color: "#f472b6" }, // pink-400
  { key: "hotel", label: "Hotel / Stay", color: "#fb7185" }, // rose-400
  { key: "food", label: "Food & Coffee", color: "#fda4af" }, // rose-300
  { key: "goingout", label: "Going Out", color: "#e879f9" }, // fuchsia-400
  { key: "clothes", label: "Clothes", color: "#c084fc" }, // violet-400
  { key: "events", label: "Events", color: "#a78bfa" }, // violet-300
  { key: "transport", label: "Transport", color: "#60a5fa" }, // blue-400
  { key: "misc", label: "Misc", color: "#34d399" }, // emerald-400
];

const LS_KEY = "trip-budget-buddy-v1";

export default function TripBudgetBuddy() {
  const [tripName, setTripName] = useState("Girls' Trip — Spring Break ✨");
  const [budget, setBudget] = useState(1200);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [expenses, setExpenses] = useState([]);

  // Draft form state
  const [draft, setDraft] = useState({ name: "", amount: "", category: "flights", date: toInputDate(new Date()) });
  const [newCat, setNewCat] = useState({ label: "", color: randomCatColor() });

  // Load / persist
  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setTripName(parsed.tripName ?? tripName);
        setBudget(parsed.budget ?? budget);
        setCategories(parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES);
        setExpenses(Array.isArray(parsed.expenses) ? parsed.expenses : []);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const payload = { tripName, budget, categories, expenses };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  }, [tripName, budget, categories, expenses]);

  // Derived totals
  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const remaining = Math.max(0, budget - totalSpent);
  const percentUsed = budget > 0 ? clamp((totalSpent / budget) * 100) : 0;

  const byCategory = useMemo(() => {
    const map = new Map(categories.map(c => [c.key, { ...c, total: 0 }]));
    for (const e of expenses) {
      if (!map.has(e.category)) continue;
      map.get(e.category).total += e.amount;
    }
    return Array.from(map.values());
  }, [categories, expenses]);

  const chartData = byCategory.filter(c => c.total > 0).map(c => ({ name: c.label, value: Number(c.total.toFixed(2)), color: c.color }));

  // Handlers
  function addExpense(ev) {
    ev.preventDefault();
    const amount = Number(draft.amount);
    if (!draft.name || !amount || amount <= 0) return;
    setExpenses(prev => [{ id: uid(), name: draft.name.trim(), amount, category: draft.category, date: draft.date }, ...prev]);
    setDraft({ ...draft, name: "", amount: "" });
  }

  function removeExpense(id) {
    setExpenses(prev => prev.filter(e => e.id != id));
  }

  function addCategory(ev) {
    ev.preventDefault();
    const label = newCat.label.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (categories.some(c => c.key === key)) return;
    const cat = { key, label, color: newCat.color || randomCatColor() };
    setCategories(prev => [...prev, cat]);
    setNewCat({ label: "", color: randomCatColor() });
    // Auto-select new category in the expense form
    setDraft(d => ({ ...d, category: key }));
  }

  function resetAll() {
    if (!confirm("Reset trip, budget, and all expenses?")) return;
    setTripName("Girls' Trip — Spring Break ✨");
    setBudget(1200);
    setCategories(DEFAULT_CATEGORIES);
    setExpenses([]);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-fuchsia-50 text-slate-800">
      <div className="mx-auto max-w-5xl p-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: "#ec7699" }}>Budget Girlfriend 🩷</h1>
            <p className="text-sm text-slate-600">Your personal budget girlfriend for trips. Set a budget, add expenses, and watch the vibes (and savings) fly ✨</p>
          </div>
          <button onClick={resetAll} className="self-start rounded-xl bg-rose-100 px-4 py-2 text-rose-700 hover:bg-rose-200 transition">Reset</button>
        </header>

        {/* Trip Card */}
        <section className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl bg-white/80 backdrop-blur shadow-sm p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <input
                className="w-full rounded-xl border border-rose-100 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-fuchsia-300"
                value={tripName}
                onChange={e => setTripName(e.target.value)}
                placeholder="Trip name (e.g., Miami Spring Break)"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Budget</span>
                <input
                  type="number"
                  min={0}
                  className="w-36 rounded-xl border border-rose-100 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-fuchsia-300"
                  value={budget}
                  onChange={e => setBudget(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="mt-4">
              <ProgressBar percent={percentUsed} />
              <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span className="font-medium text-slate-700">Total Spent: <span className="text-rose-700">{fmt.format(totalSpent || 0)}</span></span>
                <span className={`font-medium text-slate-700`}>Remaining: <span className={`${remaining <= budget * 0.1 ? "text-rose-700" : "text-emerald-700"}`}>{fmt.format(remaining || 0)}</span></span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/80 backdrop-blur shadow-sm p-5">
            <h3 className="font-semibold text-slate-700 mb-2">Add Category</h3>
            <form onSubmit={addCategory} className="flex items-center gap-2">
              <input
                className="flex-1 rounded-xl border border-rose-100 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-300"
                placeholder="e.g., Photoshoot, Museum, Brunch"
                value={newCat.label}
                onChange={(e) => setNewCat(s => ({ ...s, label: e.target.value }))}
              />
              <input
                type="color"
                title="Pick color"
                className="h-10 w-12 rounded-xl border border-rose-100"
                value={newCat.color}
                onChange={(e) => setNewCat(s => ({ ...s, color: e.target.value }))}
              />
              <button className="rounded-xl bg-fuchsia-600 px-4 py-2 text-white transition"style={{ backgroundColor: "#ec7699" }}>Add</button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {categories.map(c => (
                <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 border" style={{ borderColor: c.color }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />{c.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Add Expense + Chart */}
        <section className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl bg-white/80 backdrop-blur shadow-sm p-5">
            <h3 className="font-semibold text-slate-700 mb-3">Add Expense</h3>
            <form onSubmit={addExpense} className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                className="rounded-xl border border-rose-100 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-300"
                placeholder="What was it? (e.g., Delta flight)"
                value={draft.name}
                onChange={e => setDraft({ ...draft, name: e.target.value })}
              />
              <select
                className="rounded-xl border border-rose-100 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-300"
                value={draft.category}
                onChange={e => setDraft({ ...draft, category: e.target.value })}
              >
                {categories.map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                step="0.01"
                className="rounded-xl border border-rose-100 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-300"
                placeholder="Amount"
                value={draft.amount}
                onChange={e => setDraft({ ...draft, amount: e.target.value })}
              />
              <input
                type="date"
                className="rounded-xl border border-rose-100 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-300"
                value={draft.date}
                onChange={e => setDraft({ ...draft, date: e.target.value })}
              />
              <div className="md:col-span-4">
                <button className="w-full rounded-xl px-4 py-2 text-white transition"style={{ backgroundColor: "#ec7699" }}>Add expense</button>
              </div>
            </form>

            <div className="mt-5">
              <h3 className="font-semibold text-slate-700 mb-2">Recent</h3>
              {expenses.length === 0 ? (
                <p className="text-sm text-slate-500">No expenses yet — add your first ✨</p>
              ) : (
                <ul className="divide-y divide-rose-100">
                  {expenses.map(e => (
                    <li key={e.id} className="flex items-center justify-between py-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: catColor(categories, e.category) }} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-700">{e.name}</p>
                          <p className="text-xs text-slate-500">{catLabel(categories, e.category)} · {prettyDate(e.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-800">{fmt.format(e.amount)}</span>
                        <button onClick={() => removeExpense(e.id)} className="rounded-lg border px-2 py-1 text-xs hover:bg-rose-50">Remove</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/80 backdrop-blur shadow-sm p-5 flex flex-col">
            <h3 className="font-semibold text-slate-700 mb-3">Category Breakdown</h3>
            <div className="h-60">
              {chartData.length === 0 ? (
                <div className="h-full grid place-items-center text-sm text-slate-500">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                      {chartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmt.format(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <ul className="mt-4 space-y-2 text-sm">
              {byCategory.map(c => (
                <li key={c.key} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="truncate">{c.label}</span>
                  </div>
                  <span className="font-medium">{fmt.format(c.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

function ProgressBar({ percent }) {
  return (
    <div className="w-full h-4 rounded-full bg-rose-100 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-rose-400 via-fuchsia-400 to-violet-400 transition-[width] duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function toInputDate(d) {
  const dt = new Date(d);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function prettyDate(iso) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function catColor(categories, key) {
  return categories.find(c => c.key === key)?.color ?? "#e5e7eb"; // slate-200
}

function catLabel(categories, key) {
  return categories.find(c => c.key === key)?.label ?? key;
}

function randomCatColor() {
  const palette = ["#f472b6", "#fb7185", "#fda4af", "#e879f9", "#c084fc", "#a78bfa", "#60a5fa", "#34d399", "#f59e0b", "#22d3ee"];
  return palette[Math.floor(Math.random() * palette.length)];
}
