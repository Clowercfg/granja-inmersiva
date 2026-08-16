import { memo, useEffect, useRef } from "react";

/**
 * Fondo inmersivo de la pantalla de acceso.
 * ---------------------------------------
 * - Paisaje agrícola procedural (SVG): atardecer dorado, colinas, campo
 *   arado con surcos, granero de silueta, pájaros y sol con halo.
 * - Capa de partículas de polen (canvas) que flota suavemente.
 * - Respeta prefers-reduced-motion.
 */

const REDUCED = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Partículas de polen dorado sobre un canvas transparente. */
function PollenLayer({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    interface P {
      x: number;
      y: number;
      r: number;
      speed: number;
      sway: number;
      phase: number;
      alpha: number;
    }
    let parts: P[] = [];

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * DPR);
      canvas.height = Math.round(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const count = Math.min(70, Math.round((w * h) / 26000));
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1 + Math.random() * 2.2,
        speed: 0.12 + Math.random() * 0.3,
        sway: 0.4 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.25 + Math.random() * 0.45,
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y -= p.speed;
        p.x += Math.sin(t * 0.0006 + p.phase) * p.sway;
        if (p.y < -6) {
          p.y = h + 6;
          p.x = Math.random() * w;
        }
        if (p.x < -6) p.x = w + 6;
        if (p.x > w + 6) p.x = -6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 80, ${p.alpha})`;
        ctx.fill();
      }
      if (active && !REDUCED) raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    if (active && !REDUCED) raf = requestAnimationFrame(draw);
    else if (!active) ctx.clearRect(0, 0, w, h);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  return <canvas ref={canvasRef} className="auth-pollen" aria-hidden="true" />;
}

/** Paisaje SVG estático (con leve animación de nubes y pájaros). */
function LandscapeSvg() {
  return (
    <svg
      className="auth-landscape"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="authSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#122c1e" />
          <stop offset="38%" stopColor="#2c5a38" />
          <stop offset="62%" stopColor="#c98b3d" />
          <stop offset="100%" stopColor="#f2c877" />
        </linearGradient>
        <radialGradient id="authSun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffedb0" />
          <stop offset="45%" stopColor="#f6cf6f" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#f6cf6f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="authHillA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2d4a2f" />
          <stop offset="100%" stopColor="#1c3323" />
        </linearGradient>
        <linearGradient id="authHillB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#24402a" />
          <stop offset="100%" stopColor="#142a1c" />
        </linearGradient>
        <linearGradient id="authField" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3f5a2c" />
          <stop offset="55%" stopColor="#2c4422" />
          <stop offset="100%" stopColor="#182f1a" />
        </linearGradient>
        <filter id="authBlur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
        <filter id="authBlurSm" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* Cielo */}
      <rect width="1440" height="900" fill="url(#authSky)" />

      {/* Sol con halo */}
      <g className="auth-sun">
        <circle cx="1050" cy="430" r="230" fill="url(#authSun)" />
        <circle cx="1050" cy="430" r="82" fill="#ffe9a8" />
      </g>

      {/* Nubes */}
      <g className="auth-cloud auth-cloud-1" filter="url(#authBlurSm)">
        <ellipse cx="260" cy="250" rx="170" ry="34" fill="#f7d9a0" opacity="0.35" />
        <ellipse cx="340" cy="232" rx="120" ry="26" fill="#f7d9a0" opacity="0.28" />
      </g>
      <g className="auth-cloud auth-cloud-2" filter="url(#authBlurSm)">
        <ellipse cx="820" cy="200" rx="140" ry="28" fill="#f7d9a0" opacity="0.22" />
        <ellipse cx="910" cy="186" rx="100" ry="22" fill="#f7d9a0" opacity="0.18" />
      </g>

      {/* Colinas lejanas */}
      <path d="M0 520 Q240 420 520 505 T1040 500 T1440 510 L1440 900 L0 900 Z" fill="url(#authHillA)" opacity="0.55" filter="url(#authBlur)" />
      <path d="M0 600 Q360 500 760 585 T1440 575 L1440 900 L0 900 Z" fill="url(#authHillB)" opacity="0.85" filter="url(#authBlur)" />

      {/* Campo de cultivo con surcos convergentes */}
      <path d="M0 640 Q720 600 1440 645 L1440 900 L0 900 Z" fill="url(#authField)" />
      <g className="auth-furrows" stroke="#243a1e" strokeWidth="5" strokeLinecap="round" opacity="0.5">
        <path d="M720 655 L-140 900" />
        <path d="M720 660 L60 900" />
        <path d="M720 662 L300 900" />
        <path d="M720 662 L520 900" />
        <path d="M720 662 L720 900" />
        <path d="M720 662 L920 900" />
        <path d="M720 662 L1140 900" />
        <path d="M720 660 L1380 900" />
        <path d="M720 655 L1560 900" />
      </g>

      {/* Granero de silueta + árboles */}
      <g className="auth-barn" fill="#142a1c">
        <path d="M1210 560 L1320 560 L1275 508 Z" />
        <rect x="1216" y="560" width="98" height="118" />
        <rect x="1252" y="608" width="26" height="70" fill="#0d1f13" />
        <rect x="1232" y="576" width="66" height="34" fill="#0d1f13" />
      </g>
      <g fill="#14301f">
        <circle cx="1130" cy="588" r="34" />
        <rect x="1122" y="588" width="16" height="46" />
        <circle cx="1380" cy="600" r="26" />
        <rect x="1374" y="600" width="12" height="34" />
      </g>

      {/* Cerca de postes */}
      <g className="auth-fence" stroke="#182f1c" strokeWidth="4" opacity="0.75">
        <line x1="0" y1="690" x2="0" y2="640" />
        <line x1="40" y1="690" x2="40" y2="640" />
        <line x1="80" y1="690" x2="80" y2="640" />
        <line x1="120" y1="690" x2="120" y2="640" />
        <line x1="0" y1="655" x2="120" y2="655" />
        <line x1="0" y1="672" x2="120" y2="672" />
      </g>

      {/* Pájaros en vuelo */}
      <g className="auth-birds" stroke="#1c2a1f" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M240 320 q12 -10 24 0" />
        <path d="M272 330 q10 -8 20 0" />
        <path d="M214 342 q9 -8 18 0" />
      </g>

      {/* Viñeta para legibilidad */}
      <rect width="1440" height="900" fill="url(#authSky)" opacity="0" />
    </svg>
  );
}

export const FarmBackdrop = memo(function FarmBackdrop({ particles }: { particles: boolean }) {
  return (
    <div className="auth-backdrop" aria-hidden="true">
      <LandscapeSvg />
      <PollenLayer active={particles} />
      <div className="auth-overlay" />
    </div>
  );
});
