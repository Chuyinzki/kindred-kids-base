import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, XCircle, Clock, AlertTriangle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface ChildWithAttendance {
  id: string;
  name: string;
  child_id_number: string;
  parent_name: string;
  attendance?: {
    id: string;
    check_in_am: string | null;
    check_out_am: string | null;
    check_in_pm: string | null;
    check_out_pm: string | null;
    marked_absent: boolean;
    total_hours: number;
  };
}

interface ProviderProfile {
  daycare_name: string | null;
  provider_name: string | null;
  provider_number: string | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildWithAttendance[]>([]);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), "yyyy-MM-dd");

  const fetchData = async () => {
    if (!user) return;
    const [childrenRes, profileRes] = await Promise.all([
      supabase
        .from("children")
        .select("id, name, child_id_number, parent_name")
        .eq("provider_id", user.id),
      supabase
        .from("profiles")
        .select("daycare_name, provider_name, provider_number")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const { data: childrenData, error: childErr } = childrenRes;

    if (childErr) { toast.error(childErr.message); return; }
    setProviderProfile(profileRes.data || null);

    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("*")
      .eq("date", today)
      .in("child_id", (childrenData || []).map(c => c.id));

    const merged = (childrenData || []).map(child => ({
      ...child,
      attendance: (attendanceData || []).find(a => a.child_id === child.id),
    }));

    setChildren(merged);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const recordTime = async (childId: string, field: string) => {
    const now = new Date().toISOString();
    const existing = children.find(c => c.id === childId)?.attendance;

    if (existing) {
      await supabase.from("attendance").update({ [field]: now }).eq("id", existing.id);
    } else {
      await supabase.from("attendance").insert({ child_id: childId, date: today, [field]: now });
    }
    toast.success("Time recorded!");
    fetchData();
  };

  type AttendanceStep = "check_in" | "out_choice" | "in_school" | "out_pm" | "finished";

  const getStep = (child: ChildWithAttendance): AttendanceStep => {
    const a = child.attendance;
    if (!a || !a.check_in_am) return "check_in";
    if (!a.check_out_am && !a.check_out_pm) return "out_choice";
    if (a.check_out_am && !a.check_in_pm) return "in_school";
    if (a.check_in_pm && !a.check_out_pm) return "out_pm";
    return "finished";
  };

  const markAbsent = async (childId: string) => {
    const existing = children.find(c => c.id === childId)?.attendance;
    if (existing) {
      await supabase.from("attendance").update({ marked_absent: true }).eq("id", existing.id);
    } else {
      await supabase.from("attendance").insert({ child_id: childId, date: today, marked_absent: true });
    }
    toast.success("Marked absent");
    fetchData();
  };

  const getStatus = (child: ChildWithAttendance) => {
    if (!child.attendance) return "pending";
    if (child.attendance.marked_absent) return "absent";
    if (getStep(child) === "finished") return "finished";
    if (child.attendance.check_in_am) return "present";
    return "pending";
  };

  const presentCount = children.filter(c => ["present", "finished"].includes(getStatus(c))).length;
  const absentCount = children.filter(c => getStatus(c) === "absent").length;
  const pendingCount = children.filter(c => getStatus(c) === "pending").length;
  const missingProviderInfo = !providerProfile?.daycare_name || !providerProfile?.provider_name || !providerProfile?.provider_number;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      {missingProviderInfo && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Complete provider info before monthly reports</p>
                <p className="text-sm text-muted-foreground">
                  Add daycare name, provider name, and provider number in Account Settings.
                </p>
              </div>
            </div>
            <Link to="/settings">
              <Button size="sm" variant="outline" className="border-warning/40">Open Settings</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{children.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{presentCount}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{absentCount}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Children list */}
      {children.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-heading font-semibold text-lg mb-1">No children yet</h3>
            <p className="text-muted-foreground mb-4">Add children to start tracking attendance</p>
            <Link to="/children">
              <Button>Add Children</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Today's Attendance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {children.map(child => {
              const status = getStatus(child);
              return (
                <div key={child.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-heading font-bold text-primary">
                      {child.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{child.name}</p>
                      <p className="text-xs text-muted-foreground">{child.parent_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={status === "present" ? "default" : status === "absent" ? "destructive" : status === "finished" ? "outline" : "secondary"} className="text-xs">
                      {status === "present" && "Present"}
                      {status === "absent" && "Absent"}
                      {status === "pending" && "Pending"}
                      {status === "finished" && "Finished"}
                    </Badge>
                    {status !== "absent" && status !== "finished" && (() => {
                      const step = getStep(child);
                      if (step === "check_in") return (
                        <Button size="sm" variant="outline" onClick={() => recordTime(child.id, "check_in_am")}>
                          <Clock className="w-3 h-3 mr-1" /> Check In
                        </Button>
                      );
                      if (step === "out_choice") return (
                        <>
                          <Button size="sm" variant="outline" onClick={() => recordTime(child.id, "check_out_am")}>
                            Out (School)
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => recordTime(child.id, "check_out_pm")}>
                            Out PM
                          </Button>
                        </>
                      );
                      if (step === "in_school") return (
                        <Button size="sm" variant="outline" onClick={() => recordTime(child.id, "check_in_pm")}>
                          In (School)
                        </Button>
                      );
                      if (step === "out_pm") return (
                        <Button size="sm" variant="outline" onClick={() => recordTime(child.id, "check_out_pm")}>
                          Out PM
                        </Button>
                      );
                      return null;
                    })()}
                    {status !== "absent" && status !== "finished" && (
                      <Button size="sm" variant="ghost" onClick={() => markAbsent(child.id)} className="text-destructive">
                        <XCircle className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">{pendingCount} children have not been checked in today</span>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
