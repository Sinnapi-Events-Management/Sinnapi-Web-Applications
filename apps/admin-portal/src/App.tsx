import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/auth/ProtectedRoute';
import { AdminProvider } from '@/admin/AdminProvider';
import AdminGate from '@/admin/AdminGate';
import RequirePerm from '@/admin/RequirePerm';
import AppShell from '@/components/shell/AppShell';

import SignIn from '@/pages/auth/signIn';
import ForgotPassword from '@/pages/auth/forgotPassword';
import ResetPassword from '@/pages/auth/resetPassword';
import AuthCallback from '@/pages/auth/authCallback';

import Dashboard from '@/pages/dashboard';
import Applications from '@/pages/applications';
import ApplicationDetail from '@/pages/applicationDetail';
import Vendors from '@/pages/vendors';
import VendorDetail from '@/pages/vendorDetail';
import Bookings from '@/pages/bookings';
import Quotations from '@/pages/quotations';
import Events from '@/pages/events';
import EventDetail from '@/pages/eventDetail';
import Escrow from '@/pages/escrow';
import Payouts from '@/pages/payouts';
import Refunds from '@/pages/refunds';
import Disputes from '@/pages/disputes';
import Payments from '@/pages/payments';
import Ledger from '@/pages/ledger';
import Subscriptions from '@/pages/subscriptions';
import PricingPlans from '@/pages/pricingPlans';
import PlanDetail from '@/pages/planDetail';
import Users from '@/pages/users';
import Rbac from '@/pages/rbac';
import ReviewsModeration from '@/pages/reviewsModeration';
import MessagingModeration from '@/pages/messagingModeration';
import NotificationTemplates from '@/pages/notificationTemplates';
import Reports from '@/pages/reports';
import Audit from '@/pages/audit';
import Settings from '@/pages/settings';
import Retention from '@/pages/retention';
import Erasure from '@/pages/erasure';
import Messages from '@/pages/messages';
import Conversation from '@/pages/conversation';
import Notifications from '@/pages/notifications';
import NotFound from '@/pages/notFound';

const g = (perm: string | undefined, el: React.ReactNode) => (
  <RequirePerm perm={perm}>{el}</RequirePerm>
);

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

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
        <Route path="/quotations" element={g('quotations.read', <Quotations />)} />
        <Route path="/events" element={g('events.manage', <Events />)} />
        <Route path="/events/:id" element={g('events.manage', <EventDetail />)} />

        <Route path="/escrow" element={g('escrow.read', <Escrow />)} />
        <Route path="/payouts" element={g('payout.approve', <Payouts />)} />
        <Route path="/refunds" element={g('refund.approve', <Refunds />)} />
        <Route path="/disputes" element={g('dispute.manage', <Disputes />)} />
        <Route path="/payments" element={g('payments.read', <Payments />)} />
        <Route path="/ledger" element={g('finance.read', <Ledger />)} />
        <Route path="/subscriptions" element={g('subscriptions.manage', <Subscriptions />)} />
        <Route path="/pricing-plans" element={g('plans.manage', <PricingPlans />)} />
        <Route path="/pricing-plans/:id" element={g('plans.manage', <PlanDetail />)} />

        <Route path="/users" element={g('users.read', <Users />)} />
        <Route path="/rbac" element={g('roles.manage', <Rbac />)} />

        <Route path="/reviews-moderation" element={g('moderation.manage', <ReviewsModeration />)} />
        <Route path="/messaging" element={g('moderation.manage', <MessagingModeration />)} />
        <Route
          path="/notification-templates"
          element={g('settings.manage', <NotificationTemplates />)}
        />

        <Route path="/reports" element={<Reports />} />
        <Route path="/audit" element={g('audit.read', <Audit />)} />
        <Route path="/settings" element={g('settings.manage', <Settings />)} />
        <Route path="/retention" element={g('compliance.manage', <Retention />)} />
        <Route path="/erasure" element={g('compliance.manage', <Erasure />)} />

        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:conversationId" element={<Conversation />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
