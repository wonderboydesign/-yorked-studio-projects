"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="pill-dark print:hidden">
      Descargar PDF <span aria-hidden>↓</span>
    </button>
  );
}
