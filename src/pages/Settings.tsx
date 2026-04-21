import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useTheme } from "next-themes";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBilling } from "@/contexts/BillingContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { formatSubscriptionLabel, formatSubscriptionTone } from "@/lib/billing";
import { PLAN_INTERVAL, PLAN_NAME, PLAN_PRICE, SUPPORT_EMAIL, TRIAL_DAYS } from "@/lib/brand";

const SettingsPage = () => {
  const { user } = useAuth();
  const { profile, refreshProfile } = useBilling();
  const { resolvedTheme, setTheme } = useTheme();
  const [providerNumber, setProviderNumber] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerAltId, setProviderAltId] = useState("");
  const [daycareName, setDaycareName] = useState("");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setProviderNumber(data.provider_number || "");
        setProviderName(data.provider_name || "");
        setProviderAltId(data.provider_alt_id || "");
        setDaycareName(data.daycare_name || "");
      }
      setLoading(false);
    };
    void fetch();
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;

    if (checkout === "success") {
      toast.success("Billing updated. Refreshing your account status...");
      void refreshProfile();
    } else if (checkout === "canceled") {
      toast.message("Checkout canceled");
    }

    params.delete("checkout");
    const nextQuery = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`);
  }, [refreshProfile]);

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        provider_number: providerNumber || null,
        provider_name: providerName || null,
        provider_alt_id: providerAltId || null,
        daycare_name: daycareName || null,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    const updatedName = daycareName.trim() || providerName.trim() || "Kindred Kids";
    localStorage.setItem("daycare_name", updatedName);
    window.dispatchEvent(new CustomEvent("daycare-name-updated", { detail: { daycareName: updatedName } }));
    toast.success("Settings saved");
    await refreshProfile();
  };

  const startCheckout = async () => {
    setBillingLoading(true);
    const { data, error } = await supabase.functions.invoke("create-checkout-session", { body: {} });
    setBillingLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data?.url) window.location.href = data.url;
  };

  const openPortal = async () => {
    setBillingLoading(true);
    const { data, error } = await supabase.functions.invoke("create-customer-portal", { body: {} });
    setBillingLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data?.url) window.location.href = data.url;
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="font-heading text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Provider information and billing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Provider Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Daycare Name</Label>
            <Input value={daycareName} onChange={(e) => setDaycareName(e.target.value)} placeholder="e.g. Little Stars Daycare" />
          </div>
          <div className="space-y-1">
            <Label>Provider Name</Label>
            <Input value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-1">
            <Label>Provider #</Label>
            <Input value={providerNumber} onChange={(e) => setProviderNumber(e.target.value)} placeholder="e.g. 12345" />
          </div>
          <div className="space-y-1">
            <Label>Provider Alt ID</Label>
            <Input value={providerAltId} onChange={(e) => setProviderAltId(e.target.value)} placeholder="Optional" />
          </div>
          <Button onClick={handleSave} className="w-full">
            <Save className="w-4 h-4 mr-2" /> Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Billing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{PLAN_NAME}</p>
              <p className="text-sm text-muted-foreground">${PLAN_PRICE}/{PLAN_INTERVAL} with a {TRIAL_DAYS}-day free trial</p>
            </div>
            {profile && (
              <Badge variant={formatSubscriptionTone(profile.subscription_status)}>
                {formatSubscriptionLabel(profile.subscription_status)}
              </Badge>
            )}
          </div>

          {profile?.trial_ends_at && (
            <p className="text-sm text-muted-foreground">
              Trial ends on {format(new Date(profile.trial_ends_at), "MMMM d, yyyy")}.
            </p>
          )}

          {profile?.current_period_ends_at && (
            <p className="text-sm text-muted-foreground">
              Current billing period ends on {format(new Date(profile.current_period_ends_at), "MMMM d, yyyy")}.
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={startCheckout} disabled={billingLoading}>
              {profile?.stripe_customer_id ? "Update Subscription" : "Start Subscription"}
            </Button>
            {profile?.stripe_customer_id && (
              <Button variant="outline" onClick={openPortal} disabled={billingLoading}>
                Manage Billing
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Need help with billing or invoices? Contact {SUPPORT_EMAIL}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Account Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="font-medium text-sm">Dark theme</p>
              <p className="text-xs text-muted-foreground">Use a darker color palette in the app.</p>
            </div>
            <Switch
              checked={mounted && resolvedTheme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              disabled={!mounted}
              aria-label="Toggle dark theme"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
