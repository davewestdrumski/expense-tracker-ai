import type { Category, ExpenseInput } from "@/types/expense";
import { toISODate } from "./format";

const TEMPLATES: { category: Category; description: string; min: number; max: number }[] = [
  { category: "Food", description: "Groceries", min: 40, max: 140 },
  { category: "Food", description: "Coffee", min: 3, max: 7 },
  { category: "Food", description: "Dinner out", min: 25, max: 90 },
  { category: "Transportation", description: "Gas", min: 30, max: 70 },
  { category: "Transportation", description: "Rideshare", min: 9, max: 35 },
  { category: "Entertainment", description: "Movie tickets", min: 12, max: 40 },
  { category: "Entertainment", description: "Streaming subscription", min: 10, max: 20 },
  { category: "Shopping", description: "Clothing", min: 25, max: 150 },
  { category: "Shopping", description: "Household supplies", min: 15, max: 60 },
  { category: "Bills", description: "Electricity bill", min: 70, max: 140 },
  { category: "Bills", description: "Internet", min: 60, max: 80 },
  { category: "Bills", description: "Phone plan", min: 45, max: 65 },
  { category: "Other", description: "Gift", min: 20, max: 80 },
];

/** Generates ~3 months of realistic-looking demo expenses. */
export function generateSampleExpenses(): ExpenseInput[] {
  const today = new Date();
  const result: ExpenseInput[] = [];
  for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
    const perDay = Math.random() < 0.55 ? 1 : Math.random() < 0.5 ? 0 : 2;
    for (let i = 0; i < perDay; i++) {
      const t = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOffset);
      result.push({
        date: toISODate(date),
        amount: Math.round((t.min + Math.random() * (t.max - t.min)) * 100) / 100,
        category: t.category,
        description: t.description,
      });
    }
  }
  return result;
}
