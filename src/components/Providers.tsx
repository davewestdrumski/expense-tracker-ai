"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ExpenseProvider, useExpenses } from "@/context/ExpenseContext";
import { ToastProvider, useToast } from "@/context/ToastContext";
import type { Expense, ExpenseInput } from "@/types/expense";
import { formatCurrency } from "@/lib/format";
import { ExpenseForm } from "./ExpenseForm";
import { ConfirmDialog } from "./ConfirmDialog";
import { Modal } from "./Modal";

interface ExpenseActions {
  openCreate: () => void;
  openEdit: (expense: Expense) => void;
  requestDelete: (expense: Expense) => void;
}

const ExpenseActionsContext = createContext<ExpenseActions | null>(null);

export function useExpenseActions(): ExpenseActions {
  const ctx = useContext(ExpenseActionsContext);
  if (!ctx) throw new Error("useExpenseActions must be used within Providers");
  return ctx;
}

/** Hosts the add/edit modal and delete confirmation so any page can trigger them. */
function ExpenseActionsHost({ children }: { children: ReactNode }) {
  const { addExpense, updateExpense, deleteExpense } = useExpenses();
  const { toast } = useToast();
  const [formState, setFormState] = useState<{ open: boolean; editing?: Expense }>({ open: false });
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);

  const actions = useMemo<ExpenseActions>(
    () => ({
      openCreate: () => setFormState({ open: true }),
      openEdit: (expense) => setFormState({ open: true, editing: expense }),
      requestDelete: (expense) => setPendingDelete(expense),
    }),
    [],
  );

  const closeForm = () => setFormState({ open: false });

  const handleSubmit = (input: ExpenseInput) => {
    if (formState.editing) {
      updateExpense(formState.editing.id, input);
      toast("Expense updated");
    } else {
      addExpense(input);
      toast(`Added ${formatCurrency(input.amount)} for ${input.description}`);
    }
    closeForm();
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteExpense(pendingDelete.id);
    toast("Expense deleted", "info");
    setPendingDelete(null);
  };

  return (
    <ExpenseActionsContext.Provider value={actions}>
      {children}
      <Modal
        open={formState.open}
        onClose={closeForm}
        title={formState.editing ? "Edit expense" : "Add expense"}
        description={formState.editing ? "Update the details of this expense." : "Record a new purchase or bill."}
      >
        {/* Keyed so the form resets each time it opens. */}
        <ExpenseForm
          key={formState.editing?.id ?? "new"}
          initial={formState.editing}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      </Modal>
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete expense?"
        message={
          pendingDelete
            ? `"${pendingDelete.description}" (${formatCurrency(pendingDelete.amount)}) will be permanently removed.`
            : ""
        }
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </ExpenseActionsContext.Provider>
  );
}

function ExpenseProviderWithToasts({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const onPersistError = useCallback((message: string) => toast(message, "error"), [toast]);
  return <ExpenseProvider onPersistError={onPersistError}>{children}</ExpenseProvider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ExpenseProviderWithToasts>
        <ExpenseActionsHost>{children}</ExpenseActionsHost>
      </ExpenseProviderWithToasts>
    </ToastProvider>
  );
}
