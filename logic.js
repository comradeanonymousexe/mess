// Pure accounting logic. No Firebase in here, so it can be tested on its own.
import { CFG } from './config.js';

export const sum = a => a.reduce((s, x) => s + x, 0);

// every day from..to inclusive, as YYYY-MM-DD (empty if from > to)
export function eachDay(from, to) {
  const out = [], [y, m, d] = from.split('-').map(Number), t = new Date(Date.UTC(y, m - 1, d));
  for (let s = from; s <= to; t.setUTCDate(t.getUTCDate() + 1), s = t.toISOString().slice(0, 10)) out.push(s);
  return out;
}

// Member type on a given day. Type changes are kept as history, so past days never get rewritten.
export function typeAt(m, d) {
  const h = m.hist && m.hist.length ? m.hist : [{ from: m.start, type: m.type }];
  let t = h[0].type;
  h.forEach(x => { if (x.from <= d) t = x.type; });
  return t;
}

// Meals of member m on day d for meal k.
// Starts from the default (regular = CFG.perMeal, irregular = 0), then applies that day's
// overrides oldest to newest; the last matching one wins. n == null means "back to default".
export function cnt(m, d, k, ov) {
  if (d < m.start || (m.end && d > m.end)) return 0;
  const def = typeAt(m, d) === CFG.reg ? CFG.perMeal : 0;
  let c = def;
  ov.forEach(o => {
    if ((o.uid === '*' || o.uid === m.id) && (o.meal === '*' || o.meal === k)) c = o.n == null ? def : o.n;
  });
  return c;
}

// Who pays whom: biggest debtor is matched against biggest creditor until nothing is left.
export function settle(list) {
  const cr = list.filter(m => m.bal >= 0.5).map(m => ({ id: m.id, n: m.name, a: m.bal })).sort((x, y) => y.a - x.a);
  const dr = list.filter(m => m.bal <= -0.5).map(m => ({ id: m.id, n: m.name, a: -m.bal })).sort((x, y) => y.a - x.a);
  const out = [];
  let i = 0, j = 0;
  while (i < dr.length && j < cr.length) {
    const t = Math.min(dr[i].a, cr[j].a);
    out.push({ from: dr[i].id, fn: dr[i].n, to: cr[j].id, tn: cr[j].n, amt: t });
    dr[i].a -= t; cr[j].a -= t;
    if (dr[i].a < 0.5) i++;
    if (cr[j].a < 0.5) j++;
  }
  return out;
}

// D = { members, deposits, expenses, meals }, t = today (YYYY-MM-DD). All-time totals, no month split.
export function calc(D, t) {
  const ovBy = {};
  [...D.meals].sort((a, b) => a.ts - b.ts).forEach(o => (ovBy[o.date] = ovBy[o.date] || []).push(o));
  const nm = id => (D.members.find(m => m.id === id) || {}).name || '?';
  const byD = (a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.ts - b.ts;
  const exp = [...D.expenses].sort(byD).map(x => ({ id: x.id, d: x.date, item: x.item, qty: x.qty, price: +x.price, by: (x.by || []).map(nm).join(', ') }));
  const dep = [...D.deposits].sort(byD).map(x => ({ id: x.id, d: x.date, name: nm(x.uid), amt: +x.amt, note: x.note || '' }));
  const list = D.members.map(m => {
    const to = m.end && m.end < t ? m.end : t;
    const meals = sum(eachDay(m.start || t, to).map(d => sum(CFG.meals.map(k => cnt(m, d, k, ovBy[d] || [])))));
    return { ...m, on: !m.end, meals, dep: sum(D.deposits.filter(x => x.uid === m.id).map(x => +x.amt)) };
  });
  const totalExp = sum(exp.map(x => x.price)), totalMeals = sum(list.map(m => m.meals));
  const wMeals = sum(list.map(m => m.meals * (m.w || 1)));   // meals weighted by each member's price factor
  const rate = wMeals ? totalExp / wMeals : 0;               // base rate, for a member with factor 1
  list.forEach(m => { m.cost = m.meals * (m.w || 1) * rate; m.bal = m.dep - m.cost; });
  return { list, exp, dep, rate, totalExp, totalMeals, totalDep: sum(dep.map(x => x.amt)), pay: settle(list), nm };
}

// Meals per member per slot between from and to (inclusive). Blank from = earliest start, blank/future to = today.
export function mealTable(D, from, to, t) {
  const ovBy = {};
  [...D.meals].sort((a, b) => a.ts - b.ts).forEach(o => (ovBy[o.date] = ovBy[o.date] || []).push(o));
  const lo = from || D.members.map(m => m.start || t).sort()[0] || t, hi = to && to < t ? to : t;
  const days = eachDay(lo, hi);
  return D.members.map(m => {
    const c = CFG.meals.map(k => sum(days.map(d => cnt(m, d, k, ovBy[d] || []))));
    return { id: m.id, name: m.name, on: !m.end, c, total: sum(c) };
  }).filter(r => r.total > 0 || r.on);
}