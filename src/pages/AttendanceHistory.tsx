import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO, getDaysInMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Save, X, AlertTriangle, Printer, Eye, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { generateTemplatePdfBlob } from "@/lib/templatePdfReport";
import { validateAttendanceTimes } from "@/lib/attendanceValidation";
import { buildChildMonthlyEligibility, filterMeaningfulRecords } from "@/lib/reportEligibility";
import JSZip from "jszip";

interface AttendanceRecord {
  id: string;
  child_id: string;
  date: string;
  check_in_am: string | null;
  check_out_am: string | null;
  check_in_pm: string | null;
  check_out_pm: string | null;
  marked_absent: boolean;
  absence_reason: string | null;
  total_hours: number;
}

interface ChildRecord {
  id: string;
  name: string;
  dob: string;
  child_id_number: string;
  family_number: string;
  family_alt_id: string | null;
  parent_name: string;
}

interface ProviderProfile {
  provider_name: string | null;
  provider_number: string | null;
  daycare_name: string | null;
  provider_alt_id: string | null;
}

interface BulkReportItem {
  child: ChildRecord;
  reason: string | null;
  records: AttendanceRecord[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const AttendanceHistory = () => {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<AttendanceRecord>>>({});
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkReportItem[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchChildren = async () => {
      const { data } = await supabase
        .from("children")
        .select("id, name, dob, child_id_number, family_number, family_alt_id, parent_name")
        .eq("provider_id", user.id)
        .order("name");
      setChildren(data || []);
      if (data && data.length > 0) {
        setSelectedChild((prev) => prev || data[0].id);
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("provider_name, provider_number, daycare_name, provider_alt_id")
        .eq("user_id", user.id)
        .single();
      setProfile(profileData ?? null);
    };
    fetchChildren();
  }, [user]);

  useEffect(() => {
    if (!selectedChild) return;
    const fetchRecords = async () => {
      setLoading(true);
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const daysInMonth = getDaysInMonth(new Date(year, month));
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

      const { data } = await supabase
        .from("attendance")
        .select("id, child_id, date, check_in_am, check_out_am, check_in_pm, check_out_pm, marked_absent, absence_reason, total_hours")
        .eq("child_id", selectedChild)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date");

      setRecords(data || []);
      setEdits({});
      setLoading(false);
    };
    fetchRecords();
  }, [selectedChild, year, month]);

  const daysInMonth = getDaysInMonth(new Date(year, month));
  const allDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });

