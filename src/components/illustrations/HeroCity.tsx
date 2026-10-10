import { memo } from 'react';
import type React from 'react';

/** Детерминированный PRNG — панорама одинакова при каждом рендере. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Building {
  base: number;
  x: number;
  w: number;
  top: number;
  body: string;
  roof: string;
  roofH: number;
  windows: { x: number; y: number }[];
  gable: boolean;
}

const W = 1600;
const BASE = 400;
/** Высота кадра: город поднят вверх, чтобы его не закрывала карточка шкалы. */
const VIEW_H = 430;
const SHIFT = -96;

function buildRow(seed: number, opts: { base?: number; minTop: (x: number) => number; maxTop: (x: number) => number; palette: string[]; roofs: string[]; windows: boolean; minW: number; maxW: number }): Building[] {
  const base = opts.base ?? BASE;
  const rnd = mulberry32(seed);
  const res: Building[] = [];
  let x = -10;
  while (x < W + 10) {
    const w = opts.minW + rnd() * (opts.maxW - opts.minW);
    const lo = opts.minTop(x);
    const hi = opts.maxTop(x);
    const top = lo + rnd() * (hi - lo);
    const body = opts.palette[Math.floor(rnd() * opts.palette.length)];
    const roof = opts.roofs[Math.floor(rnd() * opts.roofs.length)];
    const windows: { x: number; y: number }[] = [];
    if (opts.windows && w > 15) {
      for (let wy = top + 10; wy < Math.min(base - 6, top + 70); wy += 9) {
        for (let wx = x + 4; wx < x + w - 5; wx += 7) {
          if (rnd() > 0.28) windows.push({ x: wx, y: wy });
        }
      }
    }
    res.push({ base, x, w, top, body, roof, roofH: 3 + rnd() * 4, windows, gable: rnd() > 0.72 });
    x += w - 1 + rnd() * 2;
  }
  return res;
}

const HAZE = (() => {
  const rnd = mulberry32(7);
  const out: { x: number; w: number; h: number }[] = [];
  let x = 0;
  while (x < W) {
    const w = 6 + rnd() * 16;
    out.push({ x, w, h: 6 + rnd() * 20 });
    x += w;
  }
  return out;
})();

// Высота застройки: слева ниже (там текст), справа выше (у собора)
const MID = buildRow(11, {
  minTop: (x) => (x < 560 ? 330 : 305),
  maxTop: (x) => (x < 560 ? 352 : 335),
  palette: ['#D9B79C', '#E3C6AE', '#CFA88B', '#E9D6C3', '#D7B095', '#C99D80'],
  roofs: ['#C27A5C', '#B86E52', '#CB876A'],
  windows: false,
  minW: 10,
  maxW: 26,
});

const FRONT = buildRow(23, {
  minTop: (x) => (x < 560 ? 352 : 338),
  maxTop: (x) => (x < 560 ? 372 : 362),
  palette: ['#C88A68', '#D59E7D', '#E2B596', '#B9785B', '#E8CBB0', '#D4A889', '#C27F62', '#EBD6C2', '#DDBB9C'],
  roofs: ['#B5664A', '#A95C42', '#C0735A', '#9F563E'],
  windows: true,
  minW: 14,
  maxW: 34,
});

// Ближние крыши ниже основной линии — заполняют низ кадра под карточкой шкалы
const FRONT2 = buildRow(41, {
  base: 540,
  minTop: () => 384,
  maxTop: () => 414,
  palette: ['#C98B69', '#D8A584', '#B97C5F', '#E4BC9E', '#CF9C7C', '#BE8263'],
  roofs: ['#A95C42', '#B5664A', '#9A523B'],
  windows: true,
  minW: 18,
  maxW: 40,
});

const CYPRESS = [
  [44, 352, 1],
  [58, 356, 0.8],
  [520, 344, 1],
  [536, 350, 0.75],
  [930, 334, 0.9],
  [1490, 330, 1.1],
  [1508, 338, 0.85],
  [1524, 344, 0.7],
] as const;

