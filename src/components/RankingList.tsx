"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatYears } from "@/lib/years";
import type { RatedAesthetic } from "@/hooks/useSession";

interface Props {
  items: RatedAesthetic[];
  showPosition?: boolean;
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function RankingList({ items, showPosition = true }: Props) {
  return (
    <ol className="space-y-2">
      {items.map((item, idx) => {
        const pos = idx + 1;
        return (
          <li key={item.id}>
            <Link
              href={`/aesthetics/${item.slug}`}
              className="flex items-center gap-3 rounded-xl p-3 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors"
            >
              {/* Position */}
              {showPosition && (
                <span className="text-lg w-8 text-center flex-shrink-0 font-mono text-white/40">
                  {MEDAL[pos] ?? pos}
                </span>
              )}

              {/* Thumbnail */}
              <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-800">
                {item.cover_image_url ? (
                  <Image
                    src={item.cover_image_url}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-neutral-600 text-xs">
                    ?
                  </div>
                )}
              </div>

              {/* Name + badges */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {item.name}
                </p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {(() => {
                    const years = formatYears(item);
                    return years ? (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-white/10 text-white/50 border-0 py-0"
                      >
                        {years}
                      </Badge>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Rank badge */}
              <div className="flex-shrink-0">
                <span className="text-white/25 font-mono text-xs">#{item.rank}</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
