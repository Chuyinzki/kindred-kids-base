import { Link } from "react-router-dom";
import { AlertCircle, CreditCard, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useBilling } from "@/contexts/BillingContext";
import { isTrialEndingSoon } from "@/lib/billing";

const BillingBanner = () => {
  const { profile, isBlocked } = useBilling();

  if (!profile) return null;
  if (profile.is_complimentary) return null;

  if (isBlocked) {
    return (
      <Alert className="mb-6 border-destructive/30 bg-destructive/5">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Subscription required</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>Your provider account needs an active subscription to keep using attendance, reports, and kiosk mode.</span>
          <Link to="/settings">
            <Button size="sm">Open Billing</Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (profile.subscription_status === "past_due") {
    return (
      <Alert className="mb-6 border-warning/40 bg-warning/5">
        <CreditCard className="h-4 w-4" />
        <AlertTitle>Payment needs attention</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>Your subscription is still active for now, but your latest payment needs to be updated.</span>
          <Link to="/settings">
            <Button size="sm" variant="outline">Manage Billing</Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (profile.subscription_status === "canceled" && profile.current_period_ends_at) {
    return (
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Subscription ends soon</AlertTitle>
        <AlertDescription>
          Your access stays active until {format(new Date(profile.current_period_ends_at), "MMMM d, yyyy")}. Reopen billing if you want to keep the account live.
        </AlertDescription>
      </Alert>
    );
  }

  if (profile.subscription_status === "trialing" && isTrialEndingSoon(profile.trial_ends_at)) {
    return (
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Trial ending soon</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>Your free trial ends on {profile.trial_ends_at ? format(new Date(profile.trial_ends_at), "MMMM d, yyyy") : "soon"}.</span>
          <Link to="/settings">
            <Button size="sm">Add Billing</Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default BillingBanner;