function Row({ rows }: { rows: Building[] }) {
  return (
    <g>
      {rows.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.top} width={b.w} height={b.base - b.top} fill={b.body} />
          {b.gable ? (
            <polygon points={`${b.x - 1},${b.top + 1} ${b.x + b.w / 2},${b.top - b.roofH - 3} ${b.x + b.w + 1},${b.top + 1}`} fill={b.roof} />
          ) : (
            <rect x={b.x - 1} y={b.top - b.roofH} width={b.w + 2} height={b.roofH + 1} fill={b.roof} />
          )}
          <rect x={b.x + b.w - 3} y={b.top} width={3} height={b.base - b.top} fill="#000" opacity={0.05} />
          {b.windows.map((w, j) => (
            <rect key={j} x={w.x} y={w.y} width={2.6} height={3.8} rx={0.6} fill="#6E4535" opacity={0.32} />
          ))}
        </g>
      ))}
    </g>
  );
}

/** Масштабирует достопримечательность относительно точки её основания. */
function Scaled({ cx, by, s, children }: { cx: number; by: number; s: number; children: React.ReactNode }) {
  return <g transform={`translate(${cx} ${by}) scale(${s}) translate(${-cx} ${-by})`}>{children}</g>;
}

function Duomo() {
  return (
    <g>
      {/* неф и фасад */}
      <rect x={1150} y={298} width={112} height={60} fill="#EDE3D7" />
      <polygon points="1146,300 1206,282 1266,300" fill="#C57A59" />
      {[1160, 1176, 1192, 1208, 1224, 1240].map((x) => (
        <rect key={x} x={x} y={304} width={3} height={50} fill="#7E9C86" opacity={0.55} />
      ))}
      {[1168, 1200, 1232].map((x) => (
        <rect key={x} x={x} y={312} width={8} height={14} rx={4} fill="#9C7B66" opacity={0.6} />
      ))}
      {/* малые полукупола апсид */}
      <path d="M1222 306 C1224 290 1236 284 1246 284 C1256 284 1266 290 1268 306 Z" fill="#C46B4B" />
      <path d="M1352 306 C1354 290 1366 284 1376 284 C1386 284 1396 290 1398 306 Z" fill="#B9603F" />
      <rect x={1352} y={304} width={50} height={52} fill="#E6D6C4" />
      {/* барабан */}
      <rect x={1252} y={258} width={116} height={50} fill="#EADBCB" />
      <rect x={1252} y={258} width={116} height={6} fill="#D9C7B4" />
      {[1272, 1310, 1348].map((x) => (
        <circle key={x} cx={x} cy={283} r={6} fill="#8A6B57" opacity={0.75} />
      ))}
      {[1254, 1290, 1328, 1364].map((x) => (
        <rect key={x} x={x} y={264} width={3} height={44} fill="#6F8E78" opacity={0.45} />
      ))}
      {/* купол */}
      <path d="M1246 260 C1249 200 1280 160 1310 154 C1340 160 1371 200 1374 260 Z" fill="url(#hc-dome)" />
      <path d="M1246 260 C1249 200 1280 160 1310 154 C1340 160 1371 200 1374 260 Z" fill="url(#hc-domeShade)" />
      <g stroke="#F4E8DC" strokeWidth={2.4} fill="none" opacity={0.92} strokeLinecap="round">
        <path d="M1310 258 L1310 158" />
        <path d="M1278 259 C1280 214 1294 178 1310 158" />
        <path d="M1342 259 C1340 214 1326 178 1310 158" />
        <path d="M1250 259 C1253 210 1278 174 1308 156" />
        <path d="M1370 259 C1367 210 1342 174 1312 156" />
      </g>
      <path d="M1250 246 C1290 238 1330 238 1370 246" stroke="#9B4B31" strokeWidth={1.2} fill="none" opacity={0.5} />
      {/* фонарь */}
      <rect x={1301} y={136} width={18} height={20} fill="#F2E9DE" />
      <rect x={1299} y={134} width={22} height={4} fill="#DCCDBD" />
      <polygon points="1299,136 1310,114 1321,136" fill="#E9DED2" />
      <circle cx={1310} cy={112} r={3} fill="#C9A86A" />
    </g>
  );
}

