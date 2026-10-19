"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
// @ts-expect-error: el paquete no trae tipos
import taskListPlugin from "markdown-it-task-lists";

// Los pendientes se guardan con "- [ ]" y las viñetas con "* ": con símbolos
// distintos, una lista de viñetas pegada a una de pendientes no se funde en
// una sola al volver a abrir la nota.
const TaskListMd = TaskList.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: { renderList: (node: unknown, delim: string, first: () => string) => void }, node: unknown) {
          state.renderList(node, "  ", () => "- ");
        },
        parse: {
          setup(md: { use: (plugin: unknown) => void }) {
            md.use(taskListPlugin);
          },
          updateDOM(element: HTMLElement) {
            element.querySelectorAll(".contains-task-list").forEach((list) => list.setAttribute("data-type", "taskList"));
          },
        },
      },
    };
  },
});

// Editor de texto enriquecido estilo Asana para notas y comentarios.
// Reconoce al escribir: "- " o "* " → viñetas, "1. " → lista numerada,
// "[ ] " → lista de pendientes, "**texto**" → negritas, "`código`", "# " →
// título, y convierte las URLs en enlaces (al escribir y al pegar).
// Se guarda como Markdown, así las notas y comentarios que ya existían
// (texto plano) se siguen viendo igual.

function extensions(placeholder?: string, editable = true) {
  return [
    StarterKit.configure({ heading: { levels: [2, 3] } }),
    Underline,
    Link.configure({
      autolink: true,
      linkOnPaste: true,
      openOnClick: true,
      HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
    }),
    TaskListMd,
    TaskItem.configure({ nested: true }),
    ...(editable && placeholder ? [Placeholder.configure({ placeholder })] : []),
    Markdown.configure({
      html: true,
      linkify: true,
      breaks: true,
      transformPastedText: true,
      tightLists: true,
      // Viñetas con "*" y pendientes con "- [ ]": así una lista de viñetas
      // seguida de una de pendientes no se funde en una sola al recargar
      bulletListMarker: "*",
    }),
  ];
}

function getMarkdown(editor: Editor): string {
  const md: string = editor.storage.markdown.getMarkdown();
  return md.trim();
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  onSubmit,
  placeholder,
  toolbar = "full",
  className = "",
  minHeight = 96,
  submitOnEnter = false,
}: {
  value: string;
  onChange?: (markdown: string) => void;
  onBlur?: (markdown: string) => void;
  // Cmd/Ctrl + Enter (o Enter si submitOnEnter). Devuelve false si falló,
  // para regresar el texto al editor.
  onSubmit?: (markdown: string) => Promise<boolean> | boolean;
  placeholder?: string;
  toolbar?: "full" | "compact" | "none";
  className?: string;
  minHeight?: number;
  submitOnEnter?: boolean;
}) {
  // Los callbacks cambian en cada render; el editor se crea una sola vez
  const handlers = useRef({ onChange, onBlur, onSubmit, submitOnEnter });
  handlers.current = { onChange, onBlur, onSubmit, submitOnEnter };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: extensions(placeholder),
    content: value,
    editorProps: {
      attributes: { class: "rich-text outline-none", style: `min-height:${minHeight}px` },
      handleKeyDown: (_view, event) => {
        const { onSubmit: submit, submitOnEnter: onEnter } = handlers.current;
        // Que las teclas no lleguen a los atajos de la ventana (cerrar, cambiar de tarea)
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.stopPropagation();
          if (submit) {
            event.preventDefault();
            doSubmit();
            return true;
          }
        }
        // Con "Enter envía", Shift + Enter abre una línea nueva de verdad (no un
        // salto dentro del párrafo), para que "- " y "1. " sigan creando listas
        if (event.key === "Enter" && event.shiftKey && onEnter && submit) {
          const ed = editorRef.current;
          if (ed) {
            event.preventDefault();
            if (ed.isActive("taskItem")) ed.commands.splitListItem("taskItem");
            else if (ed.isActive("listItem")) ed.commands.splitListItem("listItem");
            else ed.commands.splitBlock();
            return true;
          }
        }
        if (event.key === "Enter" && onEnter && submit && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
          // Dentro de una lista, Enter crea el siguiente elemento
          if (!editorRef.current?.isActive("listItem") && !editorRef.current?.isActive("taskItem")) {
            event.preventDefault();
            doSubmit();
            return true;
          }
        }
        if (event.key.startsWith("Arrow") || event.key === "Escape") event.stopPropagation();
        return false;
      },
    },
    onUpdate: ({ editor }) => handlers.current.onChange?.(getMarkdown(editor)),
    onBlur: ({ editor }) => handlers.current.onBlur?.(getMarkdown(editor)),
  });

  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;

  async function doSubmit() {
    const ed = editorRef.current;
    const submit = handlers.current.onSubmit;
    if (!ed || !submit) return;
    const md = getMarkdown(ed);
    if (!md) return;
    // Se limpia de inmediato (si se sigue escribiendo no se pierde nada y un
    // segundo Enter no lo publica dos veces); si falla, se devuelve el texto
    ed.commands.clearContent(true);
    if (!(await submit(md)) && ed.isEmpty) ed.commands.setContent(md, true);
  }

  // Si el valor cambia desde fuera (por ejemplo, se limpió el borrador)
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (value !== getMarkdown(editor)) editor.commands.setContent(value, false);
  }, [value, editor]);

  return (
    <div className={`rich-box ${className}`}>
      {toolbar !== "none" && editor && <Toolbar editor={editor} compact={toolbar === "compact"} />}
      <EditorContent editor={editor} className="px-4 py-3" />
    </div>
  );
}

