import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// All reads are RLS-scoped: a vendor sees only rows for vendors they own.

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles")
        .select("id,full_name,email,phone,avatar_url,preferred_currency").eq("id", user.id).maybeSingle();
      return data;
    },
  });
}

export function useMyApplication() {
  return useQuery({
    queryKey: ["my-application"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("vendor_applications")
        .select("id,status,business_name,is_reapplication,rejection_reason,submitted_at,created_at")
        .eq("applicant_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });
}

export function useVendorBookings(vendorId?: string) {
  return useQuery({
    queryKey: ["v-bookings", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings")
        .select("id,reference_no,status,event_date,amount,currency,client_id,profiles:client_id(full_name)")
        .eq("vendor_id", vendorId!).order("event_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useVendorBooking(id: string) {
  return useQuery({
    queryKey: ["v-booking", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings")
        .select("*,profiles:client_id(full_name,email)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useVendorQuotations(vendorId?: string) {
  return useQuery({
    queryKey: ["v-quotations", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase.from("quotations")
        .select("id,reference_no,status,total,currency,valid_until,request_details,created_at,client_id,profiles:client_id(full_name)")
        .eq("vendor_id", vendorId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: ["v-quotation", id],
    queryFn: async () => {
      const { data } = await supabase.from("quotations")
        .select("*,quotation_items(*),profiles:client_id(full_name)").eq("id", id).maybeSingle();
      return data;
    },
  });
}

export function useTemplates(vendorId?: string) {
  return useQuery({
    queryKey: ["v-templates", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase.from("quote_templates")
        .select("id,name,currency,notes,is_active,quote_template_items(id)").eq("vendor_id", vendorId!)
        .is("deleted_at", null).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useServices(vendorId?: string) {
  return useQuery({
    queryKey: ["v-services", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase.from("vendor_services")
        .select("id,title,description,base_price,currency,is_active,category_id").eq("vendor_id", vendorId!)
        .is("deleted_at", null).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useMedia(vendorId?: string) {
  return useQuery({
    queryKey: ["v-media", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase.from("vendor_media")
        .select("id,media_type,url,caption,is_primary,sort_order").eq("vendor_id", vendorId!)
        .is("deleted_at", null).order("sort_order", { ascending: true });
      return data ?? [];
    },
  });
}

export function useAvailability(vendorId?: string) {
  return useQuery({
    queryKey: ["v-availability", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase.from("vendor_availability")
        .select("id,day_of_week,specific_date,start_time,end_time,is_available").eq("vendor_id", vendorId!);
      return data ?? [];
    },
  });
}

export function useBlockedDates(vendorId?: string) {
  return useQuery({
    queryKey: ["v-blocked", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase.from("vendor_blocked_dates")
        .select("id,blocked_date,reason,source").eq("vendor_id", vendorId!)
        .order("blocked_date", { ascending: true });
      return data ?? [];
    },
  });
}

export function usePublicEvents() {
  return useQuery({
    queryKey: ["public-events"],
    queryFn: async () => {
      const { data } = await supabase.from("events")
        .select("id,title,event_type,event_date,location,source,description")
        .eq("status", "published").eq("is_public", true).is("deleted_at", null)
        .order("event_date", { ascending: false }).limit(50);
      return data ?? [];
    },
  });
}

export function useMyInterests(vendorId?: string) {
  return useQuery({
    queryKey: ["v-interests", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase.from("event_interests").select("event_id,status").eq("vendor_id", vendorId!);
      return data ?? [];
    },
  });
}

export function useVendorEscrow(vendorId?: string) {
  return useQuery({
    queryKey: ["v-escrow", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase.from("escrow_transactions")
        .select("id,status,gross_amount,commission_amount,net_payout_amount,currency,bookings(reference_no)")
        .eq("vendor_id", vendorId!).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useVendorPayouts(vendorId?: string) {
  return useQuery({
    queryKey: ["v-payouts", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase.from("payouts")
        .select("id,amount,currency,status,provider,approved_at,completed_at,created_at").eq("vendor_id", vendorId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function usePromotions(vendorId?: string) {
  return useQuery({
    queryKey: ["v-promotions", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase.from("promotions")
        .select("id,title,description,starts_at,ends_at,is_active").eq("vendor_id", vendorId!)
        .is("deleted_at", null).order("starts_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useDiscounts(vendorId?: string) {
  return useQuery({
    queryKey: ["v-discounts", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase.from("discounts")
        .select("id,code,type,value,currency,max_uses,used_count,starts_at,ends_at,is_active")
        .eq("vendor_id", vendorId!).is("deleted_at", null).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useVendorReviews(vendorId?: string) {
  return useQuery({
    queryKey: ["v-reviews", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase.from("reviews")
        .select("id,rating,title,body,status,created_at,review_responses(id,body),profiles:client_id(full_name)")
        .eq("vendor_id", vendorId!).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data } = await supabase.from("pricing_plans")
        .select("id,key,name,description,price,currency,billing_cycle,sort_order,plan_features(feature_key,value)")
        .eq("is_active", true).order("sort_order", { ascending: true });
      return data ?? [];
    },
  });
}

export function useVendorDashboard(vendorId?: string) {
  return useQuery({
    queryKey: ["v-dashboard", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const [requests, quoteReqs, escrowHeld, reviews] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("vendor_id", vendorId!).eq("status", "requested"),
        supabase.from("quotations").select("id", { count: "exact", head: true }).eq("vendor_id", vendorId!).eq("status", "requested"),
        supabase.from("escrow_transactions").select("id", { count: "exact", head: true }).eq("vendor_id", vendorId!).in("status", ["held", "release_requested", "payout_approved"]),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("vendor_id", vendorId!).eq("status", "published"),
      ]);
      return {
        bookingRequests: requests.count ?? 0,
        quoteRequests: quoteReqs.count ?? 0,
        escrowHeld: escrowHeld.count ?? 0,
        reviews: reviews.count ?? 0,
      };
    },
  });
}

// shared with client portal pattern
export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await supabase.from("conversations")
        .select("id,type,subject,last_message_at,status").order("last_message_at", { ascending: false, nullsFirst: false });
      return data ?? [];
    },
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data } = await supabase.from("messages")
        .select("id,sender_id,body,created_at").eq("conversation_id", conversationId).is("deleted_at", null)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase.from("notifications")
        .select("id,trigger_key,title,body,read_at,created_at").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["unread"],
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
      return count ?? 0;
    },
  });
}
