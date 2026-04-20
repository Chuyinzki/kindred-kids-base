import { format } from "date-fns";

type Nullable<T> = T | null;

export interface MonthlyReportChild {
  id: string;
  name: string;
  dob: string;
  child_id_number: string;
  family_number: string;
  parent_name: string;
}

export interface MonthlyReportProvider {
  provider_name: string | null;
  provider_number: string | null;
  daycare_name: string | null;
  provider_alt_id?: string | null;
}

export interface MonthlyReportAttendance {
  date: string;
  check_in_am: string | null;
  check_out_am: string | null;
  check_in_pm: string | null;
  check_out_pm: string | null;
  marked_absent: boolean;
  absence_reason: string | null;
}

export interface MonthlyReportDay {
  date: string;
  day_name: string;
  day_number: number;
  in_am: string;
  out_school: string;
  in_school: string;
  out_pm: string;
  hours_of_care: number;
  reason_for_absence: string;
  is_absent: boolean;
}

export interface MonthlyReportWeek {
  week_number: number;
  days: (MonthlyReportDay | null)[];
  total_hours: number;
}

export interface MonthlyReport {
  child: MonthlyReportChild;
  provider: MonthlyReportProvider;
  month: number;
  year: number;
  month_label: string;
  weeks: MonthlyReportWeek[];
  total_month_hours: number;
}

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THR", "FRI", "SAT"] as const;

const parseMillis = (value: Nullable<string>): number | null => {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
};

const formatTime = (value: Nullable<string>): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "h:mm a");
};

const roundHours = (hours: number): number => Math.round(hours * 10) / 10;

export const computeDailyHours = (record: MonthlyReportAttendance | undefined): number => {
  if (!record || record.marked_absent) return 0;

  const inAm = parseMillis(record.check_in_am);
  const outAm = parseMillis(record.check_out_am);
  const inPm = parseMillis(record.check_in_pm);
  const outPm = parseMillis(record.check_out_pm);

  if (inAm === null || outPm === null || outPm <= inAm) return 0;

  if (outAm !== null && inPm !== null && outAm > inAm && outPm > inPm && inPm > outAm) {
    const amHours = (outAm - inAm) / 3_600_000;
    const pmHours = (outPm - inPm) / 3_600_000;
    return roundHours(amHours + pmHours);
  }

  return roundHours((outPm - inAm) / 3_600_000);
};

const buildCalendarWeeks = (year: number, month: number): (Date | null)[][] => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());
  const end = new Date(lastDay);
  end.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const weeks: (Date | null)[][] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const week: (Date | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const sameMonth = cursor.getMonth() === month - 1;
      week.push(sameMonth ? new Date(cursor) : null);
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
};

export const buildMonthlyReport = (input: {
  child: MonthlyReportChild;
  provider: MonthlyReportProvider;
  attendance: MonthlyReportAttendance[];
  month: number;
  year: number;
}): MonthlyReport => {
  const byDate = new Map(input.attendance.map((r) => [r.date, r]));
  const calendarWeeks = buildCalendarWeeks(input.year, input.month);

  const weeks: MonthlyReportWeek[] = calendarWeeks.map((weekDates, idx) => {
    const days = weekDates.map((d) => {
      if (!d) return null;
      const isoDate = format(d, "yyyy-MM-dd");
      const rec = byDate.get(isoDate);
      const hours = computeDailyHours(rec);
      return {
        date: isoDate,
        day_name: DAY_NAMES[d.getDay()],
        day_number: d.getDate(),
        in_am: formatTime(rec?.check_in_am ?? null),
        out_school: formatTime(rec?.check_out_am ?? null),
        in_school: formatTime(rec?.check_in_pm ?? null),
        out_pm: formatTime(rec?.check_out_pm ?? null),
        hours_of_care: hours,
        reason_for_absence: rec?.marked_absent ? (rec.absence_reason || "Absent") : "",
        is_absent: rec?.marked_absent ?? false,
      } satisfies MonthlyReportDay;
    });

    const totalHours = roundHours(
      days.reduce((sum, day) => (day ? sum + day.hours_of_care : sum), 0)
    );

    return {
      week_number: idx + 1,
      days,
      total_hours: totalHours,
    };
  });

  const totalMonthHours = roundHours(weeks.reduce((sum, w) => sum + w.total_hours, 0));

  return {
    child: input.child,
    provider: input.provider,
    month: input.month,
    year: input.year,
    month_label: format(new Date(input.year, input.month - 1, 1), "MMMM yyyy"),
    weeks,
    total_month_hours: totalMonthHours,
  };
};

