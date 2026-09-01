import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/auth/ProtectedRoute';
import SessionTimeoutGuard from '@/auth/SessionTimeoutGuard';
import { AdminProvider } from '@/admin/AdminProvider';
import AdminGate from '@/admin/AdminGate';
import RequirePerm from '@/admin/RequirePerm';
import AppShell from '@/components/shell/AppShell';

import SignIn from '@/pages/auth/signIn';
import ForgotPassword from '@/pages/auth/forgotPassword';
import ResetPassword from '@/pages/auth/resetPassword';
import ChangePassword from '@/pages/auth/changePassword';
import AuthCallback from '@/pages/auth/authCallback';

import Dashboard from '@/pages/dashboard';
import Applications from '@/pages/applications';
import ApplicationDetail from '@/pages/applicationDetail';
import Vendors from '@/pages/vendors';
import VendorDetail from '@/pages/vendorDetail';
import Bookings from '@/pages/bookings';
import UnpaidBookings from '@/pages/unpaidBookings';
import Offers from '@/pages/offers';
import BookingDetail from '@/pages/bookingDetail';
import Quotations from '@/pages/quotations';
import QuotationDetail from '@/pages/quotationDetail';
import Events from '@/pages/events';
import EventDetail from '@/pages/eventDetail';
import Escrow from '@/pages/escrow';
import Payouts from '@/pages/payouts';
import Refunds from '@/pages/refunds';
import Disputes from '@/pages/disputes';
import Payments from '@/pages/payments';
import Ledger from '@/pages/ledger';
import Reconciliation from '@/pages/reconciliation';
import Subscriptions from '@/pages/subscriptions';
import PricingPlans from '@/pages/pricingPlans';
import PlanDetail from '@/pages/planDetail';
import Users from '@/pages/users';
import Clients from '@/pages/clients';
import ClientDetail from '@/pages/clientDetail';
import VendorAccounts from '@/pages/vendorAccounts';
import Rbac from '@/pages/rbac';
import BlockedAccounts from '@/pages/blockedAccounts';
import ReviewsModeration from '@/pages/reviewsModeration';
import MessagingModeration from '@/pages/messagingModeration';
import NotificationTemplates from '@/pages/notificationTemplates';
import Newsletters from '@/pages/newsletters';
import NewsletterDetail from '@/pages/newsletterDetail';
import Subscribers from '@/pages/subscribers';
import Reports from '@/pages/reports';
import Audit from '@/pages/audit';
import Lookup from '@/pages/lookup';
import Settings from '@/pages/settings';
import Retention from '@/pages/retention';
import ServiceCategories from '@/pages/serviceCategories';
import ServiceRegions from '@/pages/serviceRegions';
import EventTypes from '@/pages/eventTypes';
import Erasure from '@/pages/erasure';
import Profile from '@/pages/profile';
import Messages from '@/pages/messages';
import Notifications from '@/pages/notifications';
import NotFound from '@/pages/notFound';

const g = (perm: string | undefined, el: React.ReactNode) => (
  <RequirePerm perm={perm}>{el}</RequirePerm>
);

