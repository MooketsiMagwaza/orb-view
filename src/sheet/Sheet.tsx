import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  /** Small line above the title. */
  eyebrow: string;
  title: string;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
};

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A bottom sheet over the network: dims what is behind, traps focus, and closes on the scrim, the close
 * control, or Escape (handled by the app so nested layers close in order).
 */
export function Sheet({ eyebrow, title, titleId, onClose, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  const trapTab = (event: React.KeyboardEvent) => {
    if (event.key !== "Tab" || !ref.current) return;
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="sheet-root">
      <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />
      <section ref={ref} className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={trapTab}>
        <div className="sheet__grab" aria-hidden="true" />
        <header className="sheet__header">
          <div>
            <p className="sheet__eyebrow">{eyebrow}</p>
            <h2 id={titleId} className="sheet__title">{title}</h2>
          </div>
          <button ref={closeRef} type="button" className="sheet__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
          </button>
        </header>
        <div className="sheet__body">{children}</div>
      </section>
    </div>
  );
}