const esc = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const buildMonthlyReportPrintHtml = (report: MonthlyReport): string => {
  const rows = report.weeks
    .map((week) => {
      const dayRows = week.days
        .map((day) => {
          if (!day) {
            return `
              <tr>
                <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>
            `;
          }

          return `
            <tr>
              <td>${esc(`${day.day_name} ${day.day_number}`)}</td>
              <td>${esc(day.out_school)}</td>
              <td>${esc(day.in_school)}</td>
              <td>${esc(day.in_am)}</td>
              <td>${esc(day.out_pm)}</td>
              <td>${day.hours_of_care.toFixed(1)}</td>
              <td>${esc(day.reason_for_absence)}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <tbody>
          <tr class="week-head"><td colspan="7">WEEK ${week.week_number}</td></tr>
          ${dayRows}
          <tr class="week-total">
            <td colspan="5">Total hours this week</td>
            <td>${week.total_hours.toFixed(1)}</td>
            <td></td>
          </tr>
        </tbody>
      `;
    })
    .join("");

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Child Care Sign-In-Sheet</title>
      <style>
        @page { size: Letter portrait; margin: 12mm; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; }
        .header-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          margin-bottom: 8px;
        }
        .line { border-bottom: 1px solid #222; min-height: 16px; padding: 2px 4px; }
        .label { font-size: 10px; color: #333; margin-bottom: 2px; }
        h1 { font-size: 16px; margin: 0 0 8px 0; }
        .sub { margin-bottom: 8px; font-size: 10px; color: #444; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #222; padding: 4px; vertical-align: middle; }
        th { background: #f2f2f2; }
        .week-head td { background: #e8e8e8; font-weight: bold; text-align: left; }
        .week-total td { font-weight: bold; }
        .footer { margin-top: 10px; }
      </style>
    </head>
    <body>
      <h1>Child Care Sign-In-Sheet</h1>
      <div class="sub">Service Month/Year: ${esc(report.month_label)}</div>

      <div class="header-grid">
        <div><div class="label">Name of Parent</div><div class="line">${esc(report.child.parent_name)}</div></div>
        <div><div class="label">Family #</div><div class="line">${esc(report.child.family_number)}</div></div>
        <div><div class="label">Provider Alt ID</div><div class="line">${esc(report.provider.provider_alt_id || "")}</div></div>

        <div><div class="label">Name of Child</div><div class="line">${esc(report.child.name)}</div></div>
        <div><div class="label">DOB</div><div class="line">${esc(report.child.dob)}</div></div>
        <div><div class="label">Child ID #</div><div class="line">${esc(report.child.child_id_number)}</div></div>

        <div><div class="label">Provider</div><div class="line">${esc(report.provider.provider_name || report.provider.daycare_name || "")}</div></div>
        <div><div class="label">Provider #</div><div class="line">${esc(report.provider.provider_number || "")}</div></div>
        <div><div class="label">Month Total Hours</div><div class="line">${report.total_month_hours.toFixed(1)}</div></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Out (School)</th>
            <th>In (School)</th>
            <th>Time In</th>
            <th>Time Out</th>
            <th>Hours of Care</th>
            <th>Reason for Absence</th>
          </tr>
        </thead>
        ${rows}
      </table>

      <div class="footer">
        Parent's Certification total hours in the month: <strong>${report.total_month_hours.toFixed(1)}</strong>
      </div>
    </body>
  </html>`;
};
