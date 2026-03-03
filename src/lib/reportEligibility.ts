import { hasMeaningfulAttendanceEntry, validateAttendanceTimes } from "./attendanceValidation";

export interface EligibilityChild {
  id: string;
}

export interface EligibilityRecord {
  child_id: string;
  check_in_am: string | null;
  check_out_am: string | null;
  check_in_pm: string | null;
  check_out_pm: string | null;
  marked_absent: boolean;
}

export interface ChildEligibility<TChild, TRecord> {
  child: TChild;
  reason: string | null;
  records: TRecord[];
}

export const filterMeaningfulRecords = <TRecord extends EligibilityRecord>(records: TRecord[]): TRecord[] =>
  records.filter((r) =>
    hasMeaningfulAttendanceEntry(
      {
        check_in_am: r.check_in_am,
        check_out_am: r.check_out_am,
        check_in_pm: r.check_in_pm,
        check_out_pm: r.check_out_pm,
      },
      r.marked_absent
    )
  );

export const hasInvalidMeaningfulRecord = <TRecord extends EligibilityRecord>(records: TRecord[]): boolean =>
  records.some((r) =>
    validateAttendanceTimes({
      check_in_am: r.marked_absent ? null : r.check_in_am,
      check_out_am: r.marked_absent ? null : r.check_out_am,
      check_in_pm: r.marked_absent ? null : r.check_in_pm,
      check_out_pm: r.marked_absent ? null : r.check_out_pm,
    }).hasError
  );

export const buildChildMonthlyEligibility = <
  TChild extends EligibilityChild,
  TRecord extends EligibilityRecord
>(
  children: TChild[],
  recordsByChildId: Map<string, TRecord[]>
): ChildEligibility<TChild, TRecord>[] =>
  children.map((child) => {
    const records = recordsByChildId.get(child.id) || [];
    const meaningful = filterMeaningfulRecords(records);

    if (meaningful.length === 0) {
      return { child, records: [], reason: "No entries for selected month" };
    }

    if (hasInvalidMeaningfulRecord(meaningful)) {
      return { child, records: meaningful, reason: "Invalid entries in selected month" };
    }

    return { child, records: meaningful, reason: null };
  });
