import { describe, expect, it } from "vitest";
import { buildMonthlyReport, computeDailyHours } from "./monthlyReport";

describe("computeDailyHours", () => {
  it("computes school split hours when out/in school pair exists", () => {
    const hours = computeDailyHours({
      date: "2026-02-03",
      check_in_am: "2026-02-03T08:00:00.000Z",
      check_out_am: "2026-02-03T11:00:00.000Z",
      check_in_pm: "2026-02-03T13:00:00.000Z",
      check_out_pm: "2026-02-03T17:00:00.000Z",
      marked_absent: false,
      absence_reason: null,
    });
    expect(hours).toBe(7);
  });

  it("computes continuous care when school split pair missing", () => {
    const hours = computeDailyHours({
      date: "2026-02-04",
      check_in_am: "2026-02-04T08:30:00.000Z",
      check_out_am: null,
      check_in_pm: null,
      check_out_pm: "2026-02-04T16:00:00.000Z",
      marked_absent: false,
      absence_reason: null,
    });
    expect(hours).toBe(7.5);
  });

  it("returns zero for absent records", () => {
    const hours = computeDailyHours({
      date: "2026-02-05",
      check_in_am: "2026-02-05T08:00:00.000Z",
      check_out_am: "2026-02-05T11:00:00.000Z",
      check_in_pm: "2026-02-05T13:00:00.000Z",
      check_out_pm: "2026-02-05T17:00:00.000Z",
      marked_absent: true,
      absence_reason: "Sick",
    });
    expect(hours).toBe(0);
  });
});

describe("buildMonthlyReport", () => {
  it("computes weekly and monthly totals", () => {
    const report = buildMonthlyReport({
      child: {
        id: "c1",
        name: "Jane",
        dob: "2020-01-01",
        child_id_number: "CH-10",
        family_number: "F-1",
        parent_name: "Parent",
      },
      provider: {
        provider_name: "Provider",
        provider_number: "123",
        daycare_name: "Daycare",
        provider_alt_id: null,
      },
      month: 2,
      year: 2026,
      attendance: [
        {
          date: "2026-02-02",
          check_in_am: "2026-02-02T08:00:00.000Z",
          check_out_am: null,
          check_in_pm: null,
          check_out_pm: "2026-02-02T16:00:00.000Z",
          marked_absent: false,
          absence_reason: null,
        },
        {
          date: "2026-02-03",
          check_in_am: "2026-02-03T08:00:00.000Z",
          check_out_am: null,
          check_in_pm: null,
          check_out_pm: "2026-02-03T16:00:00.000Z",
          marked_absent: false,
          absence_reason: null,
        },
      ],
    });

    expect(report.total_month_hours).toBe(16);
    expect(report.weeks.length).toBeGreaterThan(0);
    expect(report.weeks.some((w) => w.total_hours > 0)).toBe(true);
  });
});