function Campanile() {
  return (
    <g>
      <rect x={1180} y={168} width={26} height={160} fill="#EFE6DB" />
      <rect x={1180} y={168} width={7} height={160} fill="#000" opacity={0.04} />
      {[200, 236, 272, 304].map((y) => (
        <rect key={y} x={1180} y={y} width={26} height={2.5} fill="#8FAE99" opacity={0.75} />
      ))}
      {[178, 210, 246].map((y) => (
        <rect key={y} x={1188} y={y} width={10} height={18} rx={5} fill="#7D6A5D" opacity={0.7} />
      ))}
      <rect x={1176} y={162} width={34} height={7} fill="#DDD0C2" />
    </g>
  );
}

function PalazzoVecchio() {
  return (
    <g>
      <rect x={712} y={302} width={92} height={60} fill="#D8C09E" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={712 + i * 8} y={296} width={5} height={7} fill="#CDB38F" />
      ))}
      {[724, 744, 764, 784].map((x) => (
        <rect key={x} x={x} y={318} width={7} height={11} rx={3} fill="#7A6250" opacity={0.55} />
      ))}
      <rect x={750} y={214} width={18} height={90} fill="#D2B994" />
      <rect x={744} y={228} width={30} height={14} fill="#C9AE88" />
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} x={744 + i * 6.5} y={224} width={4} height={5} fill="#C9AE88" />
      ))}
      <rect x={754} y={196} width={10} height={20} fill="#D8C09E" />
      <polygon points="752,198 759,182 766,198" fill="#B9775B" />
      <circle cx={759} cy={258} r={4} fill="#6E5A4A" opacity={0.6} />
    </g>
  );
}

function SmallLandmarks() {
  return (
    <g>
      {/* шпиль Бадии */}
      <rect x={1050} y={268} width={22} height={70} fill="#E2D0BA" />
      <polygon points="1061,168 1052,270 1070,270" fill="#CDB59A" />
      <polygon points="1061,168 1061,270 1070,270" fill="#000" opacity={0.06} />
      {/* купол Сан-Лоренцо */}
      <rect x={958} y={300} width={64} height={40} fill="#E4D3C0" />
      <path d="M966 302 C968 280 980 270 990 270 C1000 270 1012 280 1014 302 Z" fill="#C26E4E" />
      <rect x={987} y={262} width={6} height={9} fill="#EFE5DA" />
      {/* башня Барджелло */}
      <rect x={880} y={252} width={14} height={80} fill="#D6C1A2" />
      <rect x={876} y={248} width={22} height={7} fill="#C8B08D" />
      {/* колокольня слева */}
      <rect x={612} y={286} width={12} height={60} fill="#E0CCB2" />
      <polygon points="610,288 618,270 626,288" fill="#B87257" />
      {/* Санта-Кроче */}
      <rect x={1440} y={300} width={60} height={50} fill="#EFE7DC" />
      <polygon points="1436,302 1470,284 1504,302" fill="#D1C3B2" />
      <rect x={1466} y={258} width={10} height={44} fill="#E7DCCF" />
      <polygon points="1464,260 1471,244 1478,260" fill="#C9BBA9" />
    </g>
  );
}

