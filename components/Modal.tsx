import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * A native <dialog> opened with showModal(): it traps focus, closes on Escape
 * and hands focus back on its own. A click on the dimmed backdrop closes it too.
 * Focus starts on the title, so a screen reader reads from the top and the
 * close button isn't wearing a focus ring nobody asked for.
 */
export default function Modal({ open, title, closeLabel, onClose, children }: { open: boolean; title: string; closeLabel: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      heading.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="modal"
      // Escape closes the dialog on its own, so the parent is told. A close the parent asked for isn't echoed back:
      // when it switches dialogs, this event comes after the next one opened, and would close that one too.
      onClose={() => {
        if (open) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} ref={heading} tabIndex={-1} className="text-lg font-bold outline-none">
              {title}
            </h2>
            <button type="button" aria-label={closeLabel} onClick={onClose} className="-m-1.5 grid size-9 place-items-center rounded-full hover:bg-[var(--line)]">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
