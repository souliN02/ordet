import type { UiStrings } from "@/data/ui";
import { Tile } from "./Board";

export default function HelpPanel({ ui }: { ui: UiStrings }) {
  const help = ui.help;
  return (
    <div className="space-y-5 text-[15px] leading-relaxed">
      <div>
        <p className="text-lg font-semibold">{help.intro}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {help.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        {help.examples.map((example) => (
          <figure key={example.word}>
            <div aria-hidden className="flex gap-1">
              {[...example.word].map((letter, i) => (
                <Tile key={i} letter={letter} mark={i === example.index ? example.mark : null} className="tile-sm" />
              ))}
            </div>
            <figcaption className="mt-1.5 text-sm">{example.text}</figcaption>
          </figure>
        ))}
      </div>

      <dl className="space-y-2 border-t border-[var(--line)] pt-4">
        {help.modes.map((mode) => (
          <div key={mode.name}>
            <dt className="font-bold">{mode.name}</dt>
            <dd>{mode.text}</dd>
          </div>
        ))}
      </dl>

      <p className="text-sm text-[var(--muted)]">{help.languages}</p>
    </div>
  );
}
