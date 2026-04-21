import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ProviderProfile } from "@/lib/billing";
import { hasBillingAccess, isBillingBlocked } from "@/lib/billing";

interface BillingContextType {
  profile: ProviderProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  hasAccess: boolean;
  isBlocked: boolean;
}

const BillingContext = createContext<BillingContextType>({
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  hasAccess: false,
  isBlocked: false,
});

export const useBilling = () => useContext(BillingContext);

export const BillingProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    setProfile(data ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void refreshProfile();
  }, [user]);

  return (
    <BillingContext.Provider
      value={{
        profile,
        loading,
        refreshProfile,
        hasAccess: hasBillingAccess(profile),
        isBlocked: isBillingBlocked(profile),
      }}
    >
      {children}
    </BillingContext.Provider>
  );
};