export const HeroCity = memo(function HeroCity({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${W} ${VIEW_H}`} preserveAspectRatio="xMidYMin slice" role="img" aria-label="Панорама европейского города с куполом собора">
      <defs>
        <linearGradient id="hc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A8C2E2" />
          <stop offset="0.35" stopColor="#C8D9EC" />
          <stop offset="0.62" stopColor="#E7ECF2" />
          <stop offset="0.8" stopColor="#F3EBE3" />
          <stop offset="1" stopColor="#F1E2D4" />
        </linearGradient>
        <radialGradient id="hc-sun" cx="0.8" cy="0.42" r="0.45">
          <stop offset="0" stopColor="#FFF7EA" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFF7EA" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hc-mtn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#97ABC7" />
          <stop offset="1" stopColor="#C6D2E1" />
        </linearGradient>
        <linearGradient id="hc-mtn2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ADBDD3" />
          <stop offset="1" stopColor="#D5DDE8" />
        </linearGradient>
        <linearGradient id="hc-dome" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#D47A55" />
          <stop offset="0.45" stopColor="#C25F3D" />
          <stop offset="1" stopColor="#8F3F28" />
        </linearGradient>
        <linearGradient id="hc-domeShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.18" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="hc-left" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.82" />
          <stop offset="0.28" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hc-bottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.72" stopColor="#F7F8FB" stopOpacity="0" />
          <stop offset="1" stopColor="#F7F8FB" stopOpacity="0.55" />
        </linearGradient>
        <filter id="hc-blur" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="hc-soft">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>

      <rect width={W} height={VIEW_H} fill="url(#hc-sky)" />
      <rect width={W} height={VIEW_H} fill="url(#hc-sun)" />

      <g filter="url(#hc-blur)" fill="#FFFFFF">
        <ellipse cx={1120} cy={70} rx={150} ry={24} opacity={0.8} />
        <ellipse cx={1210} cy={52} rx={90} ry={22} opacity={0.75} />
        <ellipse cx={980} cy={100} rx={130} ry={16} opacity={0.6} />
        <ellipse cx={1460} cy={120} rx={130} ry={18} opacity={0.65} />
        <ellipse cx={420} cy={70} rx={170} ry={18} opacity={0.55} />
        <ellipse cx={700} cy={130} rx={140} ry={14} opacity={0.45} />
      </g>

      <g transform={`translate(0 ${SHIFT})`}>
      <path
        d="M0 262 L110 246 L240 252 L380 232 L520 240 L660 214 L780 206 L880 190 L980 200 L1080 182 L1180 196 L1300 176 L1420 192 L1520 184 L1600 190 L1600 320 L0 320 Z"
        fill="url(#hc-mtn)"
        opacity={0.75}
      />
      <path
        d="M0 282 L140 270 L300 276 L460 260 L620 266 L760 250 L900 256 L1040 236 L1160 248 L1280 230 L1400 244 L1600 236 L1600 330 L0 330 Z"
        fill="url(#hc-mtn2)"
        opacity={0.85}
      />

      <g fill="#D9C8BA" opacity={0.85}>
        {HAZE.map((h, i) => (
          <rect key={i} x={h.x} y={300 - h.h} width={h.w} height={h.h + 30} />
        ))}
      </g>

      <g filter="url(#hc-soft)">
        <Row rows={MID} />
        <Scaled cx={1000} by={330} s={0.8}>
          <SmallLandmarks />
        </Scaled>
        <Scaled cx={760} by={350} s={0.8}>
          <PalazzoVecchio />
        </Scaled>
        <g transform="translate(0 16)">
          <Scaled cx={1193} by={330} s={0.74}>
            <Campanile />
          </Scaled>
          <Scaled cx={1310} by={330} s={0.76}>
            <Duomo />
          </Scaled>
        </g>
      </g>

      <Row rows={FRONT} />
      <Row rows={FRONT2} />

      <g fill="#4C6A51">
        {CYPRESS.map(([x, y, s], i) => (
          <ellipse key={i} cx={x} cy={y} rx={5.5 * s} ry={22 * s} />
        ))}
      </g>

      </g>
      <rect width={W} height={VIEW_H} fill="url(#hc-left)" />
      <rect width={W} height={VIEW_H} fill="url(#hc-bottom)" />
    </svg>
  );
});
