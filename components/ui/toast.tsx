"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error";
type ToastItem = { id: number; message: string; tone: Tone };
type ToastFn = (message: string, tone?: Tone) => void;

const ToastContext = createContext<ToastFn>(() => {});

let nextId = 0;

// Lives in the (app) layout, so a toast fired just before a navigation
// (e.g. "Customer deleted" → redirect to the list) survives the route change.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback<ToastFn>((message, tone = "success") => {
    nextId += 1;
    const id = nextId;
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto max-w-sm rounded-lg px-4 py-2.5 text-sm font-medium shadow-[0_10px_30px_-10px_rgba(30,26,10,0.35)]",
              t.tone === "success" ? "bg-foreground text-background" : "bg-danger text-white",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

// Fires a success toast once a useActionState submission finishes without
// an error. Inline error text already covers the failure case.
export function useActionToast(state: { error: string | null }, pending: boolean, message: string) {
  const toast = useToast();
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      return;
    }
    if (wasPending.current) {
      wasPending.current = false;
      if (state.error === null) toast(message);
    }
  }, [pending, state, toast, message]);
}
