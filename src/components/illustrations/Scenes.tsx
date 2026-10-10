import { memo } from 'react';

/** Небо с солнцем и облаками — фон summary-карточки. */
export const SkyScene = memo(function SkyScene({ className }: { className?: string }) {
  const rays = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const a1 = a - 0.13;
    const a2 = a + 0.13;
    const r1 = 33;
    const r2 = 46;
    const cx = 300;
    const cy = 70;
    return `${cx + Math.cos(a1) * r1},${cy + Math.sin(a1) * r1} ${cx + Math.cos(a) * r2},${cy + Math.sin(a) * r2} ${cx + Math.cos(a2) * r1},${cy + Math.sin(a2) * r1}`;
  });
  return (
    <svg className={className} viewBox="0 0 400 220" preserveAspectRatio="xMaxYMid slice" aria-hidden>
      <defs>
        <radialGradient id="sk-sun" cx="0.45" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#FFE3A3" />
          <stop offset="1" stopColor="#F6BE5E" />
        </radialGradient>
        <radialGradient id="sk-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF2D6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFF2D6" stopOpacity="0" />
        </radialGradient>
        <filter id="sk-blur">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <circle cx={300} cy={70} r={90} fill="url(#sk-glow)" />
      <g fill="#F8CD7A" opacity={0.95}>
        {rays.map((p, i) => (
          <polygon key={i} points={p} />
        ))}
      </g>
      <circle cx={300} cy={70} r={31} fill="url(#sk-sun)" />
      <g fill="#FFFFFF" filter="url(#sk-blur)">
        <g opacity={0.95}>
          <ellipse cx={232} cy={104} rx={46} ry={16} />
          <circle cx={214} cy={96} r={16} />
          <circle cx={240} cy={88} r={20} />
          <circle cx={262} cy={98} r={14} />
        </g>
        <g opacity={0.9}>
          <ellipse cx={330} cy={190} rx={70} ry={20} />
          <circle cx={300} cy={178} r={22} />
          <circle cx={334} cy={166} r={28} />
          <circle cx={368} cy={180} r={20} />
        </g>
        <g opacity={0.6}>
          <ellipse cx={130} cy={160} rx={44} ry={10} />
          <circle cx={130} cy={150} r={13} />
        </g>
      </g>
    </svg>
  );
});

/** Мягкая каменная арка с растением — вдохновляющая карточка. */
export const ArchScene = memo(function ArchScene({ className }: { className?: string }) {
  const leaves = Array.from({ length: 11 }, (_, i) => {
    const angle = -150 + i * 13;
    return { angle, len: 46 + ((i * 37) % 22) };
  });
  return (
    <svg className={className} viewBox="0 0 300 260" preserveAspectRatio="xMaxYMax slice" aria-hidden>
      <defs>
        <linearGradient id="ar-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F0C9C6" />
          <stop offset="1" stopColor="#D08E93" />
        </linearGradient>
        <linearGradient id="ar-inner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7E3EC" />
          <stop offset="1" stopColor="#EBC6D2" />
        </linearGradient>
        <linearGradient id="ar-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D99498" />
          <stop offset="1" stopColor="#B9747C" />
        </linearGradient>
      </defs>
      <path d="M150 262 L150 112 Q150 32 232 26 L304 26 L304 262 Z" fill="url(#ar-wall)" />
      <path d="M182 262 L182 138 Q182 84 232 82 Q282 84 282 138 L282 262 Z" fill="url(#ar-inner)" />
      <g stroke="#C98186" strokeWidth={1} opacity={0.45}>
        <path d="M154 150 L180 150" />
        <path d="M154 190 L180 190" />
        <path d="M154 230 L180 230" />
        <path d="M284 120 L304 120" />
        <path d="M284 170 L304 170" />
        <path d="M284 220 L304 220" />
        <path d="M190 64 Q232 50 276 64" fill="none" />
      </g>
      <g transform="translate(170 214)">
        {leaves.map((l, i) => (
          <g key={i} transform={`rotate(${l.angle})`}>
            <path d={`M0 0 L${l.len} 0`} stroke="#8F5E66" strokeWidth={1.6} />
            <ellipse cx={l.len * 0.62} cy={0} rx={l.len * 0.42} ry={5.5} fill="#A06A72" opacity={0.85} />
          </g>
        ))}
        <path d="M0 0 L-4 48" stroke="#8F5E66" strokeWidth={3} />
      </g>
      <path d="M-10 262 Q90 196 250 224 Q290 232 310 262 Z" fill="url(#ar-ground)" />
      <path d="M40 262 Q120 226 220 238" stroke="#E7B4B6" strokeWidth={2} fill="none" opacity={0.6} />
    </svg>
  );
});

