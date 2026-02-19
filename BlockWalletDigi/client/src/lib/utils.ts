import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    academic: "from-blue-600 to-blue-800",
    employment: "from-purple-600 to-purple-800",
    skill: "from-green-600 to-green-800",
    government: "from-red-600 to-red-800",
    medical: "from-pink-600 to-pink-800",
  };
  return colors[category] || "from-gray-600 to-gray-800";
}
