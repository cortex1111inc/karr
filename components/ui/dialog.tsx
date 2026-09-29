"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// Full-screen sheet on phones, centered card from `sm` up.
const DIALOG_CLASS =
  "m-0 h-dvh max-h-dvh w-full max-w-full overflow-y-auto border-0 bg-surface p-0 text-foreground backdrop:bg-black/30 sm:m-auto sm:h-auto sm:max-h-[90dvh] sm:max-w-md sm:rounded-xl sm:border sm:border-border sm:shadow-[0_30px_70px_-24px_rgba(30,26,10,0.24)]";

type ActionState = { error: string | null };

// Trigger button + native <dialog> + form, with the submit/close/reset/toast
// bookkeeping every create/record dialog in the app needs.
export function FormDialog({
  triggerLabel,
  triggerVariant = "accent",
  title,
  description,
  action,
  submitLabel,
  pendingLabel = "Saving…",
  successMessage,
  children,
}: {
  triggerLabel: string;
  triggerVariant?: "primary" | "accent" | "ghost" | "danger";
  title: string;
  description?: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingLabel?: string;
  successMessage?: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);
  const toast = useToast();
  const [state, formAction, pending] = useActionState(action, { error: null });

  useEffect(() => {
    if (!submittedRef.current || pending) return;
    submittedRef.current = false;
    if (state.error === null) {
      formRef.current?.reset();
      dialogRef.current?.close();
      if (successMessage) toast(successMessage);
    }
  }, [state, pending, successMessage, toast]);

  return (
    <>
      <Button variant={triggerVariant} size="sm" onClick={() => dialogRef.current?.showModal()}>
        {triggerLabel}
      </Button>
      <dialog ref={dialogRef} className={DIALOG_CLASS} aria-labelledby={`${title}-title`}>
        <form
          ref={formRef}
          action={formAction}
          onSubmit={() => {
            submittedRef.current = true;
          }}
          className="flex min-h-full flex-col gap-4 p-6 sm:min-h-0"
        >
          <div>
            <h2 id={`${title}-title`} className="font-display text-base font-bold">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>

          {children}

          {state.error ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : null}

          <div className="mt-auto flex justify-end gap-2 pt-1 sm:mt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" size="sm" disabled={pending}>
              {pending ? pendingLabel : submitLabel}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

// Replaces window.confirm(): a styled confirmation that runs `onConfirm`
// in a transition and toasts on completion.
export function ConfirmButton({
  label,
  pendingLabel,
  title,
  body,
  confirmLabel,
  variant = "danger",
  size = "sm",
  successMessage,
  onConfirm,
  className,
}: {
  label: string;
  pendingLabel: string;
  title: string;
  body: string;
  confirmLabel: string;
  variant?: "primary" | "accent" | "ghost" | "danger";
  size?: "sm" | "md";
  successMessage?: string;
  onConfirm: () => Promise<unknown>;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <>
      <Button variant={variant} size={size} disabled={isPending} className={className} onClick={() => dialogRef.current?.showModal()}>
        {isPending ? pendingLabel : label}
      </Button>
      <dialog ref={dialogRef} className={cn(DIALOG_CLASS, "h-auto self-end rounded-t-2xl sm:self-auto")}>
        <div className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="font-display text-base font-bold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={variant === "danger" ? "danger" : "accent"}
              size="sm"
              onClick={() => {
                dialogRef.current?.close();
                startTransition(async () => {
                  await onConfirm();
                  if (successMessage) toast(successMessage);
                });
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
