import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260627010000_fix_kiosk_local_attendance_date.sql"),
  "utf8"
);

const getFunctionSql = (functionName: string) => {
  const match = migrationSql.match(
    new RegExp(`CREATE OR REPLACE FUNCTION public\\.${functionName}[\\s\\S]*?END;\\s*\\$\\$;`)
  );

  if (!match) throw new Error(`Could not find ${functionName} in kiosk local date migration`);
  return match[0];
};

describe("kiosk local date migration", () => {
  it("loads child state using the Pacific attendance date instead of the database date", () => {
    const functionSql = getFunctionSql("kiosk_get_child_state");

    expect(functionSql).toContain("attendance_date DATE := (now() AT TIME ZONE 'America/Los_Angeles')::DATE;");
    expect(functionSql).toContain("AND a.date = attendance_date");
    expect(functionSql).not.toContain("AND a.date = CURRENT_DATE");
  });

  it("records attendance against the same Pacific date used for the timestamp", () => {
    const functionSql = getFunctionSql("kiosk_record_attendance");

    expect(functionSql).toContain("now_ts TIMESTAMPTZ := now();");
    expect(functionSql).toContain("attendance_date DATE := (now_ts AT TIME ZONE 'America/Los_Angeles')::DATE;");
    expect(functionSql).toContain("AND a.date = attendance_date");
    expect(functionSql).toContain("VALUES (child_uuid, attendance_date)");
    expect(functionSql).not.toContain("CURRENT_DATE");
  });
});
