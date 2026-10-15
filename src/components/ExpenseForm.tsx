"use client";

import { useState, type FormEvent } from "react";
import { CATEGORIES, type Expense, type ExpenseInput } from "@/types/expense";
import { CATEGORY_META } from "@/lib/categories";
import { todayISO } from "@/lib/format";
import {
  MAX_DESCRIPTION,
  toExpenseInput,
  validateExpense,
  type ExpenseFormErrors,
  type ExpenseFormValues,
} from "@/lib/validation";
import { Button, inputClass } from "./ui";

interface ExpenseFormProps {
  initial?: Expense;
  onSubmit: (input: ExpenseInput) => void;
  onCancel: () => void;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs font-medium text-red-600">
      {message}
    </p>
  );
}

export function ExpenseForm({ initial, onSubmit, onCancel }: ExpenseFormProps) {
  const [values, setValues] = useState<ExpenseFormValues>({
    date: initial?.date ?? todayISO(),
    amount: initial ? initial.amount.toFixed(2) : "",
    category: initial?.category ?? "",
    description: initial?.description ?? "",
  });
  const [errors, setErrors] = useState<ExpenseFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ExpenseFormValues, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    if (touched[key]) setErrors(validateExpense(next));
  };

  const blur = (key: keyof ExpenseFormValues) => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors(validateExpense(values));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validateExpense(values);
    setErrors(nextErrors);
    setTouched({ date: true, amount: true, category: true, description: true });
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);
    onSubmit(toExpenseInput(values));
  };

  const visibleError = (key: keyof ExpenseFormValues) => (touched[key] ? errors[key] : undefined);
  const ringError = (key: keyof ExpenseFormValues) =>
    visibleError(key) ? "ring-red-400 focus:ring-red-500" : "";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">
          Description
        </label>
        <input
          id="description"
          type="text"
          autoComplete="off"
          maxLength={MAX_DESCRIPTION + 20}
          placeholder="e.g. Weekly groceries"
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          onBlur={() => blur("description")}
          aria-invalid={!!visibleError("description")}
          aria-describedby="description-error"
          className={`${inputClass} ${ringError("description")}`}
        />
        <div className="flex justify-between">
          <FieldError id="description-error" message={visibleError("description")} />
          <span
            className={`ml-auto mt-1.5 text-xs ${
              values.description.trim().length > MAX_DESCRIPTION ? "text-red-600" : "text-slate-400"
            }`}
          >
            {values.description.trim().length}/{MAX_DESCRIPTION}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-slate-700">
            Amount
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-500">
              $
            </span>
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={values.amount}
              onChange={(e) => update("amount", e.target.value.replace(/[^\d.]/g, ""))}
              onBlur={() => {
                const n = Number(values.amount);
                if (values.amount && /^\d+(\.\d{0,2})?$/.test(values.amount) && Number.isFinite(n)) {
                  setValues((v) => ({ ...v, amount: n.toFixed(2) }));
                }
                blur("amount");
              }}
              aria-invalid={!!visibleError("amount")}
              aria-describedby="amount-error"
              className={`${inputClass} pl-7 tabular-nums ${ringError("amount")}`}
            />
          </div>
          <FieldError id="amount-error" message={visibleError("amount")} />
        </div>

        <div>
          <label htmlFor="date" className="mb-1.5 block text-sm font-medium text-slate-700">
            Date
          </label>
          <input
            id="date"
            type="date"
            max={todayISO()}
            value={values.date}
            onChange={(e) => update("date", e.target.value)}
            onBlur={() => blur("date")}
            aria-invalid={!!visibleError("date")}
            aria-describedby="date-error"
            className={`${inputClass} ${ringError("date")}`}
          />
          <FieldError id="date-error" message={visibleError("date")} />
        </div>
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-slate-700">Category</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CATEGORIES.map((category) => {
            const { icon: Icon, color } = CATEGORY_META[category];
            const selected = values.category === category;
            return (
              <label
                key={category}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-inset transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 ${
                  selected
                    ? "bg-brand-50 text-brand-700 ring-brand-500"
                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={category}
                  checked={selected}
                  onChange={() => {
                    setTouched((t) => ({ ...t, category: true }));
                    update("category", category);
                  }}
                  className="sr-only"
                />
                <Icon className="h-4 w-4" style={{ color }} aria-hidden />
                {category}
              </label>
            );
          })}
        </div>
        <FieldError id="category-error" message={visibleError("category")} />
      </fieldset>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {initial ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
