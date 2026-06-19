import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/auth/ProtectedRoute';
import { AdminProvider } from '@/admin/AdminProvider';
import AdminGate from '@/admin/AdminGate';
import RequirePerm from '@/admin/RequirePerm';
import AppShell from '@/components/shell/AppShell';

import SignIn from '@/pages/auth/SignIn';
import AuthCallback from '@/pages/auth/AuthCallback';

import Dashboard from '@/pages/Dashboard';
import Applications from '@/pages/Applications';
import ApplicationDetail from '@/pages/ApplicationDetail';
import Vendors from '@/pages/Vendors';
import Bookings from '@/pages/Bookings';
import Quotations from '@/pages/Quotations';
import Events from '@/pages/Events';
import Escrow from '@/pages/Escrow';
import Payouts from '@/pages/Payouts';
import Refunds from '@/pages/Refunds';
import Disputes from '@/pages/Disputes';
import Payments from '@/pages/Payments';
import Ledger from '@/pages/Ledger';
import Subscriptions from '@/pages/Subscriptions';
import PricingPlans from '@/pages/PricingPlans';
import Users from '@/pages/Users';
import Rbac from '@/pages/Rbac';
import ReviewsModeration from '@/pages/ReviewsModeration';
import MessagingModeration from '@/pages/MessagingModeration';
import NotificationTemplates from '@/pages/NotificationTemplates';
import Reports from '@/pages/Reports';
import Audit from '@/pages/Audit';
import Settings from '@/pages/Settings';
import Retention from '@/pages/Retention';
import Erasure from '@/pages/Erasure';
import Messages from '@/pages/Messages';
import Conversation from '@/pages/Conversation';
import Notifications from '@/pages/Notifications';
import NotFound from '@/pages/NotFound';

const g = (perm: string | undefined, el: React.ReactNode) => (
  <RequirePerm perm={perm}>{el}</RequirePerm>
);

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignIn />} />
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
        <Route path="/bookings" element={g('bookings.read', <Bookings />)} />
        <Route path="/quotations" element={g('quotations.read', <Quotations />)} />
        <Route path="/events" element={g('events.manage', <Events />)} />

        <Route path="/escrow" element={g('escrow.read', <Escrow />)} />
        <Route path="/payouts" element={g('payout.approve', <Payouts />)} />
        <Route path="/refunds" element={g('refund.approve', <Refunds />)} />
        <Route path="/disputes" element={g('dispute.manage', <Disputes />)} />
        <Route path="/payments" element={g('payments.read', <Payments />)} />
        <Route path="/ledger" element={g('finance.read', <Ledger />)} />
        <Route path="/subscriptions" element={g('subscriptions.manage', <Subscriptions />)} />
        <Route path="/pricing-plans" element={g('plans.manage', <PricingPlans />)} />

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
