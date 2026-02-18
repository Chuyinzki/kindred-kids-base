import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, parseISO, getDaysInMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Save, X, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AttendanceRecord {
  id: string;
  child_id: string;
  date: string;
  check_in_am: string | null;
  check_out_am: string | null;
  check_in_pm: string | null;
  check_out_pm: string | null;
  marked_absent: boolean;
  total_hours: number;
}

interface ChildRecord {
  id: string;
  name: string;
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchChildren = async () => {
      const { data } = await supabase
        .from("children")
        .select("id, name")
        .eq("provider_id", user.id)
        .order("name");
      setChildren(data || []);
      if (data && data.length > 0 && !selectedChild) {
        setSelectedChild(data[0].id);
      }
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
        .select("id, child_id, date, check_in_am, check_out_am, check_in_pm, check_out_pm, marked_absent, total_hours")
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
    const fields = ["check_in_am", "check_out_am", "check_in_pm", "check_out_pm"] as const;
    const values = fields.map(f => getEffectiveValue(date, f));
    const times = values.map(v => (v ? new Date(v).getTime() : null));

    const hasAny = times.some(t => t !== null);
    if (!hasAny) return { hasError: false, message: "" };

    // Check for gaps (later time set but earlier one missing)
    for (let i = 1; i < times.length; i++) {
      if (times[i] !== null) {
        for (let j = 0; j < i; j++) {
          if (times[j] === null) {
            return { hasError: true, message: "Missing earlier time" };
          }
        }
      }
    }

    // Check chronological order
    const filled = times.filter((t): t is number => t !== null);
    for (let i = 1; i < filled.length; i++) {
      if (filled[i] <= filled[i - 1]) {
        return { hasError: true, message: "Times out of order" };
      }
    }

    // Incomplete: checked in but never checked out
    if (times[0] !== null && times[1] === null && times[2] === null && times[3] === null) {
      return { hasError: true, message: "Incomplete — no check-out" };
    }

    return { hasError: false, message: "" };
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
    setEdits(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        date,
        child_id: selectedChild,
        marked_absent: !currentAbsent,
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
      .select("id, child_id, date, check_in_am, check_out_am, check_in_pm, check_out_pm, marked_absent, total_hours")
      .eq("child_id", selectedChild)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date");
    setRecords(data || []);
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

  const childName = children.find(c => c.id === selectedChild)?.name || "";
  const hasEdits = Object.keys(edits).length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold">Attendance History</h1>
        <Button onClick={saveAll} className="gap-2" disabled={!hasEdits}>
          <Save className="w-4 h-4" /> Save Changes
        </Button>
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
                <th className="text-center p-3 font-heading font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {allDays.map(date => {
                const record = getRecord(date);
                const editForRecord = record ? edits[record.id] : edits[`new-${date}`];
                const isAbsent = editForRecord?.marked_absent ?? record?.marked_absent ?? false;
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
    </div>
  );
};

export default AttendanceHistory;
