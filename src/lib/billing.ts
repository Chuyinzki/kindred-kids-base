import type { Tables } from "@/integrations/supabase/types";

export type ProviderProfile = Tables<"profiles">;
export type SubscriptionStatus = ProviderProfile["subscription_status"];

export const ACCESSIBLE_STATUSES: SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
];

export const BLOCKED_STATUSES: SubscriptionStatus[] = [
  "unpaid",
  "expired",
  "incomplete",
  "incomplete_expired",
  "not_started",
];

export const hasBillingAccess = (profile: Pick<ProviderProfile, "subscription_status" | "current_period_ends_at" | "is_complimentary"> | null) => {
  if (!profile) return false;
  if (profile.is_complimentary) return true;
  if (profile.subscription_status === "canceled") {
    return !profile.current_period_ends_at || new Date(profile.current_period_ends_at).getTime() > Date.now();
  }
  return ACCESSIBLE_STATUSES.includes(profile.subscription_status);
};

export const isBillingBlocked = (profile: Pick<ProviderProfile, "subscription_status" | "current_period_ends_at" | "is_complimentary"> | null) =>
  !hasBillingAccess(profile);

export const isTrialEndingSoon = (trialEndsAt: string | null) => {
  if (!trialEndsAt) return false;
  const endsAt = new Date(trialEndsAt).getTime();
  const diff = endsAt - Date.now();
  return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000;
};

export const formatSubscriptionLabel = (status: SubscriptionStatus, isComplimentary = false) => {
  if (isComplimentary) return "Complimentary";
  switch (status) {
    case "trialing":
      return "Free trial";
    case "active":
      return "Active";
    case "past_due":
      return "Past due";
    case "canceled":
      return "Canceled";
    case "unpaid":
      return "Unpaid";
    case "expired":
      return "Expired";
    case "incomplete":
      return "Incomplete";
    case "incomplete_expired":
      return "Incomplete expired";
    default:
      return "Not started";
  }
};

export const formatSubscriptionTone = (
  status: SubscriptionStatus,
  isComplimentary = false,
): "default" | "secondary" | "destructive" | "outline" => {
  if (isComplimentary) return "secondary";
  switch (status) {
    case "active":
      return "default";
    case "trialing":
    case "canceled":
      return "secondary";
    case "past_due":
      return "outline";
    default:
      return "destructive";
  }
};
