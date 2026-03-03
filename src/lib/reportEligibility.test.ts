import { describe, expect, it } from "vitest";
import {
  buildChildMonthlyEligibility,
  filterMeaningfulRecords,
  hasInvalidMeaningfulRecord,
} from "./reportEligibility";

type Child = { id: string; name: string };
type Record = {
  child_id: string;
  check_in_am: string | null;
  check_out_am: string | null;
  check_in_pm: string | null;
  check_out_pm: string | null;
  marked_absent: boolean;
};

const rec = (child_id: string, partial?: Partial<Record>): Record => ({
  child_id,
  check_in_am: "2026-03-01T08:00:00.000Z",
  check_out_am: null,
  check_in_pm: null,
  check_out_pm: "2026-03-01T16:00:00.000Z",
  marked_absent: false,
  ...partial,
});

describe("reportEligibility", () => {
  it("filters empty non-absent rows out", () => {
    const rows = [
      rec("c1"),
      rec("c1", {
        check_in_am: null,
        check_out_am: null,
        check_in_pm: null,
        check_out_pm: null,
      }),
    ];
    const result = filterMeaningfulRecords(rows);
    expect(result).toHaveLength(1);
  });

  it("detects invalid meaningful rows", () => {
    const invalid = rec("c1", { check_out_pm: "2026-03-01T07:00:00.000Z" });
    expect(hasInvalidMeaningfulRecord([invalid])).toBe(true);
  });

  it("builds per-child eligibility with reasons", () => {
    const children: Child[] = [
      { id: "c1", name: "A" },
      { id: "c2", name: "B" },
      { id: "c3", name: "C" },
    ];

    const grouped = new Map<string, Record[]>();
    grouped.set("c1", [rec("c1")]);
    grouped.set("c2", [rec("c2", { check_out_pm: "2026-03-01T07:00:00.000Z" })]);
    grouped.set("c3", [
      rec("c3", {
        check_in_am: null,
        check_out_am: null,
        check_in_pm: null,
        check_out_pm: null,
      }),
    ]);

    const eligibility = buildChildMonthlyEligibility(children, grouped);
    expect(eligibility.find((e) => e.child.id === "c1")?.reason).toBeNull();
    expect(eligibility.find((e) => e.child.id === "c2")?.reason).toContain("Invalid");
    expect(eligibility.find((e) => e.child.id === "c3")?.reason).toContain("No entries");
  });
});
