// Logotipo completo ("Udex"), recortado del archivo original (docs/udex.svg) a su caja justa. El azul
// es el color de marca (fijo, igual en claro y oscuro); el negro/blanco se invierte con el tema para que
// se siga leyendo sobre un fondo oscuro. La tipografía la hereda de la página (Montserrat en toda la
// app, ver layout.tsx); acá solo se fija el peso de cada palabra porque "U" es Regular y "de" es
// SemiBold en el original.
const INK = "fill-[#020306] dark:fill-[#f2f2f0]";

export function Wordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="130 430 970 400" className={className} role="img" aria-label="Udex" xmlns="http://www.w3.org/2000/svg">
      <text className={INK} fontWeight={600} fontSize={367.65} letterSpacing="-0.08em" transform="translate(404.92 719.51)">de</text>
      <path fill="#017cfa" d="M883.52,723.19l-47.54-.36,45.08-51.17,79.87-91.39,28.85-32.73c5.9-7.22,13.43-16.17,23.67-16.26l53.47-.47-144.38,166.16-9.07,10.78c-7.72,9.16-17.34,15.53-29.94,15.44Z" />
      <path className={INK} d="M1010.34,723.19c-9.26.04-15.81-4.13-21.12-10.36l-33.72-39.61,36.3-41.67,75,87.89c.15,1.14.12,1.99-.03,2.4s-1.03,1.13-2,1.13l-54.44.22Z" />
      <path className={INK} d="M900.54,530.81c9.26-.04,15.81,4.13,21.12,10.36l33.72,39.61-36.3,41.67-75-87.89c-.15-1.14-.12-1.99.03-2.4s1.03-1.13,2-1.13l54.44-.22Z" />
      <text className={INK} fontWeight={400} fontSize={367.65} letterSpacing="-0.08em" transform="translate(154.3 719.51)">U</text>
    </svg>
  );
}

// Solo la marca (la "x" de dos colores), para espacios chicos: favicon, avatar de la app, etc. El
// favicon es un archivo estático (no responde al tema), así que ahí se usa con fondo blanco fijo — ver
// src/app/icon.svg. Acá, para usarla sobre un fondo que sí puede cambiar, también es dark-aware.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="799 509 320 320" className={className} role="img" aria-label="Udex" xmlns="http://www.w3.org/2000/svg">
      <path fill="#017cfa" d="M883.52,723.19l-47.54-.36,45.08-51.17,79.87-91.39,28.85-32.73c5.9-7.22,13.43-16.17,23.67-16.26l53.47-.47-144.38,166.16-9.07,10.78c-7.72,9.16-17.34,15.53-29.94,15.44Z" />
      <path className={INK} d="M1010.34,723.19c-9.26.04-15.81-4.13-21.12-10.36l-33.72-39.61,36.3-41.67,75,87.89c.15,1.14.12,1.99-.03,2.4s-1.03,1.13-2,1.13l-54.44.22Z" />
      <path className={INK} d="M900.54,530.81c9.26-.04,15.81,4.13,21.12,10.36l33.72,39.61-36.3,41.67-75-87.89c-.15-1.14-.12-1.99.03-2.4s1.03-1.13,2-1.13l54.44-.22Z" />
    </svg>
  );
}
