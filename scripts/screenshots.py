"""
Makes the README's screenshots and gameplay GIF in docs/ from a running Ordet.

    pnpm build && pnpm start           # in another terminal
    pip install playwright pillow
    python scripts/screenshots.py      # --url and --out to change where

It drives the installed Microsoft Edge through Playwright, so there's no browser to
download. The games are made up and put straight into the saved state, so the
pictures never show a real daily word.
"""

import argparse
import datetime
import io
import json
import time
from pathlib import Path

from PIL import Image
from playwright.sync_api import Browser, Page, sync_playwright

FIRST_DAY = datetime.date(2026, 11, 2)  # puzzle #1, as in lib/daily.ts
PHONE = {"viewport": {"width": 390, "height": 844}, "device_scale_factor": 2, "is_mobile": True, "has_touch": True}


def today() -> int:
    return (datetime.date.today() - FIRST_DAY).days + 1


def game(solution: str, guesses: list[str], day: int | None = None) -> dict:
    return {"solution": solution, "guesses": guesses, "hard": False, "day": day}


def saved(mode: str, games: dict, stats: dict | None = None, theme: str | None = None) -> dict:
    return {"settings": {"mode": mode, "hard": False, "theme": theme, "contrast": False}, "games": games, "stats": stats or {}, "recent": {}}


def open_game(browser: Browser, url: str, state: dict, lang: str, **context) -> Page:
    """A fresh browser where the player has been before, with `state` as their saved game"""
    ctx = browser.new_context(**{**PHONE, **context})
    ctx.add_init_script(f"localStorage.setItem('ordet_v1', {json.dumps(json.dumps(state))}); localStorage.setItem('ordet_lang', '{lang}');")
    page = ctx.new_page()
    page.goto(url)
    page.wait_for_selector(".tile[data-mark]")
    page.wait_for_timeout(600)
    return page


def row_tile(page: Page, row: int, tile: int):
    return page.locator(".board-row").nth(row).locator(".tile").nth(tile)


def record(page: Page, frames: list, ms: int, clip: dict) -> None:
    """Screenshots as fast as the browser gives them, with the time each was taken"""
    end = time.perf_counter() + ms / 1000
    while time.perf_counter() < end:
        frames.append((time.perf_counter(), page.screenshot(clip=clip)))


def write_gif(frames: list, path: Path, hold_ms: int) -> None:
    images, durations = [], []
    for i, (at, png) in enumerate(frames):
        image = Image.open(io.BytesIO(png)).convert("RGB")
        next_at = frames[i + 1][0] if i + 1 < len(frames) else at + hold_ms / 1000
        duration = max(20, round((next_at - at) * 1000))
        # Identical frames (nothing moving) become one longer frame
        if images and image.tobytes() == images[-1].tobytes():
            durations[-1] += duration
            continue
        images.append(image)
        durations.append(duration)
    durations[-1] = max(durations[-1], hold_ms)
    palette = [im.quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for im in images]
    palette[0].save(path, save_all=True, append_images=palette[1:], duration=durations, loop=0, optimize=True, disposal=1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:3000/")
    parser.add_argument("--out", type=Path, default=Path("docs"))
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    day = today()

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge")

        # 1. English Daily, light, mid-game: known letters placed first, the cursor on the gap
        page = open_game(browser, args.url, saved("daily", {"en-daily": game("flame", ["audio", "stare", "plane"], day)}), "en", locale="en-US", color_scheme="light")
        row_tile(page, 3, 2).click()
        page.keyboard.press("a")
        row_tile(page, 3, 4).click()
        page.keyboard.press("e")
        page.keyboard.press("f")
        page.wait_for_timeout(300)
        page.screenshot(path=args.out / "daily.png")

        # 2. Danish Unlimited, dark, won in three, with Æ, Ø and Å on the keyboard
        page = open_game(browser, args.url, saved("unlimited", {"da-unlimited": game("fløde", ["skole", "bølge", "fløde"])}, theme="dark"), "da", locale="da-DK", color_scheme="dark")
        page.screenshot(path=args.out / "danish-dark.png")

        # 3. The statistics after a daily win
        stats = {"en-daily": {"played": 23, "wins": 21, "streak": 6, "best": 9, "guesses": [0, 2, 7, 8, 3, 1], "lastDay": day}}
        page = open_game(
            browser, args.url, saved("daily", {"en-daily": game("flame", ["audio", "stare", "plane", "flame"], day)}, stats), "en", locale="en-US", color_scheme="light"
        )
        page.get_by_role("button", name="Statistics", exact=True).click()
        page.wait_for_timeout(500)
        page.screenshot(path=args.out / "stats.png")

        # 4. The GIF: place the greens from the first guess, fill the gaps, flip, win
        page = open_game(
            browser,
            args.url,
            saved("unlimited", {"en-unlimited": game("grape", ["crane"])}),
            "en",
            locale="en-US",
            color_scheme="light",
            viewport={"width": 390, "height": 760},
            device_scale_factor=1,
        )
        clip = {"x": 0, "y": 0, "width": 390, "height": 760}
        frames: list = []
        record(page, frames, 700, clip)
        steps = [("click", 1), ("key", "r"), ("key", "a"), ("click", 4), ("key", "e"), ("key", "g"), ("key", "p")]
        for kind, value in steps:
            if kind == "click":
                row_tile(page, 1, value).click()
            else:
                page.keyboard.press(value)
            record(page, frames, 320, clip)
        page.keyboard.press("Enter")
        record(page, frames, 4200, clip)
        write_gif(frames, args.out / "demo.gif", hold_ms=2500)

        browser.close()

    for path in sorted(args.out.iterdir()):
        print(f"{path}  {path.stat().st_size // 1024} kB")


if __name__ == "__main__":
    main()
