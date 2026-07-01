import { CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBilling } from "@/contexts/BillingContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BillingGate = () => {
  const { profile, refreshProfile } = useBilling();

  const startSubscription = async () => {
    const { data, error } = await supabase.functions.invoke("create-checkout-session", { body: {} });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data?.url) {
      window.location.href = data.url;
      return;
    }
    toast.error("Unable to start checkout right now.");
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Billing is paused</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="font-semibold">Temporary free access</p>
          <p className="text-sm text-muted-foreground">Your account can keep using the app while billing is paused.</p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2"><Lock className="w-4 h-4" /> Attendance, reports, and kiosk access stay available while billing is paused.</p>
          <p className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Your existing data stays in place if you choose to re-enable billing later.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={startSubscription}>Start Subscription</Button>
          {profile?.stripe_customer_id && (
            <Button
              variant="outline"
              onClick={async () => {
                const { data, error } = await supabase.functions.invoke("create-customer-portal", { body: {} });
                if (error) {
                  toast.error(error.message);
                  return;
                }
                if (data?.url) window.location.href = data.url;
              }}
            >
              Manage Billing
            </Button>
          )}
          <Button variant="ghost" onClick={() => void refreshProfile()}>Refresh Status</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BillingGate;
