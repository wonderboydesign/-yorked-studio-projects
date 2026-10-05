import { Status } from "./types";
import { localToday, toISODate } from "./date";

export type DueTone = "overdue" | "today" | "upcoming" | "done";

// Compara días en formato YYYY-MM-DD para no mezclar zonas horarias
export function dueTone(endDate: string, status: Status): DueTone {
  if (status === "DONE") return "done";
  const end = endDate.slice(0, 10);
  const today = toISODate(localToday());
  if (end < today) return "overdue";
  if (end === today) return "today";
  return "upcoming";
}

export const DUE_TEXT_CLASS: Record<DueTone, string> = {
  overdue: "text-red-600",
  today: "text-accent",
  upcoming: "text-muted",
  done: "text-muted",
};

export const DUE_DOT_CLASS: Record<DueTone, string | null> = {
  overdue: "bg-red-600",
  today: "bg-accent",
  upcoming: null,
  done: null,
};
