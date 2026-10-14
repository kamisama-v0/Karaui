"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookingCalendar,
  type BookingSummary,
} from "@/components/motion/booking-calendar";

/** Deterministic nightly rate: weekend premium plus a stable per-date wobble. */
function nightlyPrice(d: Date) {
  const day = d.getDay();
  const weekend = day === 5 || day === 6 ? 45 : 0;
  const wobble = (d.getDate() * 37 + (d.getMonth() + 1) * 11) % 29;
  return 108 + weekend + wobble;
}

/** Taken nights, as [month offset, day] pairs from the first month shown. */
const TAKEN: [number, number][] = [
  [0, 22],
  [0, 23],
  [0, 24],
  [1, 4],
  [1, 5],
  [1, 13],
  [1, 14],
  [1, 15],
  [1, 16],
];

export function BookingCalendarPreview() {
  // "Today" is read after mount so the server and client markup match.
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    const now = new Date();
    setToday(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);
  const [reserved, setReserved] = useState<BookingSummary | null>(null);

  const booked = useMemo(
    () =>
      today
        ? TAKEN.map(
            ([m, d]) => new Date(today.getFullYear(), today.getMonth() + m, d),
          )
        : [],
    [today],
  );

  return (
    <div className="flex min-h-[440px] items-center justify-center">
      {today && (
        <BookingCalendar
          prices={nightlyPrice}
          booked={booked}
          minNights={2}
          minDate={today}
          defaultMonth={today}
          onReserve={setReserved}
          onValueChange={() => setReserved(null)}
          reserveLabel={reserved ? "Reserved" : "Reserve"}
        />
      )}
    </div>
  );
}
