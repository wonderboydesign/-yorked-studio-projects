import { IVA_RATE } from "./portal";

// Cotizaciones de proveedores que el estudio presenta en el portal del cliente

export interface SupplierItem {
  description: string;
  quantity: number;
  unitPrice: number; // MXN sin IVA
}

export interface SupplierQuoteRow {
  id: string;
  title: string;
  supplier: string | null;
  items: SupplierItem[];
  notes: string | null;
  validUntil: string | null;
  withIva: boolean;
  fileUrl: string | null;
  filePath: string | null;
  showFile: boolean;
  status: "pending" | "approved";
  approvedAt: string | null;
  createdAt: string;
}

export function cleanItems(input: unknown): SupplierItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((it) => {
      const o = (it ?? {}) as Record<string, unknown>;
      const description = typeof o.description === "string" ? o.description.trim().slice(0, 300) : "";
      const quantity = Math.max(0, Number(o.quantity) || 0);
      const unitPrice = Math.max(0, Math.round((Number(o.unitPrice) || 0) * 100) / 100);
      return { description, quantity, unitPrice };
    })
    .filter((it) => it.description)
    .slice(0, 60);
}

export function supplierTotals(items: SupplierItem[], withIva: boolean) {
  const subtotal = items.reduce((n, it) => n + it.quantity * it.unitPrice, 0);
  const iva = withIva ? Math.round(subtotal * IVA_RATE * 100) / 100 : 0;
  return { subtotal, iva, total: subtotal + iva };
}
