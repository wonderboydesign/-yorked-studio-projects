// Secciones del portal del cliente que el estudio puede mostrar u ocultar
// (por proyecto). "Retainer" es para clientes de contenido continuo: el
// portal se vuelve una bandeja de "Lo nuevo", sin avance, fases ni pagos.

export const PORTAL_SECTIONS: { id: string; label: string; hint: string }[] = [
  { id: "brief", label: "Brief (formulario)", hint: "Formulario que el cliente llena" },
  { id: "avance", label: "Avance y fecha de entrega", hint: "El porcentaje grande del inicio" },
  { id: "fases", label: "Fases", hint: "Calendario por fases" },
  { id: "reuniones", label: "Reuniones", hint: "Próxima reunión y links" },
  { id: "entregas", label: "Entregas / Lo nuevo", hint: "Lo que vas subiendo" },
  { id: "cotizaciones", label: "Cotizaciones de proveedores", hint: "Producción e impresión" },
  { id: "pagos", label: "Pagos", hint: "Anticipo, finiquito y datos de transferencia" },
  { id: "facturacion", label: "Facturas y recibos", hint: "Constancia fiscal y facturas" },
  { id: "marca", label: "Tu marca", hint: "Descargables de la marca" },
];

export const PORTAL_SECTION_IDS = PORTAL_SECTIONS.map((s) => s.id);

// Lo que un retainer no necesita por defecto
export const RETAINER_HIDDEN = ["avance", "fases", "pagos"];
