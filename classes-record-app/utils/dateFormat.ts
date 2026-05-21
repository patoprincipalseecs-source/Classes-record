
// Format date as "21 May 2026"
export function formatDateDMY(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
