"use client";

import { Plus, Sparkles, Wallet } from "lucide-react";
import { useExpenses } from "@/context/ExpenseContext";
import { useToast } from "@/context/ToastContext";
import { generateSampleExpenses } from "@/lib/sample-data";
import { useExpenseActions } from "./Providers";
import { Button, Card } from "./ui";

export function EmptyState() {
  const { openCreate } = useExpenseActions();
  const { addMany } = useExpenses();
  const { toast } = useToast();

  const loadSample = () => {
    const sample = generateSampleExpenses();
    addMany(sample);
    toast(`Loaded ${sample.length} sample expenses`);
  };

  return (
    <Card className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Wallet className="h-7 w-7" aria-hidden />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-slate-900">No expenses yet</h2>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">
        Start tracking where your money goes. Add your first expense, or load sample data to explore the app.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button onClick={openCreate} icon={<Plus className="h-4 w-4" aria-hidden />}>
          Add your first expense
        </Button>
        <Button variant="secondary" onClick={loadSample} icon={<Sparkles className="h-4 w-4" aria-hidden />}>
          Load sample data
        </Button>
      </div>
    </Card>
  );
}
