// Color de cada pendiente: vencido en rojo, por hacer en ámbar, por revisar en azul
export const ALERT_STYLE = {
  late: "bg-red-500/15 text-red-700 dark:text-red-400",
  todo: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  info: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
} as const;
