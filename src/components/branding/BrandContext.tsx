"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  BrandData,
  BrandItem,
  BrandResearch,
  BrandStage,
  BrandWorkspace,
  Moodboard,
  Presentation,
} from "@/lib/branding";
import { uploadFile } from "@/lib/upload";
import { Project } from "@/lib/types";

export type NewItem = Partial<
  Pick<BrandItem, "title" | "body" | "url" | "pathname" | "contentType" | "linkUrl" | "status" | "boardId" | "data">
> & {
  section: BrandStage;
  kind: BrandItem["kind"];
  referenceId?: string;
};

interface BrandApi {
  project: Project;
  data: BrandData;
  notify: (message: string, tone?: "ok" | "error") => void;
  patchWorkspace: (
    fields: Partial<Pick<BrandWorkspace, "brief" | "context" | "conceptNotes" | "plan" | "stage" | "research">>
  ) => Promise<void>;
  // Cambia el research a partir del valor más reciente (no del de este
  // render), para que dos guardados seguidos no se pisen
  patchResearch: (update: (current: BrandResearch) => BrandResearch) => Promise<void>;
  addItem: (item: NewItem) => Promise<BrandItem | null>;
  updateItem: (id: string, fields: Partial<BrandItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  uploadItems: (files: FileList | File[], base: NewItem, allowed?: string[]) => Promise<void>;
  uploading: number;
  addBoard: (name: string) => Promise<Moodboard | null>;
  updateBoard: (id: string, fields: Partial<Pick<Moodboard, "name" | "notes">>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  addPresentation: (title: string, slides: Presentation["slides"]) => Promise<Presentation | null>;
  updatePresentation: (id: string, fields: Partial<Pick<Presentation, "title" | "slides">>) => Promise<void>;
  deletePresentation: (id: string) => Promise<void>;
  generateConcepts: (count: number, direction: string) => Promise<boolean>;
  reload: () => Promise<void>;
}

const BrandContext = createContext<BrandApi | null>(null);

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrand fuera de BrandProvider");
  return ctx;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Error ${res.status}`);
  }
  return res.json();
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export function BrandProvider({
  project,
  notify,
  children,
}: {
  project: Project;
  notify: (message: string, tone?: "ok" | "error") => void;
  children: React.ReactNode;
}) {
  const [data, setData] = useState<BrandData | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(0);
  const projectId = project.id;
  const researchRef = useRef<BrandResearch>({});
  useEffect(() => {
    researchRef.current = data?.workspace.research ?? {};
  }, [data?.workspace.research]);

  const reload = useCallback(async () => {
    try {
      setData(await json<BrandData>(await fetch(`/api/branding/${projectId}`)));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el proyecto.");
    }
  }, [projectId]);

  useEffect(() => {
    setData(null);
    reload();
  }, [reload]);

  const fail = useCallback(
    (e: unknown, fallback: string) => notify(e instanceof Error ? e.message : fallback, "error"),
    [notify]
  );

  const api = useMemo<BrandApi | null>(() => {
    if (!data) return null;

    async function patchWorkspace(fields: Parameters<BrandApi["patchWorkspace"]>[0]) {
      setData((d) => d && { ...d, workspace: { ...d.workspace, ...fields } as BrandWorkspace });
      try {
        await json(await fetch(`/api/branding/${projectId}`, {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify(fields),
        }));
      } catch (e) {
        fail(e, "No se pudo guardar.");
      }
    }

    async function patchResearch(update: (current: BrandResearch) => BrandResearch) {
      const next = update(researchRef.current);
      researchRef.current = next;
      await patchWorkspace({ research: next });
    }

    async function addItem(item: NewItem) {
      try {
        const created = await json<BrandItem>(await fetch(`/api/branding/${projectId}/items`, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify(item),
        }));
        setData((d) => d && { ...d, items: [...d.items, created] });
        return created;
      } catch (e) {
        fail(e, "No se pudo agregar.");
        return null;
      }
    }

    async function updateItem(id: string, fields: Partial<BrandItem>) {
      setData(
        (d) =>
          d && {
            ...d,
            items: d.items.map((i) =>
              i.id === id
                ? { ...i, ...fields, ...(fields.data ? { data: { ...(i.data ?? {}), ...fields.data } } : {}) }
                : i
            ),
          }
      );
      try {
        await json(await fetch(`/api/branding/items/${id}`, {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify(fields),
        }));
      } catch (e) {
        fail(e, "No se pudo guardar.");
        reload();
      }
    }

    async function deleteItem(id: string) {
      setData((d) => d && { ...d, items: d.items.filter((i) => i.id !== id) });
      try {
        await json(await fetch(`/api/branding/items/${id}`, { method: "DELETE" }));
      } catch (e) {
        fail(e, "No se pudo eliminar.");
        reload();
      }
    }

    async function uploadItems(files: FileList | File[], base: NewItem, allowed?: string[]) {
      for (const file of Array.from(files)) {
        setUploading((n) => n + 1);
        try {
          const up = await uploadFile(file, allowed);
          await addItem({
            ...base,
            title: base.title ?? up.filename.replace(/\.[^.]+$/, ""),
            url: up.url,
            pathname: up.pathname,
            contentType: up.contentType,
          });
        } catch (e) {
          fail(e, `No se pudo subir "${file.name}".`);
        } finally {
          setUploading((n) => n - 1);
        }
      }
    }

    async function addBoard(name: string) {
      try {
        const board = await json<Moodboard>(await fetch(`/api/branding/${projectId}/boards`, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ name }),
        }));
        setData((d) => d && { ...d, moodboards: [...d.moodboards, board] });
        return board;
      } catch (e) {
        fail(e, "No se pudo crear el moodboard.");
        return null;
      }
    }

    async function updateBoard(id: string, fields: Partial<Pick<Moodboard, "name" | "notes">>) {
      setData((d) => d && { ...d, moodboards: d.moodboards.map((b) => (b.id === id ? { ...b, ...fields } : b)) });
      try {
        await json(await fetch(`/api/branding/boards/${id}`, {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify(fields),
        }));
      } catch (e) {
        fail(e, "No se pudo guardar el moodboard.");
      }
    }

    async function deleteBoard(id: string) {
      setData((d) =>
        d && {
          ...d,
          moodboards: d.moodboards.filter((b) => b.id !== id),
          items: d.items.filter((i) => i.boardId !== id),
        }
      );
      try {
        await json(await fetch(`/api/branding/boards/${id}`, { method: "DELETE" }));
      } catch (e) {
        fail(e, "No se pudo eliminar el moodboard.");
        reload();
      }
    }

    async function addPresentation(title: string, slides: Presentation["slides"]) {
      try {
        const p = await json<Presentation>(await fetch(`/api/branding/${projectId}/presentations`, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ title, slides }),
        }));
        setData((d) => d && { ...d, presentations: [...d.presentations, p] });
        return p;
      } catch (e) {
        fail(e, "No se pudo crear la presentación.");
        return null;
      }
    }

    async function updatePresentation(id: string, fields: Partial<Pick<Presentation, "title" | "slides">>) {
      setData((d) =>
        d && { ...d, presentations: d.presentations.map((p) => (p.id === id ? { ...p, ...fields } : p)) }
      );
      try {
        await json(await fetch(`/api/branding/presentations/${id}`, {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify(fields),
        }));
      } catch (e) {
        fail(e, "No se pudo guardar la presentación.");
      }
    }

    async function deletePresentation(id: string) {
      setData((d) => d && { ...d, presentations: d.presentations.filter((p) => p.id !== id) });
      try {
        await json(await fetch(`/api/branding/presentations/${id}`, { method: "DELETE" }));
      } catch (e) {
        fail(e, "No se pudo eliminar la presentación.");
        reload();
      }
    }

    async function generateConcepts(count: number, direction: string) {
      try {
        const created = await json<BrandItem[]>(await fetch(`/api/branding/${projectId}/concepts`, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ count, direction }),
        }));
        setData((d) => d && { ...d, items: [...d.items, ...created] });
        notify(`${created.length} concepto${created.length === 1 ? "" : "s"} nuevo${created.length === 1 ? "" : "s"}`);
        return true;
      } catch (e) {
        fail(e, "No se pudieron generar conceptos.");
        return false;
      }
    }

    return {
      project,
      data,
      notify,
      patchWorkspace,
      patchResearch,
      addItem,
      updateItem,
      deleteItem,
      uploadItems,
      uploading,
      addBoard,
      updateBoard,
      deleteBoard,
      addPresentation,
      updatePresentation,
      deletePresentation,
      generateConcepts,
      reload,
    };
  }, [data, project, projectId, notify, fail, reload, uploading]);

  if (error && !data) {
    return (
      <div className="py-24 text-center">
        <p className="text-xs text-muted mb-3">{error}</p>
        <button onClick={reload} className="text-xs px-3 py-1.5 bg-button hover:bg-button-hover rounded-full">
          Reintentar
        </button>
      </div>
    );
  }
  if (!api) {
    return <p className="py-24 text-center text-xs text-muted">Cargando proyecto…</p>;
  }
  return <BrandContext.Provider value={api}>{children}</BrandContext.Provider>;
}
