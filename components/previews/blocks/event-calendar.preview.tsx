"use client";

import { useEffect, useState } from "react";
import {
  type CalendarEvent,
  EventCalendar,
} from "@/components/motion/event-calendar";

/** Team schedule laid out relative to `anchor` (today, read after mount). */
function buildEvents(anchor: Date): CalendarEvent[] {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const d = anchor.getDate();
  const at = (day: number, h: number, min = 0) => new Date(y, m, d + day, h, min);
  const allDay = (day: number, days: number) => ({
    start: new Date(y, m, d + day),
    end: new Date(y, m, d + day + days),
    allDay: true,
  });
  return [
    { id: "standup", title: "Team standup", start: at(0, 9, 30), end: at(0, 9, 45), color: 1 },
    { id: "design", title: "Design review", start: at(0, 11), end: at(0, 12), color: 2 },
    { id: "pairing", title: "Pairing: billing", start: at(0, 11, 30), end: at(0, 13), color: 3 },
    { id: "lunch", title: "Lunch & learn", start: at(0, 12, 30), end: at(0, 13, 30), color: 4 },
    { id: "offsite", title: "Product offsite", ...allDay(1, 3), color: 5 },
    { id: "one-on-one", title: "1:1 with Maya", start: at(1, 14), end: at(1, 14, 30), color: 1 },
    { id: "planning", title: "Sprint planning", start: at(-2, 10), end: at(-2, 11, 30), color: 2 },
    { id: "retro", title: "Retro", start: at(-2, 15), end: at(-2, 16), color: 3 },
    { id: "launch", title: "v2.4 launch", ...allDay(6, 1), color: 4 },
    { id: "interview", title: "Interview: frontend", start: at(-1, 13), end: at(-1, 14), color: 5 },
    { id: "demo", title: "Customer demo", start: at(8, 16), end: at(8, 17), color: 1 },
    { id: "pto", title: "Leo PTO", ...allDay(-6, 2), color: 3 },
    { id: "security", title: "Security sync", start: at(1, 9), end: at(1, 10), color: 2 },
    { id: "hiring", title: "Hiring sync", start: at(1, 16), end: at(1, 16, 45), color: 3 },
  ];
}

export function EventCalendarPreview() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  // Dates come from the viewer's clock, so they are built after mount.
  useEffect(() => {
    const now = new Date();
    setEvents(
      buildEvents(new Date(now.getFullYear(), now.getMonth(), now.getDate())),
    );
  }, []);

  return (
    <div className="flex w-full justify-center">
      <EventCalendar
        className="max-w-[640px]"
        events={events}
        height={496}
        weekStartsOn={1}
        onEventChange={(event, next) =>
          setEvents((list) =>
            list.map((e) => (e.id === event.id ? { ...e, ...next } : e)),
          )
        }
      />
    </div>
  );
}