/** Узкая европейская улица — раздел «Описание». */
export const StreetScene = memo(function StreetScene({ className }: { className?: string }) {
  const leftWindows: [number, number][] = [];
  for (let row = 0; row < 6; row += 1) for (let col = 0; col < 2; col += 1) leftWindows.push([18 + col * 34, 92 + row * 44]);
  const rightWindows: [number, number][] = [];
  for (let row = 0; row < 7; row += 1) for (let col = 0; col < 2; col += 1) rightWindows.push([170 + col * 30, 70 + row * 42]);
  return (
    <svg className={className} viewBox="0 0 240 380" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Узкая европейская улица">
      <defs>
        <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B9CDE2" />
          <stop offset="1" stopColor="#EEF1F4" />
        </linearGradient>
        <linearGradient id="st-left" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#CDB394" />
          <stop offset="1" stopColor="#DDC7A9" />
        </linearGradient>
        <linearGradient id="st-right" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#C9AE8E" />
          <stop offset="1" stopColor="#E3CFB3" />
        </linearGradient>
        <linearGradient id="st-street" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#CFC2B2" />
          <stop offset="1" stopColor="#A9998A" />
        </linearGradient>
      </defs>
      <rect width={240} height={380} fill="url(#st-sky)" />
      {/* дальний фасад */}
      <rect x={96} y={190} width={58} height={130} fill="#E8DCCB" />
      {[104, 118, 132].map((x) => [210, 236, 262, 288].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width={7} height={12} fill="#8C98A6" opacity={0.6} />))}
      {/* улица */}
      <polygon points="40,380 108,320 140,320 210,380" fill="url(#st-street)" />
      <g stroke="#8F7F70" strokeWidth={0.8} opacity={0.45}>
        <path d="M58 366 L190 366" />
        <path d="M74 352 L176 352" />
        <path d="M88 340 L162 340" />
        <path d="M100 330 L150 330" />
        <path d="M124 320 L124 380" />
      </g>
      {/* левое здание — готический фасад */}
      <polygon points="0,40 18,22 26,0 34,22 50,30 66,14 74,0 82,14 96,40 104,52 104,340 40,380 0,380" fill="url(#st-left)" />
      <polygon points="96,40 104,52 104,340 96,346" fill="#000" opacity={0.08} />
      {leftWindows.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <path d={`M${x} ${y + 26} L${x} ${y + 8} Q${x + 8} ${y - 2} ${x + 16} ${y + 8} L${x + 16} ${y + 26} Z`} fill="#5F6E7E" opacity={0.85} />
          <rect x={x - 2} y={y + 26} width={20} height={3} fill="#BFA585" />
        </g>
      ))}
      <rect x={18} y={56} width={44} height={6} fill="#BFA585" opacity={0.8} />
      {/* правое здание — с балконами */}
      <polygon points="150,30 240,10 240,380 210,380 150,330" fill="url(#st-right)" />
      {rightWindows.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width={14} height={22} rx={1} fill="#66727F" opacity={0.85} />
          <rect x={x - 3} y={y + 22} width={20} height={2.5} fill="#4F4F58" />
          <g stroke="#4F4F58" strokeWidth={0.8}>
            {[0, 5, 10, 15].map((dx) => (
              <path key={dx} d={`M${x - 2 + dx} ${y + 22} L${x - 2 + dx} ${y + 29}`} />
            ))}
          </g>
        </g>
      ))}
      <polygon points="150,30 150,330 158,334 158,32" fill="#000" opacity={0.06} />
      {/* люди и фонарь */}
      <g fill="#5B4E57">
        <circle cx={112} cy={334} r={2.2} />
        <rect x={110} y={336} width={4.5} height={10} rx={2} />
        <circle cx={134} cy={340} r={2.6} />
        <rect x={131.6} y={342.5} width={5} height={12} rx={2} fill="#A8505E" />
      </g>
      <g stroke="#3E3E46" strokeWidth={1.2} fill="none">
        <path d="M150 210 L164 210" />
        <path d="M164 210 L164 218" />
      </g>
      <path d="M160 218 L168 218 L166 228 L162 228 Z" fill="#F4D58A" opacity={0.9} />
    </svg>
  );
});
