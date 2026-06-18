import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Reads are RLS-gated by the admin's permissions (UI also hides via RBAC).
const count = (q: any) => q.then((r: any) => r.count ?? 0);

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("id,full_name,email,avatar_url").eq("id", user.id).maybeSingle();
      return data;
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["unread"],
    queryFn: async () => count(supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)),
  });
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [apps, payouts, disputes, escrow, vendors] = await Promise.all([
        count(supabase.from("vendor_applications").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review", "due_diligence", "mou_pending", "mou_signed"])),
        count(supabase.from("payouts").select("id", { count: "exact", head: true }).in("status", ["requested", "approved", "processing"])),
        count(supabase.from("disputes").select("id", { count: "exact", head: true }).in("status", ["open", "under_review", "awaiting_evidence"])),
        count(supabase.from("escrow_transactions").select("id", { count: "exact", head: true }).in("status", ["held", "release_requested", "admin_review"])),
        count(supabase.from("vendors").select("id", { count: "exact", head: true }).eq("status", "active")),
      ]);
      return { pendingApplications: apps, pendingPayouts: payouts, openDisputes: disputes, escrowHeld: escrow, activeVendors: vendors };
    },
  });
}

export function useApplications() {
  return useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const { data } = await supabase.from("vendor_applications")
        .select("id,business_name,status,is_reapplication,submitted_at,created_at,profiles:applicant_id(full_name,email)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: ["application", id],
    queryFn: async () => {
      const { data } = await supabase.from("vendor_applications")
        .select("*,profiles:applicant_id(full_name,email,phone)").eq("id", id).maybeSingle();
      return data;
    },
  });
}

export function useVendorsAdmin() {
  return useQuery({
    queryKey: ["admin-vendors"],
    queryFn: async () => {
      const { data } = await supabase.from("vendors")
        .select("id,business_name,slug,status,visibility,avg_rating,review_count,created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("id,full_name,email,status,created_at,user_roles(roles(key,name))")
        .order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data } = await supabase.from("roles").select("id,key,name,is_admin,role_permissions(permission_id)").order("name");
      return data ?? [];
    },
  });
}

export function usePermissionsCatalog() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data } = await supabase.from("permissions").select("id,key,category,description").order("category");
      return data ?? [];
    },
  });
}

export function useEscrowAdmin() {
  return useQuery({
    queryKey: ["admin-escrow"],
    queryFn: async () => {
      const { data } = await supabase.from("escrow_transactions")
        .select("id,status,gross_amount,commission_amount,net_payout_amount,currency,client_confirmed_at,vendors(business_name),bookings(reference_no)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function usePayoutsAdmin() {
  return useQuery({
    queryKey: ["admin-payouts"],
    queryFn: async () => {
      const { data } = await supabase.from("payouts")
        .select("id,amount,currency,status,requested_by,approved_by,created_at,vendors(business_name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useRefundsAdmin() {
  return useQuery({
    queryKey: ["admin-refunds"],
    queryFn: async () => {
      const { data } = await supabase.from("refunds")
        .select("id,amount,currency,type,status,reason,requested_by,created_at").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useDisputesAdmin() {
  return useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data } = await supabase.from("disputes")
        .select("id,reason,status,sla_due_at,created_at,escrow_id,bookings(reference_no)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function usePaymentsAdmin() {
  return useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data } = await supabase.from("payments")
        .select("id,purpose,amount,currency,status,provider,provider_method,created_at").order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });
}

export function useLedger() {
  return useQuery({
    queryKey: ["ledger"],
    queryFn: async () => {
      const { data } = await supabase.from("ledger_entries")
        .select("id,entry_group_id,account,direction,amount,currency,description,occurred_at").order("occurred_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });
}

export function useSubscriptionsAdmin() {
  return useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions")
        .select("id,status,current_period_end,grace_until,trial_ends_at,vendors(business_name),pricing_plans(name)")
        .order("current_period_end", { ascending: true });
      return data ?? [];
    },
  });
}

export function usePlansAdmin() {
  return useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("pricing_plans")
        .select("id,key,name,price,currency,billing_cycle,is_active,trial_days").order("sort_order");
      return data ?? [];
    },
  });
}

export function useBookingsAdmin() {
  return useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data } = await supabase.from("bookings")
        .select("id,reference_no,status,event_date,amount,currency,vendors(business_name)").order("event_date", { ascending: false }).limit(100);
      return data ?? [];
    },
  });
}

export function useQuotationsAdmin() {
  return useQuery({
    queryKey: ["admin-quotations"],
    queryFn: async () => {
      const { data } = await supabase.from("quotations")
        .select("id,reference_no,status,total,currency,created_at,vendors(business_name)").order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });
}

export function useEventsAdmin() {
  return useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data } = await supabase.from("events")
        .select("id,title,source,status,event_date,is_public,created_at").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useReviewReports() {
  return useQuery({
    queryKey: ["review-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("review_reports")
        .select("id,reason,status,created_at,reviews(id,rating,body,vendor_id)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useMessageFlags() {
  return useQuery({
    queryKey: ["message-flags"],
    queryFn: async () => {
      const { data } = await supabase.from("message_flags")
        .select("id,reason,status,created_at,messages(id,body,conversation_id)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useNotificationTemplates() {
  return useQuery({
    queryKey: ["notification-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("notification_templates")
        .select("id,trigger_key,channel,subject,locale,is_active").order("trigger_key");
      return data ?? [];
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("id,key,value,description").order("key");
      return data ?? [];
    },
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_logs")
        .select("id,action,entity_type,entity_id,actor_id,occurred_at").order("occurred_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });
}

export function useRetention() {
  return useQuery({
    queryKey: ["retention"],
    queryFn: async () => {
      const { data } = await supabase.from("data_retention_policies")
        .select("id,data_category,retention_period,action_on_expiry,legal_hold,description").order("data_category");
      return data ?? [];
    },
  });
}

export function useErasureRequests() {
  return useQuery({
    queryKey: ["erasure"],
    queryFn: async () => {
      const { data } = await supabase.from("erasure_requests")
        .select("id,status,notes,created_at,profiles:profile_id(full_name,email)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

// shared inbox
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
        .select("id,sender_id,body,created_at,moderation_status").eq("conversation_id", conversationId).is("deleted_at", null)
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
