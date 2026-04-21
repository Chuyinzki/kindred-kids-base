import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BillingProvider, useBilling } from "@/contexts/BillingContext";
import AppLayout from "@/components/AppLayout";
import BillingGate from "@/components/BillingGate";
import Auth from "@/pages/Auth";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Children from "@/pages/Children";
import AttendanceHistory from "@/pages/AttendanceHistory";
import Kiosk from "@/pages/Kiosk";
import SettingsPage from "@/pages/Settings";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import CoppaNotice from "@/pages/CoppaNotice";
import Terms from "@/pages/Terms";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({
  children,
  allowBlocked = false,
}: {
  children: React.ReactNode;
  allowBlocked?: boolean;
}) => {
  const { session, loading } = useAuth();
  const { loading: billingLoading, isBlocked } = useBilling();
  if (loading || billingLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!session) return <Navigate to="/auth" replace />;
  if (isBlocked && !allowBlocked) return <AppLayout><BillingGate /></AppLayout>;
  return <AppLayout>{children}</AppLayout>;
};

const AuthRoute = () => {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (session) return <Navigate to="/dashboard" replace />;
  return <Auth />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BillingProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<AuthRoute />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/coppa-notice" element={<CoppaNotice />} />
              <Route path="/kiosk" element={<Kiosk />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/children" element={<ProtectedRoute><Children /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><AttendanceHistory /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute allowBlocked><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BillingProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
