import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { Baby, LogIn, LogOut, ArrowLeft, Clock, XCircle, MonitorSmartphone } from "lucide-react";

type KioskStep = "select-child" | "enter-pin" | "action" | "done";
type AttendanceStep = "check_in" | "out_choice" | "in_school" | "out_pm" | "finished";

interface ChildInfo {
  id: string;
  name: string;
  family_pin: string;
  parent_name: string;
}

interface AttendanceRecord {
  id: string;
  check_in_am: string | null;
  check_out_am: string | null;
  check_in_pm: string | null;
  check_out_pm: string | null;
  marked_absent: boolean;
}

const INACTIVITY_TIMEOUT = 12000; // 12 seconds

const Kiosk = () => {
  const { session, signOut } = useAuth();
  const [daycareName, setDaycareName] = useState(localStorage.getItem("daycare_name") || "Kindred Kids");
  const [step, setStep] = useState<KioskStep>("select-child");
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildInfo | null>(null);
  const [childAttendance, setChildAttendance] = useState<AttendanceRecord | null>(null);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetKiosk = useCallback(() => {
    setStep("select-child");
    setSelectedChild(null);
    setChildAttendance(null);
    setPin("");
    setMessage("");
  }, []);

  const restartTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (step !== "select-child") {
      timerRef.current = setTimeout(resetKiosk, INACTIVITY_TIMEOUT);
    }
  }, [step, resetKiosk]);

  useEffect(() => {
    restartTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [step, restartTimer]);

  useEffect(() => {
    const handler = () => restartTimer();
    window.addEventListener("touchstart", handler);
    window.addEventListener("click", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    };
  }, [restartTimer]);

  useEffect(() => {
    // Kiosk mode is intentionally anonymous. Any existing admin session is cleared.
    if (session) void signOut();
  }, [session, signOut]);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const custom = event as CustomEvent<{ daycareName?: string }>;
      const next = custom.detail?.daycareName || localStorage.getItem("daycare_name") || "Kindred Kids";
      setDaycareName(next);
    };
    window.addEventListener("daycare-name-updated", onUpdated);
    return () => window.removeEventListener("daycare-name-updated", onUpdated);
  }, []);

  useEffect(() => {
    const fetchChildren = async () => {
      const scopedProviderId = session?.user?.id || sessionStorage.getItem("kiosk_provider_id");
      if (!scopedProviderId) {
        setChildren([]);
        return;
      }

      const { data } = await supabase
        .from("children")
        .select("id, name, family_pin, parent_name")
        .eq("provider_id", scopedProviderId)
        .order("name");
      setChildren(data || []);
    };
    fetchChildren();
  }, [session]);

  const handleSelectChild = async (child: ChildInfo) => {
    setSelectedChild(child);
    // Fetch today's attendance for this child
    const today = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase
      .from("attendance")
      .select("id, check_in_am, check_out_am, check_in_pm, check_out_pm, marked_absent")
      .eq("child_id", child.id)
      .eq("date", today)
      .maybeSingle();
    setChildAttendance(data || null);
    setStep("enter-pin");
  };

  const getAttendanceStep = (): AttendanceStep => {
    const a = childAttendance;
    if (!a || !a.check_in_am) return "check_in";
    if (!a.check_out_am && !a.check_out_pm) return "out_choice";
    if (a.check_out_am && !a.check_in_pm) return "in_school";
    if (a.check_in_pm && !a.check_out_pm) return "out_pm";
    return "finished";
  };

  const recordTime = async (field: string) => {
    if (!selectedChild) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const now = new Date().toISOString();

    if (childAttendance) {
      await supabase.from("attendance").update({ [field]: now }).eq("id", childAttendance.id);
    } else {
      await supabase.from("attendance").insert({ child_id: selectedChild.id, date: today, [field]: now });
    }

    const labels: Record<string, string> = {
      check_in_am: "checked in",
      check_out_am: "checked out for school",
      check_in_pm: "checked in from school",
      check_out_pm: "checked out",
    };
    setMessage(`${selectedChild.name} ${labels[field] || "recorded"} at ${format(new Date(), "h:mm a")}`);
    setStep("done");
    setTimeout(resetKiosk, 4000);
  };

  const markAbsent = async () => {
    if (!selectedChild) return;
    const today = format(new Date(), "yyyy-MM-dd");

    if (childAttendance) {
      await supabase.from("attendance").update({ marked_absent: true }).eq("id", childAttendance.id);
    } else {
      await supabase.from("attendance").insert({ child_id: selectedChild.id, date: today, marked_absent: true });
    }
    setMessage(`${selectedChild.name} marked absent`);
    setStep("done");
    setTimeout(resetKiosk, 4000);
  };

  const pinDigit = (d: string) => {
    const newPin = pin + d;
    setPin(newPin);
    if (newPin.length === 4) {
      setTimeout(() => {
        if (selectedChild && newPin === selectedChild.family_pin) {
          setStep("action");
        } else {
          toast.error("Incorrect PIN");
          setPin("");
        }
      }, 200);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
            <MonitorSmartphone className="w-8 h-8 text-primary" />
          </div>
          <p className="font-heading text-xl font-bold mb-1">{daycareName}</p>
          <h1 className="font-heading text-2xl font-bold">Kiosk Mode</h1>
          <p className="text-muted-foreground text-sm">Tap your child's name to check in or out</p>
        </div>

        {step === "select-child" && (
          <div className="space-y-2 animate-fade-in">
            {children.map(child => (
              <Button
                key={child.id}
                variant="outline"
                className="w-full h-16 justify-start text-left gap-3 text-lg"
                onClick={() => handleSelectChild(child)}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-heading font-bold text-primary">
                  {child.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{child.name}</p>
                  <p className="text-xs text-muted-foreground">{child.parent_name}</p>
                </div>
              </Button>
            ))}
            {children.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No children enrolled</p>
            )}
          </div>
        )}

        {step === "enter-pin" && (
          <Card className="animate-scale-in">
            <CardContent className="p-6 space-y-6">
              <div className="text-center">
                <p className="font-heading font-semibold text-lg mb-1">Enter Family PIN</p>
                <p className="text-sm text-muted-foreground">for {selectedChild?.name}</p>
              </div>
              <div className="flex justify-center gap-3">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold ${pin.length > i ? "border-primary bg-primary/10" : "border-border"}`}>
                    {pin.length > i ? "•" : ""}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9","","0","⌫"].map(d => (
                  <Button
                    key={d}
                    variant="outline"
                    className="h-14 text-xl font-bold"
                    disabled={d === ""}
                    onClick={() => {
                      if (d === "⌫") setPin(p => p.slice(0,-1));
                      else if (d) pinDigit(d);
                    }}
                  >
                    {d}
                  </Button>
                ))}
              </div>
              <Button variant="ghost" className="w-full" onClick={resetKiosk}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "action" && selectedChild && (() => {
          const aStep = getAttendanceStep();
          const isAbsent = childAttendance?.marked_absent;
          return (
            <div className="space-y-3 animate-scale-in">
              <p className="text-center font-heading font-semibold text-lg mb-4">
                Hi, {selectedChild.name}! 👋
              </p>
              {isAbsent && (
                <p className="text-center text-muted-foreground">Already marked absent today.</p>
              )}
              {aStep === "finished" && !isAbsent && (
                <p className="text-center text-muted-foreground">All done for today! ✅</p>
              )}
              {aStep === "check_in" && !isAbsent && (
                <>
                  <Button className="w-full h-16 text-lg gap-3 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => recordTime("check_in_am")}>
                    <LogIn className="w-6 h-6" /> Check In
                  </Button>
                  <Button variant="outline" className="w-full h-14 gap-3 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={markAbsent}>
                    <XCircle className="w-5 h-5" /> Mark Absent
                  </Button>
                </>
              )}
              {aStep === "out_choice" && (
                <>
                  <Button variant="outline" className="w-full h-14 text-lg gap-3" onClick={() => recordTime("check_out_am")}>
                    <LogOut className="w-6 h-6" /> Out (School)
                  </Button>
                  <Button className="w-full h-16 text-lg gap-3 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => recordTime("check_out_pm")}>
                    <LogOut className="w-6 h-6" /> Out PM
                  </Button>
                </>
              )}
              {aStep === "in_school" && (
                <Button className="w-full h-16 text-lg gap-3 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => recordTime("check_in_pm")}>
                  <LogIn className="w-6 h-6" /> In (School)
                </Button>
              )}
              {aStep === "out_pm" && (
                <Button className="w-full h-16 text-lg gap-3 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => recordTime("check_out_pm")}>
                  <LogOut className="w-6 h-6" /> Out PM
                </Button>
              )}
              <Button variant="ghost" className="w-full" onClick={resetKiosk}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
              </Button>
            </div>
          );
        })()}

        {step === "done" && (
          <Card className="animate-scale-in">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-accent" />
              </div>
              <p className="font-heading font-semibold text-lg">{message}</p>
              <p className="text-sm text-muted-foreground mt-2">Returning to home screen...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Kiosk;
