import { BookOpen, Flame, Languages, Lightbulb, Smartphone, Swords, type LucideIcon } from "lucide-react";
import type { UiStrings } from "@/data/ui";

type Item = keyof UiStrings["news"]["items"];

/** A picture for each piece of news. Typed by the news in data/ui.ts, so a new item can't go without one. */
const ICONS: Record<Item, LucideIcon> = {
  mix: Languages,
  challenge: Swords,
  hint: Lightbulb,
  meaning: BookOpen,
  streak: Flame,
  transfer: Smartphone,
};

/** The pictures sit on tiles in the game's own colors, in the order the logo has them */
const TILES = ["var(--correct)", "var(--present)", "var(--absent)"];

/** What's new, in the order data/ui.ts tells it */
export default function NewsPanel({ ui, onClose }: { ui: UiStrings; onClose: () => void }) {
  const items = ui.news.items;
  return (
    <div>
      <ul className="space-y-4">
        {(Object.keys(items) as Item[]).map((key, i) => {
          const Icon = ICONS[key];
          return (
            <li key={key} className="flex gap-3">
              <span aria-hidden className="grid size-9 flex-none place-items-center rounded-md text-white" style={{ background: TILES[i % TILES.length] }}>
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-semibold">{items[key].title}</p>
                <p className="text-sm text-[var(--muted)]">{items[key].text}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={onClose} className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-[var(--correct)] font-bold text-white">
        {ui.news.done}
      </button>
    </div>
  );
}
