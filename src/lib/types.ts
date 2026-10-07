export type Status = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export interface User {
  id: string;
  name: string;
  email: string;
}

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

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
  authorId: string | null;
  author?: { id: string; name: string } | null;
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
  assignees: User[];
  attachments?: Attachment[];
  comments?: Comment[];
}

// Lo que se envía al guardar una tarea: no son campos de Task tal cual
// (assigneeId/assignees se reemplazan por una lista de ids)
export type TaskInput = Partial<
  Omit<Task, "id" | "project" | "assignees" | "attachments" | "comments" | "updatedAt">
> & { assigneeIds?: string[] };

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  taskId: string;
  task: { id: string; name: string };
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
