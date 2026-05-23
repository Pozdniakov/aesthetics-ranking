"use client";

import { Check } from "lucide-react";

interface Props {
  currentStage: 1 | 2;
  /** Stage 1 progress — items swiped so far, of total. */
  stage1: { done: number; total: number };
  /** Stage 2 progress — comparisons made, of estimated total. */
  stage2: { done: number; estimate: number };
}

/**
 * Two-stage progress indicator shown above the compare flow.
 *
 *   ┌──────────────────┐ ┌──────────────────┐
 *   │ 1 · Discover  ✓  │ │ 2 · Rank top 5   │
 *   │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │ │ ▓▓▓▓░░░░░░░░░░░  │
 *   └──────────────────┘ └──────────────────┘
 *
 * The active stage is bright, the completed stage gets a check + green tint,
 * pending stages are dimmed.
 */
export function StageIndicator({ currentStage, stage1, stage2 }: Props) {
  const stage1Done = currentStage > 1;
  const stage1Pct = stage1Done
    ? 100
    : (stage1.done / Math.max(stage1.total, 1)) * 100;
  const stage2Pct =
    currentStage === 2
      ? (stage2.done / Math.max(stage2.estimate, 1)) * 100
      : 0;

  return (
    <div className="flex items-stretch gap-3 w-full">
      <Stage
        index={1}
        label="Discover"
        active={currentStage === 1}
        completed={stage1Done}
        progress={stage1Pct}
        meta={stage1Done ? "done" : `${stage1.done} / ${stage1.total}`}
      />
      <Stage
        index={2}
        label="Rank top 5"
        active={currentStage === 2}
        completed={false}
        progress={stage2Pct}
        meta={
          currentStage === 2
            ? `${stage2.done} / ~${Math.max(stage2.estimate, stage2.done)}`
            : "pending"
        }
      />
    </div>
  );
}

interface StageProps {
  index: number;
  label: string;
  active: boolean;
  completed: boolean;
  progress: number;
  meta: string;
}

function Stage({
  index,
  label,
  active,
  completed,
  progress,
  meta,
}: StageProps) {
  const labelColor = active
    ? "text-white/80"
    : completed
      ? "text-emerald-300/80"
      : "text-white/30";
  const metaColor = active
    ? "text-white/50"
    : completed
      ? "text-emerald-300/60"
      : "text-white/20";
  const trackBg = active || completed ? "bg-white/10" : "bg-white/5";
  const fillBg = active
    ? "bg-white/70"
    : completed
      ? "bg-emerald-400/70"
      : "bg-white/20";

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`text-[10px] sm:text-xs uppercase tracking-[0.18em] flex items-center gap-1.5 truncate ${labelColor}`}
        >
          {completed ? (
            <Check className="w-3 h-3 flex-shrink-0" strokeWidth={2.5} />
          ) : (
            <span className="font-mono tabular-nums">{index}</span>
          )}
          <span className="text-white/30">·</span>
          <span className="truncate">{label}</span>
        </span>
        <span
          className={`text-[10px] font-mono tabular-nums flex-shrink-0 ${metaColor}`}
        >
          {meta}
        </span>
      </div>
      <div className={`h-[2px] rounded-full overflow-hidden ${trackBg}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${fillBg}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
