import { format } from "date-fns";
import { jsPDF } from "jspdf";
import providerSheetUrl from "@/templates/daycare_provider_sheet.jpg";
import attendanceSheetUrl from "@/templates/daycare_attendance_sheet.jpg";
import { hasMeaningfulAttendanceEntry } from "./attendanceValidation";

export interface TemplateReportChild {
  id: string;
  name: string;
  dob: string;
  child_id_number: string;
  family_number: string;
  family_alt_id: string | null;
  parent_name: string;
}

export interface TemplateReportProvider {
  provider_name: string | null;
  provider_number: string | null;
  daycare_name: string | null;
  provider_alt_id?: string | null;
}

export interface TemplateReportAttendance {
  date: string;
  check_in_am: string | null;
  check_out_am: string | null;
  check_in_pm: string | null;
  check_out_pm: string | null;
  marked_absent: boolean;
}

interface DayHours {
  am: number;
  pm: number;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

const parseMs = (v: string | null): number | null => {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
};

const hoursBetween = (start: number | null, end: number | null): number => {
  if (start === null || end === null || end <= start) return 0;
  return round1((end - start) / 3_600_000);
};

const parseLocalDate = (isoDate: string): Date => {
  const [y, m, d] = isoDate.split("-").map((v) => Number(v));
  if (!y || !m || !d) return new Date(isoDate);
  return new Date(y, m - 1, d);
};

const ageYears = (dobIso: string): number => {
  const dob = parseLocalDate(dobIso);
  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) years--;
  return Math.max(years, 0);
};

const formatTime = (value: string | null): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "h:mm a");
};

const formatDate = (value: string): string => {
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : format(d, "MM/dd/yyyy");
};

const monthDates = (year: number, month: number): string[] => {
  const days = new Date(year, month, 0).getDate();
  const list: string[] = [];
  for (let d = 1; d <= days; d++) {
    list.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return list;
};

const computeAmPmHours = (record: TemplateReportAttendance): DayHours => {
  if (record.marked_absent) return { am: 0, pm: 0 };

  const inAm = parseMs(record.check_in_am);
  const outSchool = parseMs(record.check_out_am);
  const inSchool = parseMs(record.check_in_pm);
  const outPm = parseMs(record.check_out_pm);
  if (inAm === null || outPm === null) return { am: 0, pm: 0 };

  const day = new Date(`${record.date}T00:00:00`).getDay();
  const isWeekend = day === 0 || day === 6;
  if (isWeekend) {
    return { am: 0, pm: hoursBetween(inAm, outPm) };
  }

  if (outSchool !== null && inSchool !== null && outSchool > inAm && inSchool > outSchool && outPm > inSchool) {
    return {
      am: hoursBetween(inAm, outSchool),
      pm: hoursBetween(inSchool, outPm),
    };
  }

  return { am: hoursBetween(inAm, outPm), pm: 0 };
};

const getWeekOfMonth = (dateIso: string): number => {
  const d = new Date(`${dateIso}T00:00:00`);
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
  return Math.floor((d.getDate() + monthStart.getDay() - 1) / 7) + 1;
};

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });

const makeCanvas = (w: number, h: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
};

const drawText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number): void => {
  ctx.font = `${size}px Arial`;
  ctx.fillStyle = "#0000cc";
  ctx.fillText(text, x, y);
};

const fixed = (n: number): string => round1(n).toFixed(1);