  const getMonthBounds = () => {
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const monthDays = getDaysInMonth(new Date(year, month));
    const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(monthDays).padStart(2, "0")}`;
    return { startDate, endDate };
  };

  const getRecord = (date: string) => records.find(r => r.date === date);

  const extractTime = (ts: string | null) => {
    if (!ts) return "";
    return format(parseISO(ts), "HH:mm");
  };

  const getEffectiveValue = (date: string, field: string): string | null => {
    const record = getRecord(date);
    const editForRecord = record ? edits[record.id] : edits[`new-${date}`];
    if (editForRecord && field in editForRecord) {
      return editForRecord[field as keyof AttendanceRecord] as string | null;
    }
    return (record?.[field as keyof AttendanceRecord] as string | null) ?? null;
  };

  const validateDay = (date: string): { hasError: boolean; message: string } => {
    return validateAttendanceTimes({
      check_in_am: getEffectiveValue(date, "check_in_am"),
      check_out_am: getEffectiveValue(date, "check_out_am"),
      check_in_pm: getEffectiveValue(date, "check_in_pm"),
      check_out_pm: getEffectiveValue(date, "check_out_pm"),
    });
  };

  const handleEdit = (date: string, field: string, value: string) => {
    const record = getRecord(date);
    const key = record?.id || `new-${date}`;
    setEdits(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        date,
        child_id: selectedChild,
        [field]: value ? new Date(`${date}T${value}`).toISOString() : null,
      },
    }));
  };

  const handleClear = (date: string, field: string) => {
    const record = getRecord(date);
    const key = record?.id || `new-${date}`;
    setEdits(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        date,
        child_id: selectedChild,
        [field]: null,
      },
    }));
  };

  const handleAbsentToggle = (date: string) => {
    const record = getRecord(date);
    const key = record?.id || `new-${date}`;
    const currentAbsent = edits[key]?.marked_absent ?? record?.marked_absent ?? false;
    const nextAbsent = !currentAbsent;
    setEdits(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        date,
        child_id: selectedChild,
        marked_absent: nextAbsent,
        absence_reason: nextAbsent
          ? (prev[key]?.absence_reason ?? record?.absence_reason ?? "")
          : null,
      },
    }));
  };

  const handleAbsenceReasonEdit = (date: string, value: string) => {
    const record = getRecord(date);
    const key = record?.id || `new-${date}`;
    setEdits((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        date,
        child_id: selectedChild,
        absence_reason: value.trim() ? value : null,
      },
    }));
  };

  const saveAll = async () => {
    for (const [key, edit] of Object.entries(edits)) {
      if (key.startsWith("new-")) {
        await supabase.from("attendance").insert({
          child_id: selectedChild,
          date: edit.date!,
          check_in_am: edit.check_in_am || null,
          check_out_am: edit.check_out_am || null,
          check_in_pm: edit.check_in_pm || null,
          check_out_pm: edit.check_out_pm || null,
          marked_absent: edit.marked_absent || false,
          absence_reason: edit.marked_absent ? (edit.absence_reason || null) : null,
        });
      } else {
        await supabase.from("attendance").update(edit).eq("id", key);
      }
    }
    toast.success("Attendance saved");
    setEdits({});
    // Re-fetch
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    const { data } = await supabase
      .from("attendance")
      .select("id, child_id, date, check_in_am, check_out_am, check_in_pm, check_out_pm, marked_absent, absence_reason, total_hours")
      .eq("child_id", selectedChild)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date");
    setRecords(data || []);
  };

  const generateReportForChild = async (child: ChildRecord, childRecords: AttendanceRecord[]) => {
    const { blob, totalHours, filename } = await generateTemplatePdfBlob({
      child,
      provider: profile ?? {
        provider_name: null,
        provider_number: null,
        daycare_name: null,
        provider_alt_id: null,
      },
      attendance: childRecords.map((r) => ({
        date: r.date,
        check_in_am: r.check_in_am,
        check_out_am: r.check_out_am,
        check_in_pm: r.check_in_pm,
        check_out_pm: r.check_out_pm,
        marked_absent: r.marked_absent,
        absence_reason: r.absence_reason,
      })),
      month: month + 1,
      year,
    });

    await supabase.from("monthly_sheets").upsert(
      {
        child_id: child.id,
        month: month + 1,
        year,
        total_month_hours: totalHours,
      },
      { onConflict: "child_id,month,year" }
    );

    return { blob, filename };
  };

  const prepareMonthlyReportPdf = async () => {
    const child = children.find((c) => c.id === selectedChild);
    if (!child) {
      toast.error("Select a child first");
      return null;
    }

    if (!user) {
      toast.error("You must be signed in");
      return null;
    }

    if (hasEdits) {
      toast.error("Save changes before printing the monthly report");
      return null;
    }

    const invalidDays = allDays.filter((date) => validateDay(date).hasError);
    if (invalidDays.length > 0) {
      toast.error(`Cannot print: fix ${invalidDays.length} invalid row(s) for this month first`);
      return null;
    }

    const meaningfulRecords = filterMeaningfulRecords(records);

    if (meaningfulRecords.length === 0) {
      toast.error("No entries for selected month");
      return null;
    }

    return generateReportForChild(child, meaningfulRecords);
  };

  const downloadMonthlyReport = async () => {
    const payload = await prepareMonthlyReportPdf();
    if (!payload) return;

    const pdfUrl = URL.createObjectURL(payload.blob);
    const anchor = document.createElement("a");
    anchor.href = pdfUrl;
    anchor.download = payload.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 120_000);
  };

  const previewMonthlyReport = async () => {
    const payload = await prepareMonthlyReportPdf();
    if (!payload) return;

    const previewWindow = window.open("", "_blank", "width=1100,height=800");
    if (!previewWindow) {
      toast.error("Popup blocked. Allow popups to preview.");
      return;
    }

    const pdfUrl = URL.createObjectURL(payload.blob);
    previewWindow.location.replace(pdfUrl);
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 120_000);
  };

  const buildBulkItems = async (): Promise<BulkReportItem[]> => {
    if (children.length === 0) return [];
    const childIds = children.map((c) => c.id);
    const { startDate, endDate } = getMonthBounds();

    const { data, error } = await supabase
      .from("attendance")
      .select("id, child_id, date, check_in_am, check_out_am, check_in_pm, check_out_pm, marked_absent, absence_reason, total_hours")
      .in("child_id", childIds)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date");

    if (error) throw new Error(error.message);

    const grouped = new Map<string, AttendanceRecord[]>();
    (data || []).forEach((r) => {
      const list = grouped.get(r.child_id) || [];
      list.push(r);
      grouped.set(r.child_id, list);
    });

    return buildChildMonthlyEligibility(children, grouped);
  };

  const openBulkModal = async () => {
    if (!user) {
      toast.error("You must be signed in");
      return;
    }
    if (hasEdits) {
      toast.error("Save changes before bulk download");
      return;
    }

    setBulkLoading(true);
    try {
      const items = await buildBulkItems();
      setBulkItems(items);
      setBulkOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to prepare bulk download");
    } finally {
      setBulkLoading(false);
    }
  };

  const downloadBulkReports = async () => {
    const eligible = bulkItems.filter((item) => !item.reason);
    if (eligible.length === 0) {
      toast.error("No eligible children to download");
      return;
    }

    setBulkDownloading(true);
    try {
      const zip = new JSZip();
      for (const item of eligible) {
        const result = await generateReportForChild(item.child, item.records);
        zip.file(result.filename, result.blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);
      const anchor = document.createElement("a");
      anchor.href = zipUrl;
      anchor.download = `monthly_reports_${MONTHS[month]}_${year}`.replace(/\s+/g, "_") + ".zip";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(zipUrl), 120_000);
      toast.success(`Downloaded ${eligible.length} report(s)`);
      setBulkOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk download failed");
    } finally {
      setBulkDownloading(false);
    }
  };

  const changeMonth = (dir: number) => {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const getDayLabel = (date: string) => {
    const d = parseISO(date);
    const dayOfWeek = format(d, "EEE");
    const dayNum = format(d, "d");
    return { dayOfWeek, dayNum };
  };

  const hasEdits = Object.keys(edits).length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold">Attendance History</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openBulkModal} className="gap-2" disabled={loading || bulkLoading || children.length === 0}>
            <Download className="w-4 h-4" /> Bulk Download
          </Button>
          <Button variant="outline" onClick={previewMonthlyReport} className="gap-2" disabled={!selectedChild || loading}>
            <Eye className="w-4 h-4" /> Preview Monthly Report
          </Button>
          <Button variant="outline" onClick={downloadMonthlyReport} className="gap-2" disabled={!selectedChild || loading}>
            <Printer className="w-4 h-4" /> Print Monthly Report
          </Button>
          <Button onClick={saveAll} className="gap-2" disabled={!hasEdits}>
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedChild} onValueChange={setSelectedChild}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select child" />
          </SelectTrigger>
          <SelectContent>
            {children.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-heading font-semibold min-w-[160px] text-center">
            {MONTHS[month]} {year}
          </span>
          <Button variant="ghost" size="icon" onClick={() => changeMonth(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* History table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-heading font-semibold">Date</th>
                <th className="text-center p-3 font-heading font-semibold">In AM</th>
                <th className="text-center p-3 font-heading font-semibold">Out (School)</th>
                <th className="text-center p-3 font-heading font-semibold">In (School)</th>
                <th className="text-center p-3 font-heading font-semibold">Out PM</th>
                <th className="text-left p-3 font-heading font-semibold">Reason for Absence</th>
                <th className="text-center p-3 font-heading font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {allDays.map(date => {
                const record = getRecord(date);
                const editForRecord = record ? edits[record.id] : edits[`new-${date}`];
                const isAbsent = editForRecord?.marked_absent ?? record?.marked_absent ?? false;
                const absenceReason = (editForRecord?.absence_reason ?? record?.absence_reason ?? "") as string;
                const { dayOfWeek, dayNum } = getDayLabel(date);
                const isWeekend = dayOfWeek === "Sat" || dayOfWeek === "Sun";
                const validation = validateDay(date);

                return (
                  <tr key={date} className={`border-b border-border last:border-0 ${validation.hasError ? "bg-destructive/10" : isWeekend ? "bg-muted/20" : "hover:bg-muted/30"}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{dayOfWeek} {dayNum}</span>
                        {validation.hasError && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="w-4 h-4 text-destructive" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{validation.message}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </td>
                    {isAbsent ? (
                      <td colSpan={4} className="text-center p-3">
                        <span className="text-destructive font-medium">Absent</span>
                      </td>
                    ) : (
                      <>
                        {(["check_in_am", "check_out_am", "check_in_pm", "check_out_pm"] as const).map(field => {
                          const editedValue = editForRecord?.[field];
                          const currentValue = editedValue !== undefined
                            ? (editedValue ? extractTime(editedValue as string) : "")
                            : extractTime(record?.[field] ?? null);
                          const hasValue = currentValue !== "";
                          return (
                            <td key={field} className="text-center p-3">
                              <div className="flex items-center justify-center gap-1">
                                <Input
                                  type="time"
                                  className="w-28 text-xs"
                                  value={currentValue}
                                  onChange={e => handleEdit(date, field, e.target.value)}
                                />
                                {hasValue && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleClear(date, field)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </>
                    )}
                    <td className="p-3">
                      <Input
                        value={absenceReason}
                        onChange={(e) => handleAbsenceReasonEdit(date, e.target.value)}
                        placeholder={isAbsent ? "e.g. Sick, Vacation" : "Only used if absent"}
                        className="h-8 text-xs"
                        maxLength={120}
                        disabled={!isAbsent}
                      />
                    </td>
                    <td className="text-center p-3">
                      <Button
                        size="sm"
                        variant={isAbsent ? "destructive" : "outline"}
                        onClick={() => handleAbsentToggle(date)}
                        className="text-xs"
                      >
                        {isAbsent ? "Absent" : "Mark Absent"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bulk Monthly Reports</DialogTitle>
            <DialogDescription>
              {MONTHS[month]} {year} eligibility. Children with invalid or missing entries are skipped.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[420px] overflow-y-auto border rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold">Child</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                  <th className="text-left p-3 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody>
                {bulkItems.map((item) => (
                  <tr key={item.child.id} className="border-b last:border-0">
                    <td className="p-3">{item.child.name}</td>
                    <td className="p-3">
                      {item.reason ? (
                        <span className="text-destructive font-medium">Skipped</span>
                      ) : (
                        <span className="text-primary font-medium">Ready</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{item.reason || "Will be downloaded"}</td>
                  </tr>
                ))}
                {bulkItems.length === 0 && (
                  <tr>
                    <td className="p-3 text-muted-foreground" colSpan={3}>No children found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkDownloading}>
              Cancel
            </Button>
            <Button onClick={downloadBulkReports} disabled={bulkDownloading || bulkItems.filter((i) => !i.reason).length === 0}>
              {bulkDownloading ? "Preparing..." : `Download Valid (${bulkItems.filter((i) => !i.reason).length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceHistory;

