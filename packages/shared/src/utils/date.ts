import { addDays, startOfDay, endOfDay, startOfMonth, endOfMonth, format } from 'date-fns';

export function toISOString(date: Date): string {
  return date.toISOString();
}

export function parseDateRange(
  fromStr: string,
  toStr: string
): { start: Date; end: Date } | null {
  const from = new Date(fromStr);
  const to = new Date(toStr);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return null;
  }

  return { start: startOfDay(from), end: endOfDay(to) };
}

export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfDay(now),
  };
}

export function getPreviousPeriod(start: Date, end: Date): { start: Date; end: Date } {
  const duration = end.getTime() - start.getTime();
  const previousStart = new Date(start.getTime() - duration - 1);
  const previousEnd = new Date(start.getTime() - 1);
  return { start: previousStart, end: previousEnd };
}

export function calculatePercentageChange(previous: number, current: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

export function formatDateRange(start: Date, end: Date): string {
  return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
}

export function groupDatesByDay(
  start: Date,
  end: Date
): Array<{ date: Date; label: string }> {
  const days: Array<{ date: Date; label: string }> = [];
  let current = startOfDay(start);
  const last = endOfDay(end);

  while (current <= last) {
    days.push({
      date: current,
      label: format(current, 'MMM dd'),
    });
    current = addDays(current, 1);
  }

  return days;
}


