import { CATEGORIES, type Category, type ExpenseInput } from "@/types/expense";
import { todayISO } from "./format";

export interface ExpenseFormValues {
  date: string;
  amount: string;
  category: Category | "";
  description: string;
}

export type ExpenseFormErrors = Partial<Record<keyof ExpenseFormValues, string>>;

export const MAX_AMOUNT = 1_000_000;
export const MAX_DESCRIPTION = 100;

export function validateExpense(values: ExpenseFormValues): ExpenseFormErrors {
  const errors: ExpenseFormErrors = {};

  if (!values.date) {
    errors.date = "Date is required.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
    errors.date = "Enter a valid date.";
  } else if (values.date > todayISO()) {
    errors.date = "Date can't be in the future.";
  } else if (values.date < "1900-01-01") {
    errors.date = "Enter a realistic date.";
  }

  const amountText = values.amount.trim();
  const amount = Number(amountText);
  if (!amountText) {
    errors.amount = "Amount is required.";
  } else if (!/^\d+(\.\d{0,2})?$/.test(amountText) || !Number.isFinite(amount)) {
    errors.amount = "Enter a valid amount with up to 2 decimal places.";
  } else if (amount <= 0) {
    errors.amount = "Amount must be greater than zero.";
  } else if (amount > MAX_AMOUNT) {
    errors.amount = "Amount can't exceed $1,000,000.";
  }

  if (!values.category || !CATEGORIES.includes(values.category)) {
    errors.category = "Choose a category.";
  }

  const description = values.description.trim();
  if (!description) {
    errors.description = "Description is required.";
  } else if (description.length > MAX_DESCRIPTION) {
    errors.description = `Keep it under ${MAX_DESCRIPTION} characters.`;
  }

  return errors;
}

export function toExpenseInput(values: ExpenseFormValues): ExpenseInput {
  return {
    date: values.date,
    amount: Math.round(Number(values.amount) * 100) / 100,
    category: values.category as Category,
    description: values.description.trim(),
  };
}
