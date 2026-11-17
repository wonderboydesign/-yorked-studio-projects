// "Hoy" para el servidor, en la zona del estudio (Querétaro), a medianoche
// UTC como el resto de las fechas de la app
export function localTodayUTC(timeZone = "America/Mexico_City"): Date {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return new Date(`${parts}T00:00:00Z`);
}
