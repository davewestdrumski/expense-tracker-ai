"use client";

import { useMemo } from "react";
import qrcode from "qrcode-generator";

/** Renders a QR code as crisp SVG. Returns null if the data exceeds QR capacity. */
export function QRCode({ value, size = 184 }: { value: string; size?: number }) {
  const matrix = useMemo(() => {
    try {
      const qr = qrcode(0, "L");
      qr.addData(value, "Byte");
      qr.make();
      const n = qr.getModuleCount();
      const cells: string[] = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) cells.push(`M${c} ${r}h1v1h-1z`);
      return { n, path: cells.join("") };
    } catch {
      return null;
    }
  }, [value]);

  if (!matrix) return null;
  const quiet = 3;
  return (
    <svg
      viewBox={`${-quiet} ${-quiet} ${matrix.n + quiet * 2} ${matrix.n + quiet * 2}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR code for the share link"
      className="rounded-lg bg-white"
    >
      <rect x={-quiet} y={-quiet} width={matrix.n + quiet * 2} height={matrix.n + quiet * 2} fill="#fff" />
      <path d={matrix.path} fill="#0f172a" />
    </svg>
  );
}

/** Modules per side at which phone cameras start to struggle. */
export function qrIsDense(value: string): boolean {
  return value.length > 900;
}
