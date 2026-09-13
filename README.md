# Brada — Tareas

Gestor de proyectos y tareas personalizado (estilo Asana), con vista Gantt (día/semana/mes/año), Lista, Kanban y Calendario. Protegido con contraseña, con la identidad visual de Brada (negro/blanco + acento azul, tipografía Inter).

## 1. Instalación local

Necesitas [Node.js](https://nodejs.org) 18 o superior instalado.

```bash
cd brada-tasks
npm install
```

Copia el archivo de variables de entorno:

```bash
cp .env.example .env
```

Y edita `.env` con:
- `APP_PASSWORD`: la contraseña con la que vas a entrar a la app.
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

## 3. Correr en local

```bash
npm run dev
```

Abre http://localhost:3000, te pedirá la contraseña que definiste en `APP_PASSWORD`.

## 4. Desplegar en Vercel (para verla desde tu celular sin usar Claude)

1. Sube esta carpeta a un repositorio de GitHub (puede ser privado).
2. Entra a https://vercel.com, crea una cuenta gratis y elige "Import Project" desde ese repositorio.
3. En "Environment Variables" agrega las mismas 3 variables de tu `.env` (`APP_PASSWORD`, `APP_SECRET`, `DATABASE_URL`).
4. Dale a "Deploy". En un par de minutos tendrás una URL pública como `tu-proyecto.vercel.app`.
5. Ábrela desde tu celular: te pedirá la contraseña y ya funciona como cualquier página web, sin pasar por Claude. Puedes "Agregar a pantalla de inicio" desde el navegador del celular para que se sienta como una app.

Nota: la primera vez que despliegues, corre `npx prisma db push` una vez apuntando a la misma `DATABASE_URL` de producción, para crear las tablas ahí también.

## Estructura

- `src/app` — páginas y rutas de API (Next.js App Router)
- `src/components` — vistas (Gantt, Lista, Kanban, Calendario) y modales de proyecto/tarea
- `src/lib` — autenticación, conexión a base de datos, utilidades de fecha
- `prisma/schema.prisma` — modelo de datos (Proyecto y Tarea)

## Personalización visual

Los colores y la tipografía están centralizados en `tailwind.config.js` (colores: `ink`, `paper`, `accent`, `muted`, `line`) y en `src/app/layout.tsx` (tipografía Inter). Puedes ajustar el color de acento (`accent`, actualmente `#1E4FFF`) ahí mismo.
