"use client";

import { BrandData, BrandItem, BrandSlide, isImage } from "@/lib/branding";
import { Project } from "@/lib/types";

// Una lámina 16:9. Los tamaños usan unidades de contenedor (cqw) para que la
// misma lámina se vea igual en miniatura, en el editor, al presentar y en PDF.
// Los colores son fijos (no siguen el modo oscuro): es material para cliente.
export default function SlideView({
  slide,
  data,
  project,
  className = "",
}: {
  slide: BrandSlide;
  data: BrandData;
  project: Project;
  className?: string;
}) {
  const items = (slide.itemIds ?? [])
    .map((id) => data.items.find((i) => i.id === id))
    .filter((i): i is BrandItem => !!i);

  return (
    <div
      className={`relative w-full aspect-video overflow-hidden bg-white text-[#1d1d1f] [container-type:inline-size] select-none ${className}`}
    >
      <div className="absolute inset-0 p-[5cqw] flex flex-col">
        <SlideContent slide={slide} items={items} data={data} project={project} />
      </div>
      {slide.type !== "cover" && (
        <span className="absolute left-[5cqw] bottom-[2.4cqw] text-[0.9cqw] tracking-[0.2em] uppercase text-[#86868b]">
          {project.name}
          {project.client ? ` · ${project.client}` : ""}
        </span>
      )}
    </div>
  );
}

function SlideContent({
  slide,
  items,
  data,
  project,
}: {
  slide: BrandSlide;
  items: BrandItem[];
  data: BrandData;
  project: Project;
}) {
  switch (slide.type) {
    case "cover":
      return (
        <>
          <div className="flex justify-between text-[1.1cqw] tracking-[0.2em] uppercase text-[#86868b]">
            <span>{slide.body || project.client || ""}</span>
            <span>Yorked Studio</span>
          </div>
          <h1 className="mt-auto text-[7cqw] leading-[0.95] tracking-[-0.03em] font-medium max-w-[80%]">
            {slide.title || project.name}
          </h1>
          <p className="mt-[2cqw] text-[1.1cqw] tracking-[0.2em] uppercase text-[#86868b]">
            {new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
          </p>
        </>
      );

    case "section":
      return (
        <div className="m-auto text-center max-w-[75%]">
          <h2 className="text-[5.5cqw] leading-none tracking-[-0.02em] font-medium">{slide.title}</h2>
          {slide.body && <p className="mt-[2cqw] text-[1.6cqw] text-[#6e6e73] whitespace-pre-wrap">{slide.body}</p>}
        </div>
      );

    case "text":
      return (
        <div className="grid grid-cols-[2fr_3fr] gap-[5cqw] h-full pb-[3cqw]">
          <h2 className="text-[3.6cqw] leading-[1.05] tracking-[-0.02em] font-medium">{slide.title}</h2>
          <p className="text-[1.45cqw] leading-[1.55] whitespace-pre-wrap overflow-hidden">{slide.body}</p>
        </div>
      );

    case "concept": {
      const concept = items[0];
      const body = slide.body || concept?.body || "";
      const [lead, ...rest] = body.split(/\n\s*\n/);
      return (
        <div className="grid grid-cols-[2fr_3fr] gap-[5cqw] h-full pb-[3cqw]">
          <div className="flex flex-col">
            <span className="text-[1cqw] tracking-[0.2em] uppercase text-[#0071e3]">Concepto</span>
            <h2 className="mt-[1.5cqw] text-[4.4cqw] leading-[1] tracking-[-0.02em] font-medium">
              {slide.title || concept?.title}
            </h2>
            <p className="mt-auto text-[1.8cqw] leading-[1.3]">{lead}</p>
          </div>
          <div className="text-[1.25cqw] leading-[1.55] whitespace-pre-wrap overflow-hidden text-[#424245] space-y-[1.2cqw] pt-[3.5cqw]">
            {rest.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      );
    }

    case "moodboard": {
      const board = data.moodboards.find((b) => b.id === slide.boardId);
      const images = data.items
        .filter((i) => i.boardId === slide.boardId && i.url)
        .slice(0, 12);
      return (
        <div className="grid grid-cols-[1fr_3fr] gap-[3cqw] h-full pb-[3cqw] min-h-0">
          <div className="flex flex-col">
            <span className="text-[1cqw] tracking-[0.2em] uppercase text-[#0071e3]">Moodboard</span>
            <h2 className="mt-[1.5cqw] text-[3.2cqw] leading-[1.05] tracking-[-0.02em] font-medium">
              {slide.title || board?.name}
            </h2>
            <p className="mt-auto text-[1.15cqw] leading-[1.5] text-[#424245] whitespace-pre-wrap overflow-hidden">
              {slide.body || board?.notes}
            </p>
          </div>
          <div className="grid grid-cols-4 grid-rows-3 gap-[0.6cqw] min-h-0">
            {images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url!}
                alt=""
                className={`w-full h-full object-cover min-h-0 ${i === 0 ? "col-span-2 row-span-2" : ""}`}
              />
            ))}
          </div>
        </div>
      );
    }

    case "image": {
      const shown = items.filter((i) => i.url);
      const grid = shown.length <= 1 ? "grid-cols-1" : shown.length === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2";
      return (
        <div className="flex flex-col h-full pb-[3cqw] min-h-0">
          {(slide.title || slide.body) && (
            <div className="flex items-baseline justify-between gap-[3cqw] mb-[2cqw]">
              <h2 className="text-[2.4cqw] leading-none tracking-[-0.01em] font-medium">{slide.title}</h2>
              {slide.body && <p className="text-[1.1cqw] text-[#6e6e73] max-w-[50%] text-right">{slide.body}</p>}
            </div>
          )}
          <div className={`grid ${grid} gap-[1cqw] flex-1 min-h-0`}>
            {shown.map((img) =>
              isImage(img.contentType, img.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={img.id} src={img.url!} alt={img.title ?? ""} className="w-full h-full object-contain min-h-0 bg-[#f5f5f7]" />
              ) : (
                <div key={img.id} className="flex items-center justify-center bg-[#f5f5f7] text-[1.2cqw] text-[#86868b]">
                  {img.title} (archivo)
                </div>
              )
            )}
            {shown.length === 0 && (
              <div className="flex items-center justify-center bg-[#f5f5f7] text-[1.2cqw] text-[#86868b]">
                Elige piezas para esta lámina
              </div>
            )}
          </div>
        </div>
      );
    }
  }
}