// Solo lectura: muestra Markdown con el mismo formato que el editor
export function RichTextView({ value, className = "" }: { value: string; className?: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: extensions(undefined, false),
    content: value,
    editorProps: { attributes: { class: "rich-text" } },
  });
  useEffect(() => {
    if (editor && value !== getMarkdown(editor)) editor.commands.setContent(value, false);
  }, [value, editor]);
  // Antes de montar el editor, el texto plano evita un salto vacío
  if (!editor) return <p className={`whitespace-pre-wrap break-words ${className}`}>{value}</p>;
  return <EditorContent editor={editor} className={className} />;
}

function Toolbar({ editor, compact }: { editor: Editor; compact: boolean }) {
  const btn = (active: boolean) =>
    `h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg transition-colors ${
      active ? "bg-ink/10 text-ink" : "text-muted hover:text-ink hover:bg-ink/5"
    }`;
  const run = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    fn();
  };
  const chain = () => editor.chain().focus();

  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enlace (deja vacío para quitarlo)", prev ?? "https://");
    if (url === null) return;
    if (!url.trim() || url.trim() === "https://") {
      chain().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = /^(https?:|mailto:)/.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chain().insertContent(`<a href="${href}">${href}</a> `).run();
    } else {
      chain().extendMarkRange("link").setLink({ href }).run();
    }
  }

  const style = editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : "p";

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-ink/[0.07] px-2 py-1.5">
      {!compact && (
        <>
          <button type="button" title="Deshacer (⌘Z)" className={btn(false)} onMouseDown={run(() => chain().undo().run())}>
            <Icon d="M4 7h7a4 4 0 0 1 0 8H8M4 7l3-3M4 7l3 3" />
          </button>
          <button type="button" title="Rehacer (⌘⇧Z)" className={btn(false)} onMouseDown={run(() => chain().redo().run())}>
            <Icon d="M16 7H9a4 4 0 0 0 0 8h3M16 7l-3-3M16 7l-3 3" />
          </button>
          <Divider />
          <select
            value={style}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "p") chain().setParagraph().run();
              else chain().toggleHeading({ level: v === "h2" ? 2 : 3 }).run();
            }}
            className="h-8 rounded-lg bg-transparent px-2 text-sm text-ink hover:bg-ink/5 focus:outline-none cursor-pointer"
            title="Estilo de texto"
          >
            <option value="p">Texto normal</option>
            <option value="h2">Título</option>
            <option value="h3">Subtítulo</option>
          </select>
          <Divider />
        </>
      )}
      <button type="button" title="Negritas (⌘B)" className={btn(editor.isActive("bold"))} onMouseDown={run(() => chain().toggleBold().run())}>
        <span className="text-sm font-semibold">B</span>
      </button>
      <button type="button" title="Cursivas (⌘I)" className={btn(editor.isActive("italic"))} onMouseDown={run(() => chain().toggleItalic().run())}>
        <span className="text-sm italic font-serif">I</span>
      </button>
      <button type="button" title="Tachado" className={btn(editor.isActive("strike"))} onMouseDown={run(() => chain().toggleStrike().run())}>
        <span className="text-sm line-through">S</span>
      </button>
      <button type="button" title="Subrayado (⌘U)" className={btn(editor.isActive("underline"))} onMouseDown={run(() => chain().toggleUnderline().run())}>
        <span className="text-sm underline">U</span>
      </button>
      <button type="button" title="Enlace" className={btn(editor.isActive("link"))} onMouseDown={run(setLink)}>
        <Icon d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-.8.8M11.5 8.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l.8-.8" />
      </button>
      <button type="button" title="Código" className={btn(editor.isActive("code"))} onMouseDown={run(() => chain().toggleCode().run())}>
        <Icon d="M7 6l-4 4 4 4M13 6l4 4-4 4" />
      </button>
      <Divider />
      <button type="button" title="Viñetas (escribe “- ”)" className={btn(editor.isActive("bulletList"))} onMouseDown={run(() => chain().toggleBulletList().run())}>
        <Icon d="M8 5h9M8 10h9M8 15h9M3.5 5h.01M3.5 10h.01M3.5 15h.01" />
      </button>
      <button type="button" title="Lista numerada (escribe “1. ”)" className={btn(editor.isActive("orderedList"))} onMouseDown={run(() => chain().toggleOrderedList().run())}>
        <Icon d="M8 5h9M8 10h9M8 15h9M3 4h1v3M3 9.5h1.5L3 11.5h1.5M3 14h1.5v3H3M3 15.5h1.5" />
      </button>
      <button type="button" title="Lista de pendientes (escribe “[ ] ”)" className={btn(editor.isActive("taskList"))} onMouseDown={run(() => chain().toggleTaskList().run())}>
        <Icon d="M3 4h4v4H3zM3 12h4v4H3zM4 6l1 1 2-2M10 6h7M10 14h7" />
      </button>
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-ink/10" />;
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
