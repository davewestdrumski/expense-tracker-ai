"use client";

import { useCallback, useRef, useState } from "react";
import { saveBlob } from "@/lib/export/download";
import { EXPORTERS } from "@/lib/export/registry";
import type { ExportContext, ExportFormat } from "@/lib/export/types";

export type ExportStatus =
  | { state: "idle" }
  | { state: "working"; format: ExportFormat }
  | { state: "success"; format: ExportFormat; filename: string; bytes: number; count: number }
  | { state: "error"; message: string };

/** Keeps the spinner up long enough to register, avoiding a jarring flash. */
const MIN_WORKING_MS = 450;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useExport() {
  const [status, setStatus] = useState<ExportStatus>({ state: "idle" });
  const running = useRef(false);

  const run = useCallback(async (ctx: ExportContext, baseFilename: string) => {
    if (running.current) return null;
    running.current = true;
    const exporter = EXPORTERS[ctx.options.format];
    setStatus({ state: "working", format: exporter.format });
    const started = performance.now();
    try {
      // Let React paint the loading state before doing synchronous work.
      await nextFrame();
      const blob = exporter.build(ctx);
      const filename = `${baseFilename}.${exporter.extension}`;
      const elapsed = performance.now() - started;
      if (elapsed < MIN_WORKING_MS) await sleep(MIN_WORKING_MS - elapsed);
      saveBlob(blob, filename);
      const result = { state: "success" as const, format: exporter.format, filename, bytes: blob.size, count: ctx.rows.length };
      setStatus(result);
      return result;
    } catch (err) {
      console.error(err);
      setStatus({ state: "error", message: `Couldn't generate the ${exporter.label} file. Please try again.` });
      return null;
    } finally {
      running.current = false;
    }
  }, []);

  const reset = useCallback(() => setStatus({ state: "idle" }), []);

  return { status, run, reset };
}
