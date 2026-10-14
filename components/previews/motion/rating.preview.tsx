"use client";

import { useState } from "react";
import { Rating } from "@/components/motion/rating";

const LABELS = ["Not rated", "Poor", "Fair", "Good", "Great", "Excellent"];

export function RatingPreview() {
  const [full, setFull] = useState(4);
  const [half, setHalf] = useState(3.5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted-foreground">Your rating</p>
        <div className="flex items-center gap-3">
          <Rating
            value={full}
            onChange={setFull}
            aria-label="Your rating"
            size={28}
          />
          <span className="w-20 text-sm text-foreground">
            {LABELS[Math.ceil(full)]}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted-foreground">Half precision</p>
        <div className="flex items-center gap-3">
          <Rating
            value={half}
            onChange={setHalf}
            precision={0.5}
            aria-label="Half-star rating"
            size={28}
          />
          <span className="w-10 text-sm tabular-nums text-foreground">
            {half.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted-foreground">Read-only</p>
        <div className="flex items-center gap-2">
          <Rating value={4.5} precision={0.5} readOnly size={18} />
          <span className="text-sm text-muted-foreground">4.5 · 1,284 reviews</span>
        </div>
      </div>
    </div>
  );
}
