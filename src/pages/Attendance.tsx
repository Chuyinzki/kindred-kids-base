import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, XCircle, CheckCircle2, Save, X, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { validateAttendanceTimes } from "@/lib/attendanceValidation";

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
  validation_flag: boolean;
}

interface ChildRecord {
  id: string;
  name: string;
  child_id_number: string;
  parent_name: string;
}

type TimeFields = "check_in_am" | "check_out_am" | "check_in_pm" | "check_out_pm";
const TIME_FIELDS: TimeFields[] = ["check_in_am", "check_out_am", "check_in_pm", "check_out_pm"];

// Local draft: time strings keyed by "childId:field"
type DraftMap = Record<string, string>; // value is HH:mm or "" for cleared
type AbsentMap = Record<string, boolean>;

const Attendance = () => {
  const { user } = useAuth();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Local edits not yet saved
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [absentDrafts, setAbsentDrafts] = useState<AbsentMap>({});
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const { data: childData } = await supabase
      .from("children")
      .select("id, name, child_id_number, parent_name")
      .eq("provider_id", user.id)
      .order("name");

    setChildren(childData || []);

    const { data: attData } = await supabase
      .from("attendance")
      .select("*")
      .eq("date", date)
      .in("child_id", (childData || []).map(c => c.id));

    setAttendance(attData || []);
    setDrafts({});
    setAbsentDrafts({});
    setHasChanges(false);
    setLoading(false);
  }, [user, date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getRecord = (childId: string) => attendance.find(a => a.child_id === childId);

  const draftKey = (childId: string, field: string) => `${childId}:${field}`;

  const extractTime = (ts: string | null) => {
    if (!ts) return "";
    return format(parseISO(ts), "HH:mm");
  };

  // Get the displayed value: draft overrides DB
  const getDisplayValue = (childId: string, field: TimeFields) => {
    const key = draftKey(childId, field);
    if (key in drafts) return drafts[key];
    const record = getRecord(childId);
    return extractTime(record?.[field] as string | null);
  };

  const getDisplayAbsent = (childId: string) => {
    if (childId in absentDrafts) return absentDrafts[childId];
    return getRecord(childId)?.marked_absent ?? false;
  };

  const updateDraft = (childId: string, field: TimeFields, value: string) => {
    setDrafts(prev => ({ ...prev, [draftKey(childId, field)]: value }));
    setHasChanges(true);
  };

  const clearTime = (childId: string, field: TimeFields) => {
    setDrafts(prev => ({ ...prev, [draftKey(childId, field)]: "" }));
    setHasChanges(true);
  };

  const toggleAbsent = (childId: string) => {
    const current = getDisplayAbsent(childId);
    setAbsentDrafts(prev => ({ ...prev, [childId]: !current }));
    setHasChanges(true);
  };

  const discardChanges = () => {
    setDrafts({});
    setAbsentDrafts({});
    setHasChanges(false);
  };

  const saveAll = async () => {
    // Collect per-child changes
    const childChanges: Record<string, Record<string, unknown>> = {};

    // Time drafts
    for (const [key, val] of Object.entries(drafts)) {
      const [childId, field] = key.split(":");
      if (!childChanges[childId]) childChanges[childId] = {};
      childChanges[childId][field] = val ? new Date(`${date}T${val}`).toISOString() : null;
    }

    // Absent drafts
    for (const [childId, absent] of Object.entries(absentDrafts)) {
      if (!childChanges[childId]) childChanges[childId] = {};
      childChanges[childId].marked_absent = absent;
    }

    let errors = 0;
    for (const [childId, changes] of Object.entries(childChanges)) {
      const record = getRecord(childId);
      if (record) {
        const { error } = await supabase.from("attendance").update(changes).eq("id", record.id);
        if (error) errors++;
      } else {
        const { error } = await supabase.from("attendance").insert({ child_id: childId, date, ...changes });
        if (error) errors++;
      }
    }

    if (errors) {
      toast.error(`Failed to save ${errors} record(s)`);
    } else {
      toast.success("Attendance saved");
    }
    fetchData();
  };

  const checkInAll = () => {
    const now = format(new Date(), "HH:mm");
    for (const child of children) {
      const currentIn = getDisplayValue(child.id, "check_in_am");
      const currentAbsent = getDisplayAbsent(child.id);
      if (!currentIn && !currentAbsent) {
        setDrafts(prev => ({ ...prev, [draftKey(child.id, "check_in_am")]: now }));
      }
    }
    setHasChanges(true);
    toast.info("Check In All staged — click Save to apply");
  };

  const checkOutAll = () => {
    const now = format(new Date(), "HH:mm");
    for (const child of children) {
      const currentAbsent = getDisplayAbsent(child.id);
      if (currentAbsent) continue;
      const inAm = getDisplayValue(child.id, "check_in_am");
      if (!inAm) continue;
      const outPm = getDisplayValue(child.id, "check_out_pm");
      if (outPm) continue;
      const outAm = getDisplayValue(child.id, "check_out_am");
      if (!outAm) {
        setDrafts(prev => ({ ...prev, [draftKey(child.id, "check_out_am")]: now }));
      } else {
        setDrafts(prev => ({ ...prev, [draftKey(child.id, "check_out_pm")]: now }));
      }
    }
    setHasChanges(true);
    toast.info("Check Out All staged — click Save to apply");
  };

  const changeDate = (dir: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + dir);
    setDate(format(d, "yyyy-MM-dd"));
  };

  const getRowValidation = (childId: string) => {
    const isAbsent = getDisplayAbsent(childId);
    if (isAbsent) return { hasError: false, message: "" };

    const toIso = (value: string) => (value ? new Date(`${date}T${value}`).toISOString() : null);
    return validateAttendanceTimes({
      check_in_am: toIso(getDisplayValue(childId, "check_in_am")),
      check_out_am: toIso(getDisplayValue(childId, "check_out_am")),
      check_in_pm: toIso(getDisplayValue(childId, "check_in_pm")),
      check_out_pm: toIso(getDisplayValue(childId, "check_out_pm")),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold">Attendance</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={checkInAll}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> Check In All
          </Button>
          <Button variant="outline" size="sm" onClick={checkOutAll}>
            <XCircle className="w-4 h-4 mr-1" /> Check Out All
          </Button>
        </div>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-auto" />
        <Button variant="ghost" size="icon" onClick={() => changeDate(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDate(format(new Date(), "yyyy-MM-dd"))}>
          Today
        </Button>
      </div>

      {/* Save bar */}
      {hasChanges && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <span className="text-sm font-medium text-primary flex-1">You have unsaved changes</span>
          <Button variant="ghost" size="sm" onClick={discardChanges}>
            <X className="w-4 h-4 mr-1" /> Discard
          </Button>
          <Button size="sm" onClick={saveAll}>
            <Save className="w-4 h-4 mr-1" /> Save All
          </Button>
        </div>
      )}

      {/* Attendance table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-heading font-semibold">Child</th>
                <th className="text-center p-3 font-heading font-semibold">In AM</th>
                <th className="text-center p-3 font-heading font-semibold">Out (School)</th>
                <th className="text-center p-3 font-heading font-semibold">In (School)</th>
                <th className="text-center p-3 font-heading font-semibold">Out PM</th>
                <th className="text-center p-3 font-heading font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {children.map(child => {
                const isAbsent = getDisplayAbsent(child.id);
                const validation = getRowValidation(child.id);

                return (
                  <tr key={child.id} className={`border-b border-border last:border-0 ${validation.hasError ? "bg-destructive/10" : "hover:bg-muted/30"}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-heading font-bold text-primary text-xs">
                          {child.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium">{child.name}</p>
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
                          <p className="text-xs text-muted-foreground">{child.parent_name}</p>
                        </div>
                      </div>
                    </td>
                    {isAbsent ? (
                      <td colSpan={4} className="text-center p-3">
                        <span className="text-destructive font-medium">Absent</span>
                      </td>
                    ) : (
                      <>
                        {TIME_FIELDS.map(field => {
                          const val = getDisplayValue(child.id, field);
                          return (
                            <td key={field} className="text-center p-3">
                              <div className="flex items-center gap-1 justify-center">
                                <Input
                                  type="time"
                                  className="w-28 text-xs"
                                  value={val}
                                  onChange={e => updateDraft(child.id, field, e.target.value)}
                                />
                                {val && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => clearTime(child.id, field)}
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
                        onClick={() => toggleAbsent(child.id)}
                        className="text-xs"
                      >
                        {isAbsent ? "Absent" : "Mark Absent"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {children.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-muted-foreground">
                    No children enrolled yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
