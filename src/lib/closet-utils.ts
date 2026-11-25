export const daysSince = (d: string | null | undefined) =>
  d ? Math.floor((Date.now() - new Date(d.length === 10 ? d + "T00:00:00" : d).getTime()) / 86_400_000) : Infinity;

export const costPerWear = (i: { price: number | null; times_worn: number }) =>
  i.price != null ? i.price / Math.max(1, i.times_worn) : null;

export const money = (n: number | null | undefined) =>
  n == null ? "—" : `$${n < 10 ? n.toFixed(2) : Math.round(n).toLocaleString()}`;

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
