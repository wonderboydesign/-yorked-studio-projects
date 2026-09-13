import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const doto = localFont({
  src: [{ path: "./fonts/doto-800.ttf", weight: "800", style: "normal" }],
  variable: "--font-doto",
});
const btsMono = localFont({
  src: "./fonts/bts-mono.otf",
  variable: "--font-bts-mono",
});

export const metadata: Metadata = {
  title: "Brada Task Manager",
  description: "Gestión interna de proyectos y tareas",
  icons: {
    icon: "/apple-touch-icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${doto.variable} ${btsMono.variable} font-mono bg-paper text-ink antialiased`}>
        {children}
      </body>
    </html>
  );
}
