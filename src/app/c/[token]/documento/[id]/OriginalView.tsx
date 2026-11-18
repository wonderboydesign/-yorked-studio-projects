import { downloadUrl } from "@/lib/supplierQuotes";

// El archivo que subió el estudio, tal cual: en computadora se ve dentro de la
// página; en celular, donde los PDF incrustados se ven mal, un botón lo abre
export default function OriginalView({ url, contentType, title }: { url: string; contentType?: string; title: string }) {
  const isImage = /\.(png|jpe?g|webp)(\?|$)/i.test(url) || contentType?.startsWith("image/");
  return (
    <div className="space-y-4">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={title} className="mx-auto max-w-full bg-white" />
      ) : (
        <>
          <iframe src={`${url}#view=FitH`} title={title} className="hidden h-[85vh] w-full bg-white md:block" />
          <div className="doc-gray p-6 text-center md:hidden">
            <p className="text-[15px]">Abre el documento para verlo completo.</p>
            <a href={url} target="_blank" rel="noreferrer" className="doc-btn mt-4">
              Abrir PDF <span aria-hidden>↗</span>
            </a>
          </div>
        </>
      )}
      <p className="text-center text-[12px] opacity-60">
        ¿No se ve bien?{" "}
        <a href={url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          Ábrelo en otra pestaña
        </a>{" "}
        o{" "}
        <a href={downloadUrl(url)} className="underline underline-offset-4">
          descárgalo
        </a>
        .
      </p>
    </div>
  );
}