export default function App() {
  return (
    <>
      {/* Above the routes on purpose: the idle guard then covers every
          authenticated page, including the forced password change below,
          which sits outside the app shell. */}
      <SessionTimeoutGuard />
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Requires a session but sits outside the admin shell: the forced
          password change must be reachable before AdminProvider / AdminGate. */}
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AdminProvider>
                <AdminGate>
                  <AppShell />
                </AdminGate>
              </AdminProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/applications" element={g('vendor.review', <Applications />)} />
          <Route path="/applications/:id" element={g('vendor.review', <ApplicationDetail />)} />
          <Route path="/vendors" element={g('vendor.manage', <Vendors />)} />
          <Route path="/vendors/:id" element={g('vendor.manage', <VendorDetail />)} />
          <Route path="/bookings" element={g('bookings.read', <Bookings />)} />
          {/* The detail page reads on `bookings.read`; the status overrides it
              offers are gated separately, inside `admin_set_booking_status`. */}
          <Route path="/bookings/:id" element={g('bookings.read', <BookingDetail />)} />
          {/* Gated on the chase permission rather than `bookings.read`: the
              page's whole purpose is the three write actions on its rows, and
              a read-only visitor would get a queue of buttons that refuse. */}
          <Route
            path="/bookings-awaiting-payment"
            element={g('booking.payment.chase', <UnpaidBookings />)}
          />
          {/* Gated on the moderation permission, not on a read one: every row
              on this page exists to be acted on, and `admin_search_offers`
              returns nothing to a caller without it — a read-only visitor would
              get an empty table with no explanation. */}
          <Route path="/offers" element={g('offers.moderate', <Offers />)} />
          <Route path="/quotations" element={g('quotations.read', <Quotations />)} />
          {/* The detail page reads on the same permission as the list. There is
              no write to gate separately: `quotations_update` admits only the
              client and the vendor owner, so the console reads a quote and
              cannot change one. */}
          <Route path="/quotations/:id" element={g('quotations.read', <QuotationDetail />)} />
          <Route path="/events" element={g('events.manage', <Events />)} />
          <Route path="/events/:id" element={g('events.manage', <EventDetail />)} />

          <Route path="/escrow" element={g('escrow.read', <Escrow />)} />
          <Route path="/payouts" element={g('payout.approve', <Payouts />)} />
          <Route path="/refunds" element={g('refund.approve', <Refunds />)} />
          <Route path="/disputes" element={g('dispute.manage', <Disputes />)} />
          <Route path="/payments" element={g('payments.read', <Payments />)} />
          <Route path="/ledger" element={g('finance.read', <Ledger />)} />
          <Route path="/reconciliation" element={g('finance.reconcile', <Reconciliation />)} />
          <Route path="/subscriptions" element={g('subscriptions.manage', <Subscriptions />)} />
          <Route path="/pricing-plans" element={g('plans.manage', <PricingPlans />)} />
          <Route path="/pricing-plans/:id" element={g('plans.manage', <PlanDetail />)} />

          <Route path="/users" element={g('users.read', <Users />)} />
          <Route path="/clients" element={g('users.read', <Clients />)} />
          <Route path="/clients/:id" element={g('users.read', <ClientDetail />)} />
          {/* Vendor ACCOUNTS. Distinct from `/vendors`, which is the listing:
              this one is gated with the People section's permission because it
              exposes a person's account rather than their shopfront. */}
          <Route path="/vendor-accounts" element={g('users.read', <VendorAccounts />)} />
          <Route path="/rbac" element={g('roles.manage', <Rbac />)} />
          <Route
            path="/blocked-accounts"
            element={g('security.access.read', <BlockedAccounts />)}
          />

          <Route
            path="/reviews-moderation"
            element={g('moderation.manage', <ReviewsModeration />)}
          />
          <Route path="/messaging" element={g('moderation.manage', <MessagingModeration />)} />
          <Route
            path="/notification-templates"
            element={g('settings.manage', <NotificationTemplates />)}
          />

          {/* Marketing. Its own permission rather than `settings.manage`: the
              ability to email the entire user base is a categorically different
              trust from editing reference data, and the only one whose misuse
              is visible to every customer at once. The subscriber register is
              declared BEFORE `/newsletters/:id` so the literal segment is not
              swallowed as a campaign id. */}
          <Route path="/newsletters" element={g('marketing.manage', <Newsletters />)} />
          <Route path="/newsletters/subscribers" element={g('marketing.manage', <Subscribers />)} />
          <Route path="/newsletters/:id" element={g('marketing.manage', <NewsletterDetail />)} />

          <Route path="/reports" element={<Reports />} />
          <Route path="/audit" element={g('audit.read', <Audit />)} />
          {/* No `perm` guard: the page resolves an ID to a label and a link and
              nothing more, and every page it links to applies its own check. Any
              member of staff who answers a call needs it. */}
          <Route path="/lookup" element={<Lookup />} />
          <Route path="/settings" element={g('settings.manage', <Settings />)} />
          <Route path="/retention" element={g('compliance.manage', <Retention />)} />
          <Route path="/service-categories" element={g('settings.manage', <ServiceCategories />)} />
          <Route path="/service-regions" element={g('settings.manage', <ServiceRegions />)} />
          {/* Reference data, so it sits with the catalogue and behind the same
              permission — not under `events.manage`, which is about the events
              themselves rather than the vocabulary they're filed under. */}
          <Route path="/event-types" element={g('settings.manage', <EventTypes />)} />
          <Route path="/erasure" element={g('compliance.manage', <Erasure />)} />

          {/* The signed-in admin's own account — never permission-gated: every
            admin can read and edit their own profile and password. */}
          <Route path="/profile" element={<Profile />} />

          <Route path="/messages" element={<Messages />} />
          {/* The inbox renders the open thread itself — master–detail on
              desktop, a full-height drawer on mobile — so the pane's own
              "full view" link and any deep link from a report land in the
              queue rather than on a detached page. */}
          <Route path="/messages/:conversationId" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
