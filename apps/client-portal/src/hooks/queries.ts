import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  VendorCardModel,
  VendorDetailModel,
  BookingListModel,
  BookingDetailModel,
  QuotationListModel,
  MyEventModel,
  EscrowModel,
  PaymentModel,
  ConversationModel,
  MessageModel,
  ReviewModel,
  NotificationModel,
  ProfileModel,
} from '@/lib/types';

const VENDOR_CARD =
  'id,slug,business_name,base_city,primary_image_url,profile_image_url,starting_price,starting_price_currency,avg_rating,review_count,is_featured';

// ---------- Vendors ----------
export function useVendors(q?: string) {
  return useQuery({
    queryKey: ['vendors', 'list', q ?? ''],
    queryFn: async () => {
      let query = supabase
        .from('vendors')
        .select(VENDOR_CARD)
        .eq('status', 'active')
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .order('is_featured', { ascending: false })
        .order('avg_rating', { ascending: false })
        .limit(36);
      if (q) query = query.ilike('business_name', `%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as VendorCardModel[];
    },
  });
}

export function useVendor(slug: string) {
  return useQuery({
    queryKey: ['vendor', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select(`${VENDOR_CARD},biography,website,pricing_model,lead_time,years_in_operation`)
        .eq('slug', slug)
        .eq('status', 'active')
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return (data as VendorDetailModel) ?? null;
    },
  });
}

// ---------- Bookings ----------
export function useBookings() {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(
          'id,reference_no,status,event_date,amount,currency,vendor_id,vendors(business_name,slug,primary_image_url)',
        )
        .order('event_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BookingListModel[];
    },
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*,vendors(business_name,slug,primary_image_url)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as BookingDetailModel) ?? null;
    },
  });
}

// ---------- Quotations ----------
export function useQuotations() {
  return useQuery({
    queryKey: ['quotations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select(
          'id,reference_no,status,total,currency,valid_until,created_at,vendor_id,vendors(business_name,slug)',
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as QuotationListModel[];
    },
  });
}

// ---------- Events ----------
export function useMyEvents() {
  return useQuery({
    queryKey: ['my-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id,title,event_type,event_date,location,status,source')
        .eq('source', 'client')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MyEventModel[];
    },
  });
}

// ---------- Escrow / Payments ----------
export function useEscrow() {
  return useQuery({
    queryKey: ['escrow'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select(
          'id,status,gross_amount,net_payout_amount,currency,booking_id,bookings(reference_no),vendors(business_name)',
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as EscrowModel[];
    },
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id,purpose,amount,currency,status,provider,provider_method,paid_at,created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PaymentModel[];
    },
  });
}

// ---------- Messaging ----------
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id,type,subject,last_message_at,status,vendors(business_name)')
        .order('last_message_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as ConversationModel[];
    },
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id,sender_id,body,created_at,moderation_status')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageModel[];
    },
  });
}

// ---------- Reviews / Notifications / Profile ----------
export function useReviews() {
  return useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id,rating,title,body,status,created_at,vendors(business_name,slug)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReviewModel[];
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id,trigger_key,title,body,read_at,created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as NotificationModel[];
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id,full_name,email,phone,avatar_url,locale,preferred_currency,mfa_enabled')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as ProfileModel) ?? null;
    },
  });
}

export function useDashboardCounts() {
  return useQuery({
    queryKey: ['dashboard-counts'],
    queryFn: async () => {
      const [bookings, quotes, escrow, unread] = await Promise.all([
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .in('status', ['requested', 'confirmed', 'in_progress']),
        supabase
          .from('quotations')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'sent'),
        supabase
          .from('escrow_transactions')
          .select('id', { count: 'exact', head: true })
          .in('status', ['held', 'release_requested']),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .is('read_at', null),
      ]);
      return {
        activeBookings: bookings.count ?? 0,
        openQuotes: quotes.count ?? 0,
        escrowHeld: escrow.count ?? 0,
        unread: unread.count ?? 0,
      };
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['unread'],
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);
      return count ?? 0;
    },
  });
}

// ---------- Generic RPC mutation helper ----------
export function useRpc(invalidate: string[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fn, args }: { fn: string; args: Record<string, unknown> }) => {
      const { data, error } = await supabase.rpc(fn, args);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}
