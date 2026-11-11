"use client";

import { useEffect, useRef } from "react";

/** One celebration: a new `id` throws again, and `colors` are what the paper is cut from */
export type Burst = { id: number; colors: string[] };

const DURATION_MS = 2_800;
const FADE_MS = 600;

type Piece = { x: number; y: number; vx: number; vy: number; width: number; height: number; turn: number; spin: number; flip: number; flutter: number; color: string };

/**
 * Paper thrown up from the two lower corners, over everything for a moment. The canvas takes no
 * clicks and isn't there for screen readers, and the game never asks for it under reduced motion.
 */
export default function Confetti({ burst }: { burst: Burst | null }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!burst || !canvas || !ctx) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);

    // Speeds follow the window, so the throw has the same arc on a phone and on a wide screen
    const gravity = height * 1.7;
    const pieces: Piece[] = Array.from({ length: Math.round(Math.min(170, Math.max(70, width / 5))) }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const reach = width * (0.12 + Math.random() * 0.7);
      return {
        x: fromLeft ? -10 : width + 10,
        y: height * (0.72 + Math.random() * 0.12),
        vx: fromLeft ? reach : -reach,
        vy: -height * (0.75 + Math.random() * 0.75),
        width: 6 + Math.random() * 5,
        height: 9 + Math.random() * 7,
        turn: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 10,
        flip: Math.random() * Math.PI * 2,
        flutter: 5 + Math.random() * 7,
        color: burst.colors[i % burst.colors.length] ?? "#888",
      };
    });

    const start = performance.now();
    let last = start;
    let frame = 0;
    const draw = (now: number) => {
      const elapsed = now - start;
      // A tab that was in the background comes back with one long frame: it's capped, not played out at once
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, width, height);
      if (elapsed >= DURATION_MS) {
        canvas.width = 0;
        canvas.height = 0;
        return;
      }
      ctx.globalAlpha = Math.min(1, (DURATION_MS - elapsed) / FADE_MS);
      for (const piece of pieces) {
        piece.vy += gravity * dt;
        piece.vx *= 1 - 1.2 * dt;
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
        piece.turn += piece.spin * dt;
        piece.flip += piece.flutter * dt;
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.turn);
        // A piece of paper tumbling: its width narrows to an edge and opens again
        const across = piece.width * Math.cos(piece.flip);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-across / 2, -piece.height / 2, across, piece.height);
        ctx.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [burst]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-30 h-full w-full" />;
}
