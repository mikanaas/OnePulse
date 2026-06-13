import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";

export function formatCurrency(value: number | undefined | null) {
  if (value == null) return "0 kr";
  return new Intl.NumberFormat("no-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | undefined | null) {
  if (value == null) return "0";
  return new Intl.NumberFormat("no-NO").format(value);
}

export function formatDate(dateStr: string | undefined | null) {
  if (!dateStr) return "-";
  try {
    return format(parseISO(dateStr), "dd.MM.yyyy");
  } catch (e) {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | undefined | null) {
  if (!dateStr) return "-";
  try {
    return format(parseISO(dateStr), "dd.MM.yyyy HH:mm");
  } catch (e) {
    return dateStr;
  }
}

export const statusMap: Record<string, { label: string; color: string }> = {
  ide: { label: "Idé", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  pagaende: { label: "Pågående", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
  pause: { label: "Pause", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  fullfort: { label: "Fullført", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
  avsluttet: { label: "Avsluttet", color: "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-400" },
};

export const taskStatusMap: Record<string, { label: string; color: string }> = {
  ikke_startet: { label: "Ikke startet", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  pagaar: { label: "Pågår", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
  venter: { label: "Venter", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  fullfort: { label: "Fullført", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
};

export const taskPriorityMap: Record<string, { label: string; color: string }> = {
  lav: { label: "Lav", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  middels: { label: "Middels", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  hoy: { label: "Høy", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

export const effectTypeMap: Record<string, string> = {
  engangs: "Engangsbesparelse",
  lopende_arlig: "Løpende årlig",
};

export const confidenceMap: Record<string, string> = {
  lav: "Lav",
  middels: "Middels",
  hoy: "Høy",
};
