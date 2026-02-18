import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, XCircle, CheckCircle2 } from "lucide-react";

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

const Attendance = () => {
  const { user } = useAuth();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
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
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, date]);

  const getRecord = (childId: string) => attendance.find(a => a.child_id === childId);

  const setTime = async (childId: string, field: string, value: string) => {
    const record = getRecord(childId);
    const timeValue = value ? new Date(`${date}T${value}`).toISOString() : null;

    if (record) {
      await supabase.from("attendance").update({ [field]: timeValue }).eq("id", record.id);
    } else {
      await supabase.from("attendance").insert({ child_id: childId, date, [field]: timeValue });
    }
    fetchData();
  };

  const toggleAbsent = async (childId: string) => {
    const record = getRecord(childId);
    if (record) {
      await supabase.from("attendance").update({ marked_absent: !record.marked_absent }).eq("id", record.id);
    } else {
      await supabase.from("attendance").insert({ child_id: childId, date, marked_absent: true });
    }
    fetchData();
  };

  const checkInAll = async () => {
    const now = new Date().toISOString();
    for (const child of children) {
      const record = getRecord(child.id);
      if (!record) {
        await supabase.from("attendance").insert({ child_id: child.id, date, check_in_am: now });
      } else if (!record.check_in_am && !record.marked_absent) {
        await supabase.from("attendance").update({ check_in_am: now }).eq("id", record.id);
      }
    }
    toast.success("All checked in");
    fetchData();
  };

  const checkOutAll = async () => {
    const now = new Date().toISOString();
    for (const child of children) {
      const record = getRecord(child.id);
      if (record && !record.marked_absent) {
        if (record.check_in_am && !record.check_out_pm) {
          if (!record.check_out_am) {
            await supabase.from("attendance").update({ check_out_am: now }).eq("id", record.id);
          } else {
            await supabase.from("attendance").update({ check_out_pm: now }).eq("id", record.id);
          }
        }
      }
    }
    toast.success("All checked out");
    fetchData();
  };

  const changeDate = (dir: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + dir);
    setDate(format(d, "yyyy-MM-dd"));
  };

  const formatTime = (ts: string | null) => {
    if (!ts) return "";
    return format(parseISO(ts), "h:mm a");
  };

  const extractTime = (ts: string | null) => {
    if (!ts) return "";
    return format(parseISO(ts), "HH:mm");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold">Attendance</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => checkInAll()}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> Check In All
          </Button>
          <Button variant="outline" size="sm" onClick={() => checkOutAll()}>
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
                const record = getRecord(child.id);
                const isAbsent = record?.marked_absent;

                return (
                  <tr key={child.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-heading font-bold text-primary text-xs">
                          {child.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{child.name}</p>
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
                        {["check_in_am", "check_out_am", "check_in_pm", "check_out_pm"].map(field => (
                          <td key={field} className="text-center p-3">
                            <Input
                              type="time"
                              className="w-28 mx-auto text-xs"
                              value={extractTime(record?.[field as keyof AttendanceRecord] as string | null)}
                              onChange={e => setTime(child.id, field, e.target.value)}
                            />
                          </td>
                        ))}
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
