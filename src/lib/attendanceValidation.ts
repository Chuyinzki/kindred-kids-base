export interface AttendanceValidationInput {
  check_in_am: string | null;
  check_out_am: string | null;
  check_in_pm: string | null;
  check_out_pm: string | null;
}

export interface AttendanceValidationResult {
  hasError: boolean;
  message: string;
}

const toMillis = (value: string | null): number | null => {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
};

export const hasMeaningfulAttendanceEntry = (
  input: AttendanceValidationInput,
  markedAbsent = false
): boolean => {
  if (markedAbsent) return true;
  return Boolean(input.check_in_am || input.check_out_am || input.check_in_pm || input.check_out_pm);
};

export const validateAttendanceTimes = (
  input: AttendanceValidationInput
): AttendanceValidationResult => {
  const tInAm = toMillis(input.check_in_am);
  const tOutSchool = toMillis(input.check_out_am);
  const tInSchool = toMillis(input.check_in_pm);
  const tOutPm = toMillis(input.check_out_pm);

  const hasAny = tInAm !== null || tOutSchool !== null || tInSchool !== null || tOutPm !== null;
  if (!hasAny) return { hasError: false, message: "" };

  if ((tOutSchool !== null) !== (tInSchool !== null)) {
    return {
      hasError: true,
      message: "Out (School) and In (School) must both be filled or both empty",
    };
  }

  if (tInAm === null && (tOutSchool !== null || tInSchool !== null || tOutPm !== null)) {
    return { hasError: true, message: "Missing In AM" };
  }

  if (tInAm !== null && tOutPm === null) {
    return { hasError: true, message: "Incomplete - no Out PM" };
  }

  const sequence = [tInAm, tOutSchool, tInSchool, tOutPm].filter((t): t is number => t !== null);
  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i] <= sequence[i - 1]) {
      return { hasError: true, message: "Times out of order" };
    }
  }

  return { hasError: false, message: "" };
};
