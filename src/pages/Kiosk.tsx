import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Clock, LogIn, LogOut, Maximize, Minimize, MonitorSmartphone, XCircle } from "lucide-react";

type KioskStep = "select-child" | "enter-pin" | "action" | "done" | "expired";
type AttendanceStep = "check_in" | "out_choice" | "in_school" | "out_pm" | "finished";

interface ChildInfo {
  id: string;
  name: string;
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

const INACTIVITY_TIMEOUT = 12000;

const Kiosk = () => {
  const kioskToken = sessionStorage.getItem("kiosk_session_token");
  const [daycareName, setDaycareName] = useState(sessionStorage.getItem("kiosk_daycare_name") || "Kindred Kids");
  const [step, setStep] = useState<KioskStep>(kioskToken ? "select-child" : "expired");
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildInfo | null>(null);
  const [childAttendance, setChildAttendance] = useState<AttendanceRecord | null>(null);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pullStartYRef = useRef<number | null>(null);

  const resetKiosk = useCallback(() => {
    setStep(kioskToken ? "select-child" : "expired");
    setSelectedChild(null);
    setChildAttendance(null);
    setPin("");
    setMessage("");
  }, [kioskToken]);

  const restartTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (step !== "select-child" && step !== "expired") {
      timerRef.current = setTimeout(resetKiosk, INACTIVITY_TIMEOUT);
    }
  }, [resetKiosk, step]);

  const fetchChildren = useCallback(async () => {
    if (!kioskToken) {
      setChildren([]);
      setStep("expired");
      return;
    }

    const { data, error } = await supabase.rpc("kiosk_list_children", {
      session_token: kioskToken,
    });

    if (error) {
      setChildren([]);
      setStep("expired");
      return;
    }

    setChildren(data || []);
  }, [kioskToken]);

  useEffect(() => {
    void fetchChildren();
  }, [fetchChildren]);

  useEffect(() => {
    restartTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [restartTimer]);

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
    document.body.classList.add("kiosk-mode");
    document.documentElement.classList.add("kiosk-mode");

    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);

    return () => {
      document.body.classList.remove("kiosk-mode");
      document.documentElement.classList.remove("kiosk-mode");
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, []);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const custom = event as CustomEvent<{ daycareName?: string }>;
      setDaycareName(custom.detail?.daycareName || sessionStorage.getItem("kiosk_daycare_name") || "Kindred Kids");
    };
    window.addEventListener("daycare-name-updated", onUpdated);
    return () => window.removeEventListener("daycare-name-updated", onUpdated);
  }, []);

  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      pullStartYRef.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      const startY = pullStartYRef.current;
      const currentY = event.touches[0]?.clientY;
      if (startY === null || currentY === undefined) return;

      if (window.scrollY <= 0 && currentY - startY > 12) {
        event.preventDefault();
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen();
    } catch {
      toast.error("Fullscreen is not available on this device/browser.");
    }
  };

  const handleSelectChild = (child: ChildInfo) => {
    setSelectedChild(child);
    setPin("");
    setChildAttendance(null);
    setStep("enter-pin");
  };

  const getAttendanceStep = (): AttendanceStep => {
    const record = childAttendance;
    if (!record || !record.check_in_am) return "check_in";
    if (!record.check_out_am && !record.check_out_pm) return "out_choice";
    if (record.check_out_am && !record.check_in_pm) return "in_school";
    if (record.check_in_pm && !record.check_out_pm) return "out_pm";
    return "finished";
  };

  const loadChildState = async (nextPin: string) => {
    if (!selectedChild || !kioskToken) return;

    const { data, error } = await supabase.rpc("kiosk_get_child_state", {
      session_token: kioskToken,
      child_uuid: selectedChild.id,
      entered_pin: nextPin,
    });

    if (error) {
      if (error.message.toLowerCase().includes("expired")) {
        setStep("expired");
      } else {
        toast.error("Incorrect PIN");
      }
      setPin("");
      return;
    }

    setChildAttendance(data?.[0] ?? null);
    setStep("action");
  };

  const recordAttendance = async (actionName: string) => {
    if (!selectedChild || !kioskToken) return;

    const { data, error } = await supabase.rpc("kiosk_record_attendance", {
      session_token: kioskToken,
      child_uuid: selectedChild.id,
      entered_pin: pin,
      action_name: actionName,
    });

    if (error) {
      if (error.message.toLowerCase().includes("expired")) {
        setStep("expired");
      } else {
        toast.error(error.message);
      }
      return;
    }

    const result = data?.[0];
    setMessage(`${result?.message || selectedChild.name} at ${format(new Date(), "h:mm a")}`);
    if (result) {
      setChildAttendance({
        id: result.attendance_id,
        check_in_am: result.check_in_am,
        check_out_am: result.check_out_am,
        check_in_pm: result.check_in_pm,
        check_out_pm: result.check_out_pm,
        marked_absent: result.marked_absent,
      });
    }
    void fetchChildren();
    setStep("done");
    setTimeout(resetKiosk, 4000);
  };

  const pinDigit = (digit: string) => {
    const nextPin = `${pin}${digit}`;
    setPin(nextPin);
    if (nextPin.length === 4) {
      setTimeout(() => {
        void loadChildState(nextPin);
      }, 150);
    }
  };

  return (
    <div className="kiosk-shell h-[100dvh] overflow-y-auto bg-background px-4 py-4">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center py-4">
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              {isFullscreen ? "Exit Full Screen" : "Full Screen"}
            </Button>
          </div>
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
            <MonitorSmartphone className="w-8 h-8 text-primary" />
          </div>
          <p className="font-heading text-xl font-bold mb-1">{daycareName}</p>
          <h1 className="font-heading text-2xl font-bold">Kiosk Mode</h1>
          <p className="text-muted-foreground text-sm">Tap your child's name to check in or out</p>
        </div>

        {step === "expired" && (
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <p className="font-semibold">Kiosk session unavailable</p>
              <p className="text-sm text-muted-foreground">Return to the provider dashboard and launch kiosk mode again.</p>
            </CardContent>
          </Card>
        )}

        {step === "select-child" && (
          <div className="space-y-2 animate-fade-in">
            {children.map((child) => (
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
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold ${pin.length > index ? "border-primary bg-primary/10" : "border-border"}`}
                  >
                    {pin.length > index ? "*" : ""}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "Back"].map((digit) => (
                  <Button
                    key={digit || "blank"}
                    variant="outline"
                    className="h-14 text-xl font-bold"
                    disabled={digit === ""}
                    onClick={() => {
                      if (digit === "Back") setPin((current) => current.slice(0, -1));
                      else if (digit) pinDigit(digit);
                    }}
                  >
                    {digit}
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
          const attendanceStep = getAttendanceStep();
          const isAbsent = childAttendance?.marked_absent;
          return (
            <div className="space-y-3 animate-scale-in">
              <p className="text-center font-heading font-semibold text-lg mb-4">Hi, parent of {selectedChild.name}!</p>
              {isAbsent && (
                <p className="text-center text-muted-foreground">Already marked absent today.</p>
              )}
              {attendanceStep === "finished" && !isAbsent && (
                <p className="text-center text-muted-foreground">All done for today!</p>
              )}
              {attendanceStep === "check_in" && !isAbsent && (
                <>
                  <Button className="w-full h-16 text-lg gap-3 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => void recordAttendance("check_in_am")}>
                    <LogIn className="w-6 h-6" /> Check In
                  </Button>
                  <Button variant="outline" className="w-full h-14 gap-3 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => void recordAttendance("mark_absent")}>
                    <XCircle className="w-5 h-5" /> Mark Absent
                  </Button>
                </>
              )}
              {attendanceStep === "out_choice" && (
                <>
                  <Button variant="outline" className="w-full h-14 text-lg gap-3" onClick={() => void recordAttendance("check_out_am")}>
                    <LogOut className="w-6 h-6" /> Out (School)
                  </Button>
                  <Button className="w-full h-16 text-lg gap-3 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => void recordAttendance("check_out_pm")}>
                    <LogOut className="w-6 h-6" /> Out PM
                  </Button>
                </>
              )}
              {attendanceStep === "in_school" && (
                <Button className="w-full h-16 text-lg gap-3 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => void recordAttendance("check_in_pm")}>
                  <LogIn className="w-6 h-6" /> In (School)
                </Button>
              )}
              {attendanceStep === "out_pm" && (
                <Button className="w-full h-16 text-lg gap-3 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => void recordAttendance("check_out_pm")}>
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
