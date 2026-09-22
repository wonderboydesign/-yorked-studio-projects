export const metadata = {
  title: "Términos de servicio — Yorked Studio Task Manager",
};

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f6f6f6" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif", color: "#262626", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Términos de servicio</h1>
      <p style={{ color: "#898780", marginBottom: 32 }}>Última actualización: septiembre de 2026</p>

      <p>
        Yorked Studio Task Manager es una herramienta de uso interno y personal,
        creada para la gestión de proyectos y tareas de Yorked Studio. No se
        ofrece como producto o servicio al público general.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>Uso de la aplicación</h2>
      <p>
        El acceso a la aplicación está restringido mediante autenticación. Queda
        prohibido el uso de la aplicación por personas distintas al propietario
        y a las personas que este autorice explícitamente.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>Integraciones con terceros</h2>
      <p>
        La aplicación puede conectarse de forma opcional con Google Calendar
        para mostrar información de calendario dentro de la propia app. El uso
        de esta integración está sujeto también a los términos de servicio de
        Google.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>Sin garantías</h2>
      <p>
        La aplicación se ofrece "tal cual", sin garantías de ningún tipo. El
        desarrollador no es responsable de pérdidas de información derivadas
        del uso de la aplicación.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>Contacto</h2>
      <p>
        Para cualquier duda sobre estos términos, puedes contactar al
        desarrollador de esta aplicación directamente.
      </p>
      </div>
    </div>
  );
}
