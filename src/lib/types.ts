export type Status = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export interface Project {
  id: string;
  name: string;
  client: string | null;
  color: string;
  startDate: string;
  endDate: string;
    notes: string | null;
  archived: boolean;
}

export interface Task {
  id: string;
  name: string;
  projectId: string;
  status: Status;
  startDate: string;
  endDate: string;
    notes: string | null;
  updatedAt: string;
  project?: Project;
}

export const STATUS_LABELS: Record<Status, string> = {
  TODO: "Por hacer",
  IN_PROGRESS: "En progreso",
  IN_REVIEW: "En revisión",
  DONE: "Terminado",
};

export const STATUS_COLORS: Record<Status, string> = {
  TODO: "#f0efed",
  IN_PROGRESS: "#d2e4f8",
  IN_REVIEW: "#f4ded3",
  DONE: "#dbe6dd",
};

export const STATUS_ORDER: Status[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
