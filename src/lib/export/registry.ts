import { csvExporter } from "./formats/csv";
import { jsonExporter } from "./formats/json";
import { pdfExporter } from "./formats/pdf";
import type { ExportFormat, Exporter } from "./types";

export const EXPORTERS: Record<ExportFormat, Exporter> = {
  csv: csvExporter,
  json: jsonExporter,
  pdf: pdfExporter,
};

export const EXPORT_FORMATS = Object.values(EXPORTERS);