export const generateTemplatePdfBlob = async (input: {
  child: TemplateReportChild;
  provider: TemplateReportProvider;
  attendance: TemplateReportAttendance[];
  month: number;
  year: number;
}): Promise<{ blob: Blob; totalHours: number; filename: string }> => {
  const providerBg = await loadImage(providerSheetUrl);
  const attendanceBg = await loadImage(attendanceSheetUrl);

  const child = input.child;
  const provider = input.provider;
  const monthYear = format(new Date(input.year, input.month - 1, 1), "MMMM yyyy");
  const dob = format(parseLocalDate(child.dob), "MM/dd/yyyy");
  const age = ageYears(child.dob);
  const ageLabel = `${age} ${age === 1 ? "year" : "years"}`;

  const weekly: Record<number, { am: number; pm: number }> = {};
  for (let i = 1; i <= 6; i++) weekly[i] = { am: 0, pm: 0 };

  const recordsByDate = new Map(input.attendance.map((r) => [r.date, r]));

  for (const record of input.attendance) {
    const week = getWeekOfMonth(record.date);
    if (week < 1 || week > 6) continue;
    const h = computeAmPmHours(record);
    weekly[week].am = round1(weekly[week].am + h.am);
    weekly[week].pm = round1(weekly[week].pm + h.pm);
  }

  let monthAm = 0;
  let monthPm = 0;
  for (let i = 1; i <= 6; i++) {
    monthAm = round1(monthAm + weekly[i].am);
    monthPm = round1(monthPm + weekly[i].pm);
  }
  const monthTotal = round1(monthAm + monthPm);

  // Page 1: provider sheet (draw at 1608x1243, rotate into portrait)
  const page1Landscape = makeCanvas(1608, 1243);
  const p1 = page1Landscape.getContext("2d");
  if (!p1) throw new Error("Failed to initialize canvas context");
  p1.drawImage(providerBg, 0, 0, 1608, 1243);

  drawText(p1, provider.provider_name || provider.daycare_name || "", 154, 243, 33);
  drawText(p1, provider.provider_number || "", 1414, 243, 33);
  if (provider.provider_alt_id) drawText(p1, provider.provider_alt_id, 1052, 243, 33);

  drawText(p1, child.parent_name, 290, 134, 33);
  drawText(p1, child.family_number, 139, 134, 18);
  drawText(p1, child.child_id_number, 1419, 134, 18);

  drawText(p1, child.name, 282, 176, 33);
  drawText(p1, ageLabel, 866, 176, 33);
  drawText(p1, child.child_id_number, 139, 176, 18);
  drawText(p1, dob, 1052, 176, 28);
  drawText(p1, monthYear, 270, 467, 33);

  const topY = 694;
  const ySpacing = 50;
  const xFirst = 70;
  const xSpacing = 70;
  for (let i = 1; i <= 6; i++) {
    drawText(p1, fixed(weekly[i].am), xFirst, topY + ySpacing * (i - 1), 21);
    drawText(p1, fixed(weekly[i].pm), xFirst + xSpacing, topY + ySpacing * (i - 1), 21);
    drawText(p1, fixed(weekly[i].am + weekly[i].pm), xFirst + xSpacing * 2, topY + ySpacing * (i - 1), 21);
  }
  drawText(p1, fixed(monthAm), xFirst, topY + 30 + ySpacing * 6, 21);
  drawText(p1, fixed(monthPm), xFirst + xSpacing, topY + 30 + ySpacing * 6, 21);
  drawText(p1, fixed(monthTotal), xFirst + xSpacing * 2, topY + 30 + ySpacing * 6, 21);

  // rotate to portrait 1243x1608
  const page1Portrait = makeCanvas(1243, 1608);
  const p1r = page1Portrait.getContext("2d");
  if (!p1r) throw new Error("Failed to initialize rotated canvas context");
  p1r.translate(1243, 0);
  p1r.rotate(Math.PI / 2);
  p1r.drawImage(page1Landscape, 0, 0);

  // Flip provider sheet 180deg from its current orientation.
  const page1Final = makeCanvas(1243, 1608);
  const p1f = page1Final.getContext("2d");
  if (!p1f) throw new Error("Failed to initialize provider final canvas context");
  p1f.translate(1243, 1608);
  p1f.rotate(Math.PI);
  p1f.drawImage(page1Portrait, 0, 0);

  // Page 2: attendance sheet
  const page2 = makeCanvas(1243, 1608);
  const p2 = page2.getContext("2d");
  if (!p2) throw new Error("Failed to initialize attendance canvas context");
  p2.drawImage(attendanceBg, 0, 0, 1243, 1608);

  const firstColumnX = 154;
  const secondColumnX = 691;
  const thirdColumnX = 988;
  drawText(p2, child.family_number, firstColumnX, 130, 33);
  drawText(p2, child.parent_name, firstColumnX, 174, 33);
  drawText(p2, child.name, firstColumnX, 222, 33);

  if (provider.provider_alt_id) drawText(p2, provider.provider_alt_id, secondColumnX, 130, 33);
  drawText(p2, provider.provider_name || provider.daycare_name || "", secondColumnX, 174, 33);
  drawText(p2, `${dob}  ${ageLabel}`, secondColumnX, 222, 22);

  drawText(p2, provider.provider_number || "", thirdColumnX, 130, 33);
  drawText(p2, child.child_id_number, thirdColumnX, 222, 33);
  drawText(p2, monthYear, 174, 270, 33);

  const topBlockY = 351;
  const weeklyYDiff = 188;
  const lineDiff = 23;
  const weekTotalYDiff = 166;

  const dayX = 98;
  const timeInX = 214;
  const schoolTimeOutX = 304;
  const schoolTimeInX = 399;
  const timeOutX = 488;
  const amTotalX = 897;
  const pmTotalX = 991;
  const totalX = 1079;

  for (const date of monthDates(input.year, input.month)) {
    const record = recordsByDate.get(date);
    const week = getWeekOfMonth(date);
    if (week < 1 || week > 6) continue;
    const d = new Date(`${date}T00:00:00`);
    const dayOfWeek = d.getDay(); // 0=Sun
    const lineY = topBlockY + weeklyYDiff * (week - 1) + lineDiff * dayOfWeek;
    const dayHours = record
      ? computeAmPmHours(record)
      : { am: 0, pm: 0 };
    const hasEntry = !!record && hasMeaningfulAttendanceEntry(
      {
        check_in_am: record.check_in_am,
        check_out_am: record.check_out_am,
        check_in_pm: record.check_in_pm,
        check_out_pm: record.check_out_pm,
      },
      record.marked_absent
    );
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    drawText(p2, formatDate(date), dayX, lineY, 18);
    drawText(p2, formatTime(record?.check_in_am ?? null), timeInX, lineY, 18);
    drawText(p2, formatTime(record?.check_out_am ?? null), schoolTimeOutX, lineY, 18);
    drawText(p2, formatTime(record?.check_in_pm ?? null), schoolTimeInX, lineY, 18);
    drawText(p2, formatTime(record?.check_out_pm ?? null), timeOutX, lineY, 18);

    if (hasEntry) {
      if (!isWeekend) drawText(p2, fixed(dayHours.am), amTotalX, lineY, 18);
      drawText(p2, fixed(dayHours.pm), pmTotalX, lineY, 18);
      drawText(p2, fixed(dayHours.am + dayHours.pm), totalX, lineY, 18);
    }
  }

  for (let i = 1; i <= 6; i++) {
    const y = topBlockY + weeklyYDiff * (i - 1) + weekTotalYDiff;
    drawText(p2, fixed(weekly[i].am), amTotalX, y, 18);
    drawText(p2, fixed(weekly[i].pm), pmTotalX, y, 18);
    drawText(p2, fixed(weekly[i].am + weekly[i].pm), totalX, y, 18);
  }
  drawText(p2, fixed(monthAm), amTotalX, 1561, 18);
  drawText(p2, fixed(monthPm), pmTotalX, 1561, 18);
  drawText(p2, fixed(monthTotal), totalX, 1561, 18);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: [1243, 1608],
    compress: true,
  });
  // Page order: attendance first, provider second.
  pdf.addImage(page2.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 1243, 1608);
  pdf.addPage([1243, 1608], "portrait");
  pdf.addImage(page1Final.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 1243, 1608);

  const blob = pdf.output("blob");
  const fileSafe = `${child.name}_${monthYear}_${child.child_id_number}`.replace(/\s+/g, "_");
  return { blob, totalHours: monthTotal, filename: `${fileSafe}.pdf` };
};
