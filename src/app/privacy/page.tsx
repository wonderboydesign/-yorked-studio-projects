export const metadata = {
  title: "Política de privacidad — Yorked Studio Task Manager",
};

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f6f6f6" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif", color: "#262626", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Política de privacidad</h1>
      <p style={{ color: "#898780", marginBottom: 32 }}>Última actualización: septiembre de 2026</p>

      <p>
        Yorked Studio Task Manager es una herramienta interna de uso personal,
        desarrollada y operada por Yorked Studio para la gestión de sus propios
        proyectos y tareas. No está destinada al público general ni a terceros.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>¿Qué información se utiliza?</h2>
      <p>
        La aplicación almacena únicamente la información de proyectos y tareas que
        el propio usuario ingresa directamente en la plataforma (nombres, fechas,
        estados y notas).
      </p>
      <p>
        Si el usuario decide conectar su cuenta de Google Calendar, la aplicación
        solicita permiso de solo lectura sobre los eventos del calendario, con el
        único fin de mostrar las próximas reuniones dentro del panel principal de
        la aplicación. Esta información no se almacena de forma permanente, no se
        comparte con terceros, y no se utiliza para ningún otro propósito.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>¿Se comparte información con terceros?</h2>
      <p>No. La información no se vende, renta ni comparte con ningún tercero.</p>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>Contacto</h2>
      <p>
        Para cualquier duda sobre esta política, puedes contactar al desarrollador
        de esta aplicación directamente.
      </p>
      </div>
    </div>
  );
}
