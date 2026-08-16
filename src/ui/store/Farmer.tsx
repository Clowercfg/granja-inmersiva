/**
 * Granjero de bienvenida de la tienda. Personaje ORIGINAL creado con SVG en
 * línea (sin assets externos): sombrero de paja, barba, camisa, overol y una
 * mano levantada saludando. Animación suave de bienvenida.
 */
export function Farmer() {
  return (
    <div className="farmer" aria-hidden="true">
      <svg viewBox="0 0 220 340" className="farmer-svg">
        <defs>
          <linearGradient id="hat-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f2d489" />
            <stop offset="1" stopColor="#d9a94a" />
          </linearGradient>
          <linearGradient id="overall-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4d7cb0" />
            <stop offset="1" stopColor="#335e8c" />
          </linearGradient>
          <linearGradient id="skin-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f2c79b" />
            <stop offset="1" stopColor="#dfa06a" />
          </linearGradient>
          <linearGradient id="shirt-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f0c06a" />
            <stop offset="1" stopColor="#d99a3d" />
          </linearGradient>
        </defs>

        {/* Pies / botas */}
        <ellipse cx="86" cy="326" rx="24" ry="11" fill="#6b4a2b" />
        <ellipse cx="134" cy="326" rx="24" ry="11" fill="#6b4a2b" />

        {/* Pantalones del overol */}
        <path d="M78 222 L64 328 Q98 336 108 328 L100 258 L122 258 L116 328 Q126 334 156 328 L142 222 Z" fill="url(#overall-g)" />
        <rect x="74" y="258" width="72" height="14" rx="4" fill="#284f78" />
        {/* Bolsillo frontal */}
        <path d="M104 268 L116 278 L104 288 L92 278 Z" fill="#3a6f9f" stroke="#284f78" strokeWidth="2" />

        {/* Camisa (torso) */}
        <path d="M72 150 Q68 190 76 218 L144 218 Q152 190 148 150 Z" fill="url(#shirt-g)" />
        {/* Tirantes */}
        <path d="M78 154 L84 220" stroke="#8a5a1f" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M142 154 L136 220" stroke="#8a5a1f" strokeWidth="7" fill="none" strokeLinecap="round" />

        {/* Brazo izquierdo (saludando) */}
        <g className="farmer-arm">
          <path d="M78 168 Q48 152 42 126 Q40 116 48 112 Q56 108 60 118 Q66 142 84 154" fill="url(#shirt-g)" stroke="#d99a3d" strokeWidth="2" />
          <circle cx="46" cy="108" r="13" fill="url(#skin-g)" />
        </g>

        {/* Brazo derecho (relajado) */}
        <path d="M142 168 Q176 180 180 206 Q182 216 172 218 Q164 220 160 210 Q154 188 136 182" fill="url(#shirt-g)" stroke="#d99a3d" strokeWidth="2" />
        <circle cx="178" cy="222" r="12" fill="url(#skin-g)" />

        {/* Cuello */}
        <rect x="98" y="138" width="24" height="18" rx="8" fill="url(#skin-g)" />

        {/* Cabeza */}
        <circle cx="110" cy="112" r="42" fill="url(#skin-g)" />

        {/* Orejas */}
        <circle cx="70" cy="112" r="9" fill="#dfa06a" />
        <circle cx="150" cy="112" r="9" fill="#dfa06a" />

        {/* Barba y bigote */}
        <path d="M70 124 Q66 168 110 170 Q154 168 150 124 Q142 144 110 146 Q78 144 70 124 Z" fill="#caa05a" />
        <path d="M88 128 Q98 138 110 128 Q122 138 132 128 Q136 136 122 148 Q98 148 84 136 Z" fill="#b98f4a" />

        {/* Mejillas */}
        <circle cx="84" cy="132" r="9" fill="#ef9d6d" opacity="0.55" />
        <circle cx="136" cy="132" r="9" fill="#ef9d6d" opacity="0.55" />

        {/* Sonrisa */}
        <path d="M94 150 Q110 164 126 150" stroke="#8a4a2b" strokeWidth="4" fill="none" strokeLinecap="round" />

        {/* Ojos */}
        <circle cx="96" cy="104" r="6" fill="#3a2a18" />
        <circle cx="124" cy="104" r="6" fill="#3a2a18" />
        <circle cx="98" cy="102" r="2" fill="#ffffff" />
        <circle cx="126" cy="102" r="2" fill="#ffffff" />
        <path d="M88 96 Q96 92 104 96" stroke="#3a2a18" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M116 96 Q124 92 132 96" stroke="#3a2a18" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Sombrero de paja */}
        <ellipse cx="110" cy="76" rx="52" ry="13" fill="url(#hat-g)" />
        <path d="M84 78 Q80 42 110 40 Q140 42 136 78 Z" fill="url(#hat-g)" />
        <rect x="104" y="44" width="12" height="30" rx="5" fill="#b07a2a" />
      </svg>
    </div>
  );
}
