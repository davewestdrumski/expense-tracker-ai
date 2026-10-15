"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Expense, ExpenseInput } from "@/types/expense";
import { createId, loadExpenses, saveExpenses } from "@/lib/storage";

interface ExpenseContextValue {
  expenses: Expense[];
  isLoading: boolean;
  loadError: string | null;
  addExpense: (input: ExpenseInput) => Expense;
  addMany: (inputs: ExpenseInput[]) => void;
  updateExpense: (id: string, input: ExpenseInput) => void;
  deleteExpense: (id: string) => Expense | undefined;
  clearAll: () => void;
  /** Restores expenses from a backup. Merge keeps existing records and skips duplicate ids. */
  importExpenses: (incoming: Expense[], mode: "merge" | "replace") => { added: number; skipped: number };
}

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

function build(input: ExpenseInput): Expense {
  const now = new Date().toISOString();
  return { ...input, id: createId(), createdAt: now, updatedAt: now };
}

export function ExpenseProvider({
  children,
  onPersistError,
}: {
  children: ReactNode;
  onPersistError?: (message: string) => void;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hydrated = useRef(false);
  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;

  // Load once on mount (localStorage is only available in the browser).
  useEffect(() => {
    try {
      setExpenses(loadExpenses());
    } catch (err) {
      console.error(err);
      setLoadError("We couldn't read your saved expenses. Starting with an empty list.");
    } finally {
      hydrated.current = true;
      setIsLoading(false);
    }
  }, []);

  // Persist on every change after the initial load.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      saveExpenses(expenses);
    } catch (err) {
      console.error(err);
      onPersistError?.("Couldn't save to local storage. Your browser storage may be full or disabled.");
    }
  }, [expenses, onPersistError]);

  // Keep multiple open tabs in sync.
  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key?.startsWith("expense-tracker:")) {
        try {
          setExpenses(loadExpenses());
        } catch {
          /* ignore malformed external writes */
        }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const addExpense = useCallback((input: ExpenseInput) => {
    const expense = build(input);
    setExpenses((current) => [expense, ...current]);
    return expense;
  }, []);

  const addMany = useCallback((inputs: ExpenseInput[]) => {
    setExpenses((current) => [...inputs.map(build), ...current]);
  }, []);

  const updateExpense = useCallback((id: string, input: ExpenseInput) => {
    setExpenses((current) =>
      current.map((e) => (e.id === id ? { ...e, ...input, updatedAt: new Date().toISOString() } : e)),
    );
  }, []);

  const deleteExpense = useCallback((id: string) => {
    const removed = expensesRef.current.find((e) => e.id === id);
    setExpenses((current) => current.filter((e) => e.id !== id));
    return removed;
  }, []);

  const clearAll = useCallback(() => setExpenses([]), []);

  const importExpenses = useCallback((incoming: Expense[], mode: "merge" | "replace") => {
    if (mode === "replace") {
      setExpenses(incoming);
      return { added: incoming.length, skipped: 0 };
    }
    const existing = new Set(expensesRef.current.map((e) => e.id));
    const fresh = incoming.filter((e) => !existing.has(e.id));
    setExpenses((current) => [...fresh, ...current]);
    return { added: fresh.length, skipped: incoming.length - fresh.length };
  }, []);

  const value = useMemo(
    () => ({
      expenses,
      isLoading,
      loadError,
      addExpense,
      addMany,
      updateExpense,
      deleteExpense,
      clearAll,
      importExpenses,
    }),
    [expenses, isLoading, loadError, addExpense, addMany, updateExpense, deleteExpense, clearAll, importExpenses],
  );

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
}

export function useExpenses(): ExpenseContextValue {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error("useExpenses must be used within ExpenseProvider");
  return ctx;
}
