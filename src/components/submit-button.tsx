"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/**
 * Tombol submit yang otomatis menampilkan status loading selama Server Action
 * berjalan (memakai `useFormStatus`). Harus berada di dalam elemen <form>.
 */
export function SubmitButton({
  children,
  pendingText = "Memproses…",
  className = "btn btn-primary w-full",
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
