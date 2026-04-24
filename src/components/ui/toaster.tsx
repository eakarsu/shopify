"use client"

import { useToast } from "@/hooks/use-toast"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all animate-in slide-in-from-bottom-5",
            toast.variant === "destructive"
              ? "border-red-200 bg-red-50 text-red-900"
              : toast.variant === "success"
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-gray-200 bg-white text-gray-900"
          )}
        >
          <div className="mt-0.5">
            {toast.variant === "destructive" ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : toast.variant === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Info className="h-5 w-5 text-blue-500" />
            )}
          </div>
          <div className="flex-1">
            {toast.title && (
              <p className="text-sm font-semibold">{toast.title}</p>
            )}
            {toast.description && (
              <p className="text-sm opacity-80">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="rounded-md p-1 opacity-50 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
