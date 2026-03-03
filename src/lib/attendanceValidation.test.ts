import { describe, expect, it } from "vitest";
import { hasMeaningfulAttendanceEntry, validateAttendanceTimes } from "./attendanceValidation";

describe("attendanceValidation", () => {
  it("accepts a complete in/out record", () => {
    const result = validateAttendanceTimes({
      check_in_am: "2026-03-01T08:00:00.000Z",
      check_out_am: null,
      check_in_pm: null,
      check_out_pm: "2026-03-01T16:00:00.000Z",
    });
    expect(result.hasError).toBe(false);
  });

  it("rejects out-of-order times", () => {
    const result = validateAttendanceTimes({
      check_in_am: "2026-03-01T10:00:00.000Z",
      check_out_am: null,
      check_in_pm: null,
      check_out_pm: "2026-03-01T09:30:00.000Z",
    });
    expect(result.hasError).toBe(true);
    expect(result.message).toContain("out of order");
  });

  it("requires both school out/in fields together", () => {
    const result = validateAttendanceTimes({
      check_in_am: "2026-03-01T08:00:00.000Z",
      check_out_am: "2026-03-01T11:00:00.000Z",
      check_in_pm: null,
      check_out_pm: "2026-03-01T15:00:00.000Z",
    });
    expect(result.hasError).toBe(true);
  });

  it("treats marked absent as meaningful even with empty times", () => {
    const meaningful = hasMeaningfulAttendanceEntry(
      { check_in_am: null, check_out_am: null, check_in_pm: null, check_out_pm: null },
      true
    );
    expect(meaningful).toBe(true);
  });

  it("treats empty non-absent rows as not meaningful", () => {
    const meaningful = hasMeaningfulAttendanceEntry(
      { check_in_am: null, check_out_am: null, check_in_pm: null, check_out_pm: null },
      false
    );
    expect(meaningful).toBe(false);
  });
});
