// Isotipo de Wonder Boy (cuatro rombos en cruz). Toma el color del texto que
// lo rodea (currentColor), así se ve bien sobre fondos claros y oscuros.
export default function Isotipo({ className = "h-[18px] w-auto" }: { className?: string }) {
  return (
    <svg viewBox="205.29 256.29 589.42 487.42" fill="currentColor" className={className} role="img" aria-label="Wonder Boy" xmlns="http://www.w3.org/2000/svg">
      <path d="M632.23 418.76 734.23 256.29H571.76L469.77 418.76Z" />
      <path d="M265.77 743.71H428.24L530.24 581.23H367.77Z" />
      <path d="M692.71 581.23 794.71 418.76H632.23L530.24 581.23Z" />
      <path d="M307.29 418.76 205.29 581.23H367.77L469.77 418.76Z" />
    </svg>
  );
}
