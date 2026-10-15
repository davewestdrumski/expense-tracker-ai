import {
  Car,
  Clapperboard,
  MoreHorizontal,
  Receipt,
  ShoppingBag,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/types/expense";

interface CategoryMeta {
  icon: LucideIcon;
  /** Hex color used for charts. */
  color: string;
  /** Tailwind classes for badges / icon chips. */
  badge: string;
}

// Chart colors follow a fixed categorical order validated for color-vision deficiency.
export const CATEGORY_META: Record<Category, CategoryMeta> = {
  Food: { icon: Utensils, color: "#2a78d6", badge: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  Transportation: { icon: Car, color: "#eb6834", badge: "bg-orange-50 text-orange-700 ring-orange-600/20" },
  Entertainment: { icon: Clapperboard, color: "#1baf7a", badge: "bg-teal-50 text-teal-700 ring-teal-600/20" },
  Shopping: { icon: ShoppingBag, color: "#eda100", badge: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  Bills: { icon: Receipt, color: "#e87ba4", badge: "bg-pink-50 text-pink-700 ring-pink-600/20" },
  Other: { icon: MoreHorizontal, color: "#008300", badge: "bg-green-50 text-green-800 ring-green-600/20" },
};
