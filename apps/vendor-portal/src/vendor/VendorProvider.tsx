import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type VendorRecord = {
  id: string; slug: string; business_name: string; status: string; visibility: string;
  primary_image_url: string | null; trial_ends_at: string | null;
} | null;

export type SubscriptionRecord = {
  id: string; status: string; plan_id: string | null;
  trial_ends_at: string | null; grace_until: string | null; current_period_end: string | null;
} | null;

type Ctx = {
  vendor: VendorRecord;
  subscription: SubscriptionRecord;
  loading: boolean;
  /** approved + a usable subscription (trial/active/grace) */
  isActive: boolean;
};

const VendorContext = createContext<Ctx | undefined>(undefined);

export function VendorProvider({ children }: { children: React.ReactNode }) {
  const vendorQ = useQuery({
    queryKey: ["my-vendor"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("vendors")
        .select("id,slug,business_name,status,visibility,primary_image_url,trial_ends_at")
        .eq("owner_id", user.id).is("deleted_at", null).maybeSingle();
      return (data as VendorRecord) ?? null;
    },
  });

  const subQ = useQuery({
    queryKey: ["my-subscription", vendorQ.data?.id],
    enabled: !!vendorQ.data?.id,
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions")
        .select("id,status,plan_id,trial_ends_at,grace_until,current_period_end")
        .eq("vendor_id", vendorQ.data!.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return (data as SubscriptionRecord) ?? null;
    },
  });

  const subscription = subQ.data ?? null;
  const isActive = !!vendorQ.data && vendorQ.data.status === "active"
    && !!subscription && ["trialing", "active", "grace"].includes(subscription.status);

  return (
    <VendorContext.Provider value={{ vendor: vendorQ.data ?? null, subscription, loading: vendorQ.isLoading, isActive }}>
      {children}
    </VendorContext.Provider>
  );
}

export function useVendorContext(): Ctx {
  const ctx = useContext(VendorContext);
  if (!ctx) throw new Error("useVendorContext must be used within VendorProvider");
  return ctx;
}
