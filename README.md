# Yorked Studio — Tareas

Gestor de proyectos y tareas personalizado (estilo Asana), con vista Gantt (día/semana/mes/año), Lista, Kanban y Calendario. Cada persona del equipo tiene su propia cuenta (correo y contraseña) y las tareas se le pueden asignar, con la identidad visual de Yorked Studio (negro/blanco + acento azul, tipografía Inter).

## 1. Instalación local

Necesitas [Node.js](https://nodejs.org) 18 o superior instalado.

```bash
cd yorked-studio-tasks
npm install
```

Copia el archivo de variables de entorno:

```bash
cp .env.example .env
```

Y edita `.env` con:
- `APP_SECRET`: cualquier cadena larga y aleatoria (para firmar la sesión).
- `DATABASE_URL`: la conexión a tu base de datos Postgres (ver paso 2).

## 2. Base de datos (gratuita)

La app usa Postgres. La forma más simple de tener una base de datos gratuita:

**Opción recomendada: Neon** (https://neon.tech)
1. Crea una cuenta gratis.
2. Crea un proyecto nuevo.
3. Copia la "Connection string" que te dan y pégala en `DATABASE_URL` en tu `.env`.

**Alternativa: Vercel Postgres o Supabase** funcionan igual de bien, el proceso es muy similar.

Una vez tengas `DATABASE_URL` configurada, crea las tablas con:

```bash
npx prisma db push
```

## 3. Crear tu primer usuario

Como el login ahora es por correo y contraseña (ya no hay una contraseña única para todos), necesitas crear el primer usuario a mano antes de poder entrar:

```bash
SEED_NAME="Tu nombre" SEED_EMAIL="tu@correo.com" SEED_PASSWORD="algo-largo-y-seguro" npm run db:seed
```

A partir de ahí, cualquier persona ya logueada puede crear/editar/eliminar cuentas de compañeros desde el panel "Equipo" dentro de la app — no hace falta volver a correr el script.

### Si vienes de una versión anterior: responsables y comentarios

Las tareas ahora pueden tener más de un responsable, y se le pueden agregar comentarios. Después de correr `npx prisma db push` (o de desplegar, que lo corre automático), hay un paso extra que solo se necesita **una vez**, para no perder los responsables que ya tenías asignados con el sistema anterior:

```bash
npm run db:migrate-assignees
```

Es seguro correrlo más de una vez: no duplica nada. Si es una instalación nueva, puedes saltarte este paso.

## 4. Correos de "te asignaron una tarea" (opcional)

Cuando asignas una tarea a alguien, la app le manda un correo avisándole (si no configuras esto, simplemente no se envía nada, todo lo demás sigue funcionando igual).

1. Crea una cuenta gratis en [resend.com](https://resend.com).
2. Genera una API key y ponla en `.env` como `RESEND_API_KEY`.
3. Mientras no verifiques un dominio propio en Resend, solo puedes enviar correos de prueba al correo con el que te registraste ahí — para poder avisarle a cualquier persona de tu equipo, verifica un dominio en Resend (Domains → Add Domain) y pon `RESEND_FROM_EMAIL="Yorked Studio <tareas@tudominio.com>"` en `.env`.

## 5. Archivos adjuntos en tareas (opcional)

Cada tarea puede llevar archivos adjuntos (.ai, .svg, .pdf, .jpg, .png, .webp, hasta 50 MB cada uno). Se guardan con Vercel Blob:

1. Entra a [vercel.com/dashboard](https://vercel.com/dashboard) → pestaña **Storage** → **Create Database** → **Blob**.
2. Conéctalo a este proyecto (si ya lo desplegaste) o simplemente créalo — Vercel te da un token.
3. Copia el token (`BLOB_READ_WRITE_TOKEN`) y ponlo en tu `.env`. Si conectaste el Blob a un proyecto ya desplegado en Vercel, esa variable también se agrega sola ahí.

Sin esta variable, la sección de adjuntar archivos en una tarea simplemente da error al intentar subir algo — el resto de la app sigue funcionando igual.

## 6. Flujo de Branding

En el menú de arriba, **Branding** abre el proceso de marca de cada proyecto, en seis etapas, más una de naming que se activa por proyecto. Cada una tiene un objetivo y una salida, y la siguiente arranca de lo que dejó la anterior:

| Etapa | Qué se hace | Qué sale |
|---|---|---|
| 01 Brief | Brief principal, contexto, comentarios del cliente/equipo y archivos. **Analizar brief** (Claude): qué está claro y qué falta, preguntas para el cliente y un concepto inicial | Brief limpio y completo |
| 02 Concepto | Detalle de conceptualización, referencias y conceptos (a mano o generados con Claude) | 1 a 3 conceptos marcados “Elegido” |
| 03 Investigación | Bloques fijos (Negocio, Audiencia, Categoría, Tendencias), fichas de competencia, mapa de posicionamiento de dos ejes, hallazgos (Encontramos → Significa → Oportunidad), ideas en tablero y plano general | Hallazgos, mapa de posicionamiento y plano general |
| Naming (opcional) | Se activa con **+ Naming** en el proyecto. Criterios (qué debe transmitir, estilos, idioma, largo, qué evitar), sugerencias de Claude a partir del brief, conceptos, research y competencia, tablero con filtros (Explorar, Shortlist, Elegido, Descartado), revisión manual de dominio, redes e IMPI, y prueba tipográfica de la shortlist. Se numera entre Investigación y Moodboard | Shortlist y un nombre elegido |
| 04 Moodboard | Un moodboard por dirección visual: subir imágenes, pegar URLs o traerlas de la biblioteca | Dirección visual por concepto |
| 05 Desarrollo | Subir bocetos y piezas con estado (Boceto, Propuesta, Para presentar, Final) | Piezas “Para presentar” |
| 06 Presentación | Borrador automático con brief, conceptos, moodboards y piezas; se edita lámina por lámina | Presentar en pantalla completa o exportar a PDF |

El proyecto guarda en qué etapa va (punto azul) y cada etapa se marca con ✓ cuando ya tiene su salida. Todo se guarda solo.

**Biblioteca de referencias:** es compartida entre proyectos (botón “Biblioteca de referencias”). Las imágenes que llevas de ahí a un moodboard quedan ligadas a la referencia original, con su liga de origen y etiquetas.

**Generar conceptos con Claude (opcional):** agrega `ANTHROPIC_API_KEY` en `.env` (y en Vercel). Claude lee el brief, el contexto, los comentarios, tus notas de conceptualización, el research (bloques, competencia, posicionamiento buscado y hallazgos) y las referencias, y propone conceptos distintos a los que ya existen. En Naming, Claude sugiere nombres con los criterios del estudio y aprende de lo que pasas a Shortlist o descartas (no revisa disponibilidad: dominio, redes e IMPI se revisan a mano). Sin la variable, todo lo demás funciona igual.

**Conectar tu dashboard de referencias (opcional):** si tu dashboard puede exponer una URL que devuelva JSON, ponla en `REFERENCES_FEED_URL` (y `REFERENCES_FEED_TOKEN` si pide autenticación, se manda como `Authorization: Bearer`). Aparecerá una pestaña “Mi dashboard” en la biblioteca; al elegir una referencia de ahí se guarda en la biblioteca y queda ligada al moodboard. Formato aceptado:

```json
[
  { "id": "123", "title": "Packaging japonés", "imageUrl": "https://…/img.jpg", "sourceUrl": "https://…", "tags": ["packaging", "minimal"] }
]
```

También acepta `{ "items": [...] }`, y los nombres `image`/`url` para la imagen y `link` para el origen.

## 6b. Clientes: prospectos y cotizaciones

En el menú, **Clientes** es el embudo comercial: *Nuevo → Cotizado → En negociación → Ganado / Perdido* (las tarjetas se arrastran entre columnas).

**Calendarizar un proyecto ganado:** al pasar un prospecto a *Ganado* (o cuando el cliente aprueba la propuesta), su panel muestra *Calendario del proyecto*: las fases de la opción aprobada se vuelven tareas sin asignar, una tras otra de lunes a viernes y sin días festivos de México (los de la Ley Federal del Trabajo más Jueves y Viernes Santo; si cae uno en medio, la fase se alarga un día), con la duración de cada fase (se puede ajustar en semanas, quitar fases y elegir la fecha de arranque). Se crean en un proyecto nuevo con el nombre de la marca o en uno existente, con la descripción y los entregables de la fase como lista de pendientes en las notas.

1. **+ Prospecto:** nombre de la marca y, en su ficha, contacto, giro, presupuesto y lo que necesita.
2. **+ Nueva cotización:** parte de la plantilla de las propuestas del estudio (4 fases, notas legales, 50/50). Con **Sugerir**, Claude propone alcance, aplicaciones, tiempos y precio a partir de lo que necesita el prospecto y del tabulador (requiere `ANTHROPIC_API_KEY`). Todo se edita con vista previa en vivo.
3. **Lista para enviar · copiar liga:** la propuesta queda en `/p/<código>`, una liga privada (no aparece en Google) que se le manda al cliente. Se ve cuántas veces la abrió y cuándo.
4. El cliente **aprueba desde la liga** (elige la opción si hay varias). Entonces la propuesta muestra el monto del anticipo y los **datos para transferencia**, y el prospecto pasa a *Ganado*.

**Portal del cliente:** con un proyecto elegido arriba, *Portal del cliente* (o desde el prospecto ganado) crea una liga privada `/c/<token>` para mandarle al cliente. Ahí ve el avance en % (ponderado por duración: fases terminadas cuentan completas y las que están en curso avanzan con los días hábiles, sin pasar de 85% hasta que se marcan terminadas), cada fase con su estado y fechas, la entrega estimada y sus pagos (pagado / pendiente, con los datos de transferencia y un botón de WhatsApp para mandar comprobante). No ve tareas internas, notas ni quién está asignado. El anticipo y el finiquito se crean solos desde la propuesta aprobada (finiquito al terminar la última fase); en el panel se marcan como pagados, se editan o se agregan pagos extra. **Ajuste manual (opcional):** en *Avance que ve el cliente* se puede escribir un porcentaje y/o una fecha estimada de entrega a mano; si se llenan, el portal muestra esos valores en lugar de los calculados (las fases siguen siendo automáticas), y *Volver al automático* los borra. Si se dejan vacíos, todo se calcula como antes. La liga se puede cambiar o desactivar. **Logotipo del cliente (opcional):** en el panel, el recuadro junto al nombre sube el logo (SVG, PNG, JPG, WebP o GIF; clic para cambiarlo, × para quitarlo) y en su portal es la imagen principal: grande y a la izquierda, con el nombre del proyecto pequeño debajo (sin logo, el nombre se ve grande como siempre). Conviene SVG o PNG con fondo transparente. La casilla *Mostrar el nombre en el portal* (bajo el nombre del panel, activa con logo) quita o pone el nombre del cliente debajo del logo. **Retainer y secciones visibles:** en *Tipo de portal* se elige Proyecto o Retainer (clientes de contenido continuo). Retainer oculta avance, fases y pagos, y muestra las entregas como **Lo nuevo** (lo más reciente arriba, agrupado por mes, con etiqueta “Nueva” la primera semana, miniatura si es imagen y contador de entregas del mes). Cada sección (avance, fases, reuniones, entregas, cotizaciones, pagos, facturas, marca) se puede mostrar u ocultar por cliente, y *Avisar al cliente por WhatsApp* abre el mensaje con la liga. **Saldo a favor (opcional):** para clientes que dejan saldo para proyectos futuros, el panel tiene un apartado con monto, nota y casilla para mostrarlo o no en el portal; es solo un registro y no cambia el precio ni los pagos. En el panel también se define el **precio completo** (sin IVA, interno): si cambia, se reparte entre los pagos pendientes y no cambia por el IVA. Cada pago tiene su botón **+ IVA (16%)**; el cliente ve ese pago con IVA incluido, sin desglose, igual que en su recibo.

La propuesta, el portal y el recibo usan el estilo "laboratorio" (blanco y gris claro, secciones negras, esquinas rectas, títulos moderados y botones en el color de acento del proyecto, con texto blanco o negro según el color); `?estilo=editorial` en la liga muestra el diseño anterior. El portal acompaña todo el proceso: arriba, accesos a su **propuesta**, la **próxima reunión** (botón para unirse) y los **descargables de su marca**; después fases, **reuniones** (links de Meet/Zoom con fecha y hora), **entregas** (PDF subido o link, con su fase y marca de "Nueva" la primera semana), pagos, facturación y **Tu marca** (archivos finales o link a la carpeta). Todo se agrega y se edita desde el panel del portal (entregas, reuniones y descargables tienen Editar: título, nota, fase, fecha, link o archivo nuevo que reemplaza al anterior). Para proyectos que no pasaron por cotización (o que ya iban avanzados), el panel tiene **Crear fases** con la plantilla del estudio (fecha de arranque, semanas y estado de cada fase) y **Marcar todo como terminado**; los pagos se agregan a mano con *+ Pago*.

**Aprobar la propuesta y comprobante:** al aprobar, la misma página muestra los datos de transferencia con el monto del anticipo y el botón **Subir comprobante de pago** (PDF, JPG, PNG o WebP, máx. 10 MB; WhatsApp queda como opción secundaria). El comprobante aparece en la ficha del prospecto, en su tarjeta (“Comprobante recibido”) y en el panel del portal; el pago se marca como pagado a mano al verlo en el banco.

**Cotizaciones y opciones de proveedores (diseño del estudio):** en el panel del portal hay dos formatos. *Cotización*: resumen, especificaciones por sección, desglose con subtotal, IVA y total, pago y condiciones (anticipo y contra entrega calculados, tiempo de entrega, forma de pago y datos de transferencia). *Opciones de productos*: catálogo por categorías con tarjetas (tienda, "Opción 01", imagen, nombre, precio y botón "Ver producto"). Se capturan a mano o se pega el texto / sube la foto o PDF y Claude los acomoda en el formato elegido. Para cada documento se elige qué ve el cliente: el *diseño del portal* o *Mi archivo tal cual* (el PDF o la imagen JPG, PNG o WebP que subió el estudio, idéntico, con vista previa y descarga; los PDF en celular se abren en otra pestaña). El cliente los abre en `/c/<token>/documento/<id>` con el mismo diseño y los descarga en PDF (A4, 2 páginas la cotización); la cotización se puede aprobar.

En el portal, el cliente ve siempre los datos de transferencia, descarga un **recibo** (PDF, con monto con letra y folio) de cada pago marcado como pagado y, si requiere factura, sube su **constancia de situación fiscal** (PDF/JPG/PNG, máx. 10 MB). En el panel del estudio se ve la constancia y se suben las **facturas** (PDF y XML) para que el cliente las descargue.

**Respaldo:** en *Equipo → Descargar respaldo* se baja un JSON con todos los datos (proyectos, tareas, branding, clientes, cotizaciones, pagos y datos del estudio), sin contraseñas ni la conexión con Google. Las fotos y archivos siguen en Vercel Blob; el respaldo trae sus ligas. Guárdalo en un lugar privado: incluye datos bancarios y de clientes.

**Datos del estudio** (botón en Clientes): contacto, cuenta para el anticipo (se muestra solo después de que el cliente aprueba), trabajos relacionados y el tabulador que usa Claude. Se guardan en la base de datos, no en el código.

**Trabajos relacionados con fotos:** en Datos del estudio cada trabajo es una tarjeta con hasta 3 renders o fotos, que en la propuesta se ven en carrusel con la primera como portada (se reducen a 2000 px en WebP al subir y van a Vercel Blob), nombre, tipo, ciudad, año, color de respaldo y liga opcional al proyecto. En el editor de cada cotización se eligen los que se muestran a ese cliente; si no eliges ninguno, se muestran todos.

## 7. Correr en local

```bash
npm run dev
```

Abre http://localhost:3000 y entra con el correo y contraseña que acabas de crear.

## 8. Desplegar en Vercel (para verla desde tu celular sin usar Claude)

1. Sube esta carpeta a un repositorio de GitHub (puede ser privado).
2. Entra a https://vercel.com, crea una cuenta gratis y elige "Import Project" desde ese repositorio.
3. En "Environment Variables" agrega las variables de tu `.env` (`APP_SECRET`, `DATABASE_URL`, y si las usas, `RESEND_API_KEY`/`RESEND_FROM_EMAIL`/`BLOB_READ_WRITE_TOKEN`/`ANTHROPIC_API_KEY`/`REFERENCES_FEED_URL`).
4. Dale a "Deploy". En un par de minutos tendrás una URL pública como `tu-proyecto.vercel.app`.
5. Ábrela desde tu celular: te pedirá tu correo y contraseña y ya funciona como cualquier página web, sin pasar por Claude. Puedes "Agregar a pantalla de inicio" desde el navegador del celular para que se sienta como una app.

Nota: el script `build` corre `prisma db push` automáticamente antes de compilar, así que Vercel sincroniza el schema con la base de producción en cada deploy. Lo único que tienes que correr a mano una vez, apuntando a esa misma `DATABASE_URL` de producción, es `npm run db:seed` (con las variables `SEED_*`) para tener con qué entrar.

## Estructura

- `src/app` — páginas y rutas de API (Next.js App Router)
- `src/components` — vistas (Gantt, Lista, Kanban, Calendario), panel de equipo y modales de proyecto/tarea/usuario
- `src/components/branding` — flujo de Branding (etapas, biblioteca de referencias, editor y visor de presentaciones)
- `src/lib` — autenticación, sesión, conexión a base de datos, utilidades de fecha
- `prisma/schema.prisma` — modelo de datos (Usuario, Proyecto, Tarea y las tablas de Branding)

## Personalización visual

El estilo sigue un sistema monocromo con tarjetas de vidrio (fondo gris claro con textura de grano, tarjetas con 5% de negro y desenfoque de 10px, radios de 32px y tipografía Open Sauce Sans con tracking de -0.02em).

- Colores y modo oscuro: variables en `src/app/globals.css` (`--color-ink`, `--color-paper`, `--color-accent`, etc.), usadas desde `tailwind.config.js`.
- Vidrio y campos: utilidades `.glass`, `.glass-hover`, `.glass-overlay` y `.field` en `src/app/globals.css`.
- Escala tipográfica y radios: `tailwind.config.js`.
