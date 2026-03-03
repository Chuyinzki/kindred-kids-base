import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Baby, LayoutDashboard, Users, ClipboardCheck, MonitorSmartphone, LogOut, Settings, History } from "lucide-react";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [daycareName, setDaycareName] = useState("Little Stars");

  useEffect(() => {
    const fetchName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("daycare_name, provider_name")
        .eq("user_id", user.id)
        .single();
      if ((data as any)?.daycare_name) setDaycareName((data as any).daycare_name);
      else if (data?.provider_name) setDaycareName(data.provider_name);
    };
    fetchName();
  }, [user]);

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
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
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Baby className="w-5 h-5 text-primary" />
            </div>
            <span className="font-heading font-bold text-lg hidden sm:inline">{daycareName}</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map(item => (
              <Link key={item.to} to={item.to}>
                <Button
                  variant={location.pathname === item.to ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Button>
              </Link>
            ))}
            <Link to="/kiosk">
              <Button variant="outline" size="sm" className="gap-2 ml-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground">
                <MonitorSmartphone className="w-4 h-4" />
                <span className="hidden md:inline">Kiosk</span>
              </Button>
            </Link>
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
    </div>
  );
};

export default AppLayout;
