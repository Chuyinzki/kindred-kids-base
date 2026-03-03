import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Baby, LayoutDashboard, Users, ClipboardCheck, MonitorSmartphone, LogOut, Settings, History } from "lucide-react";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [daycareName, setDaycareName] = useState(
    () => localStorage.getItem("daycare_name") || "Little Stars"
  );

  useEffect(() => {
    const fetchName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("daycare_name, provider_name")
        .eq("user_id", user.id)
        .single();
      if (data?.daycare_name) setDaycareName(data.daycare_name);
      else if (data?.provider_name) setDaycareName(data.provider_name);
    };
    fetchName();
  }, [user]);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const custom = event as CustomEvent<{ daycareName?: string }>;
      const nextName = custom.detail?.daycareName || localStorage.getItem("daycare_name") || "Little Stars";
      setDaycareName(nextName);
    };
    window.addEventListener("daycare-name-updated", onUpdated);
    return () => window.removeEventListener("daycare-name-updated", onUpdated);
  }, []);

  useEffect(() => {
    document.title = daycareName ? `${daycareName} | Kindred Kids` : "Kindred Kids";
  }, [daycareName]);

  const enterKioskMode = async () => {
    if (user?.id) {
      sessionStorage.setItem("kiosk_provider_id", user.id);
    }
    await signOut();
    navigate("/kiosk");
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/children", icon: Users, label: "Children" },
    { to: "/attendance", icon: ClipboardCheck, label: "Attendance" },
    { to: "/history", icon: History, label: "History" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Baby className="w-5 h-5 text-primary" />
            </div>
            <span className="font-heading font-bold text-lg hidden sm:inline">{daycareName}</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map(item => (
              <Link key={item.to} to={item.to}>
                <Button
                  variant={location.pathname === item.to || (item.to === "/dashboard" && location.pathname === "/") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Button>
              </Link>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 ml-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
              onClick={enterKioskMode}
            >
              <MonitorSmartphone className="w-4 h-4" />
              <span className="hidden md:inline">Kiosk</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="ml-2">
              <LogOut className="w-4 h-4" />
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-border/70 bg-card/40">
        <div className="container px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground/80">
            Built with love for my mom, Georgina, and originally created for her daycare, Blossom Kids.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
