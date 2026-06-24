import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/auth/ProtectedRoute';
import { VendorProvider } from '@/vendor/VendorProvider';
import AppShell from '@/components/shell/AppShell';

import SignIn from '@/pages/auth/signIn';
import SignUp from '@/pages/auth/signUp';
import AuthCallback from '@/pages/auth/authCallback';
import Terms from '@/pages/terms';
import VendorTerms from '@/pages/vendorTerms';
import EscrowPolicy from '@/pages/escrowPolicy';
import Privacy from '@/pages/privacy';

import Dashboard from '@/pages/dashboard';
import Onboarding from '@/pages/onboarding';
import Subscription from '@/pages/subscription';
import Profile from '@/pages/profile';
import Services from '@/pages/services';
import Portfolio from '@/pages/portfolio';
import Calendar from '@/pages/calendar';
import Bookings from '@/pages/bookings';
import BookingDetail from '@/pages/bookingDetail';
import Quotations from '@/pages/quotations';
import QuotationDetail from '@/pages/quotationDetail';
import Templates from '@/pages/templates';
import PublicEvents from '@/pages/publicEvents';
import Escrow from '@/pages/escrow';
import Payouts from '@/pages/payouts';
import Promotions from '@/pages/promotions';
import Discounts from '@/pages/discounts';
import Reviews from '@/pages/reviews';
import Analytics from '@/pages/analytics';
import Messages from '@/pages/messages';
import Conversation from '@/pages/conversation';
import Notifications from '@/pages/notifications';
import Settings from '@/pages/settings';
import NotFound from '@/pages/notFound';

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/vendor-terms" element={<VendorTerms />} />
      <Route path="/escrow-policy" element={<EscrowPolicy />} />
      <Route path="/privacy" element={<Privacy />} />

      <Route
        element={
          <ProtectedRoute>
            <VendorProvider>
              <AppShell />
            </VendorProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/services" element={<Services />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/bookings/:id" element={<BookingDetail />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/quotations/:id" element={<QuotationDetail />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/public-events" element={<PublicEvents />} />
        <Route path="/escrow" element={<Escrow />} />
        <Route path="/payouts" element={<Payouts />} />
        <Route path="/promotions" element={<Promotions />} />
        <Route path="/discounts" element={<Discounts />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:conversationId" element={<Conversation />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
