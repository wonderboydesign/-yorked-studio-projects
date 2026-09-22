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

## 6. Correr en local

```bash
npm run dev
```

Abre http://localhost:3000 y entra con el correo y contraseña que acabas de crear.

## 7. Desplegar en Vercel (para verla desde tu celular sin usar Claude)

1. Sube esta carpeta a un repositorio de GitHub (puede ser privado).
2. Entra a https://vercel.com, crea una cuenta gratis y elige "Import Project" desde ese repositorio.
3. En "Environment Variables" agrega las variables de tu `.env` (`APP_SECRET`, `DATABASE_URL`, y si las usas, `RESEND_API_KEY`/`RESEND_FROM_EMAIL`/`BLOB_READ_WRITE_TOKEN`).
4. Dale a "Deploy". En un par de minutos tendrás una URL pública como `tu-proyecto.vercel.app`.
5. Ábrela desde tu celular: te pedirá tu correo y contraseña y ya funciona como cualquier página web, sin pasar por Claude. Puedes "Agregar a pantalla de inicio" desde el navegador del celular para que se sienta como una app.

Nota: el script `build` corre `prisma db push` automáticamente antes de compilar, así que Vercel sincroniza el schema con la base de producción en cada deploy. Lo único que tienes que correr a mano una vez, apuntando a esa misma `DATABASE_URL` de producción, es `npm run db:seed` (con las variables `SEED_*`) para tener con qué entrar.

## Estructura

- `src/app` — páginas y rutas de API (Next.js App Router)
- `src/components` — vistas (Gantt, Lista, Kanban, Calendario), panel de equipo y modales de proyecto/tarea/usuario
- `src/lib` — autenticación, sesión, conexión a base de datos, utilidades de fecha
- `prisma/schema.prisma` — modelo de datos (Usuario, Proyecto y Tarea)

## Personalización visual

Los colores y la tipografía están centralizados en `tailwind.config.js` (colores: `ink`, `paper`, `accent`, `muted`, `line`) y en `src/app/layout.tsx` (tipografía Inter). Puedes ajustar el color de acento (`accent`, actualmente `#1E4FFF`) ahí mismo.
