import Game from "@/components/Game";

export default function Page() {
  return (
    <>
      <Game />
      <noscript>
        <p className="fixed inset-x-0 bottom-0 bg-[var(--toast)] p-4 text-center text-[var(--toast-fg)]">Ordet needs JavaScript. / Ordet kræver JavaScript.</p>
      </noscript>
    </>
  );
}
