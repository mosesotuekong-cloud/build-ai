// Schedules from the team's plain words ("every weekday at 8am"), for the
// platforms that need a real timetable. Defaults to every weekday at 9am.

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// A recurrence from the team's plain words. Defaults to every weekday at 9am.
export function recurrenceFrom(text: string | null) {
  const t = (text ?? "").toLowerCase();
  const hourMatch = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  let hour = hourMatch ? Number(hourMatch[1]) % 24 : 9;
  if (hourMatch?.[3] === "pm" && hour < 12) hour += 12;
  const tz = "GMT Standard Time";
  if (/every\s+(\d+\s+)?minutes?|every\s+\d+\s*min/.test(t)) {
    const n = Number(t.match(/every\s+(\d+)/)?.[1] ?? 15);
    return { frequency: "Minute", interval: n };
  }
  if (/hour/.test(t)) return { frequency: "Hour", interval: Number(t.match(/every\s+(\d+)/)?.[1] ?? 1) };
  if (/month/.test(t)) return { frequency: "Month", interval: 1, timeZone: tz, schedule: { hours: [String(hour)], minutes: [0] } };
  if (/week(ly)?\b(?!day)/.test(t) && !/weekday/.test(t)) return { frequency: "Week", interval: 1, timeZone: tz, schedule: { weekDays: ["Monday"], hours: [String(hour)], minutes: [0] } };
  if (/every day|daily/.test(t)) return { frequency: "Day", interval: 1, timeZone: tz, schedule: { hours: [String(hour)], minutes: [0] } };
  return { frequency: "Week", interval: 1, timeZone: tz, schedule: { weekDays: WEEKDAYS, hours: [String(hour)], minutes: [0] } };
}


// The same schedule as a Quartz cron expression (Databricks jobs).
export function quartzFrom(text: string | null): string {
  const r = recurrenceFrom(text);
  const hour = "schedule" in r && r.schedule ? r.schedule.hours[0] : "9";
  if (r.frequency === "Minute") return `0 0/${r.interval} * * * ?`;
  if (r.frequency === "Hour") return `0 0 0/${r.interval} * * ?`;
  if (r.frequency === "Day") return `0 0 ${hour} * * ?`;
  if (r.frequency === "Month") return `0 0 ${hour} 1 * ?`;
  const days = ("schedule" in r && r.schedule && "weekDays" in r.schedule ? r.schedule.weekDays : undefined) ?? ["Monday"];
  return `0 0 ${hour} ? * ${days.length === 5 ? "MON-FRI" : days.map((d) => d.slice(0, 3).toUpperCase()).join(",")}`;
}
