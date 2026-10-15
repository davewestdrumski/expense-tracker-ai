"use client";

import { AlertCircle } from "lucide-react";
import { useExpenses } from "@/context/ExpenseContext";

export function LoadError() {
  const { loadError } = useExpenses();
  if (!loadError) return null;
  return (
    <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-inset ring-red-600/20">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {loadError}
    </div>
  );
}
