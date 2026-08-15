import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/auth/ProtectedRoute';
import SessionTimeoutGuard from '@/auth/SessionTimeoutGuard';
import { VendorProvider } from '@/vendor/VendorProvider';
import AppShell from '@/components/shell/AppShell';

import SignIn from '@/pages/auth/signIn';
import ForgotPassword from '@/pages/auth/forgotPassword';
import ResetPassword from '@/pages/auth/resetPassword';
import AuthCallback from '@/pages/auth/authCallback';
import ChangePassword from '@/pages/auth/changePassword';
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
import Notifications from '@/pages/notifications';
import Settings from '@/pages/settings';
import NotFound from '@/pages/notFound';

export default function App() {
  return (
    <>
      {/* Above the routes on purpose: the idle guard then covers every
          authenticated page, including the forced password change below,
          which sits outside the app shell. */}
      <SessionTimeoutGuard />
      <Routes>
        {/* No /sign-up: the `vendor` role is granted only when an application is
          approved (`approve_vendor`), so a self-registered account could never
          get past this portal's gate. Prospective vendors go to the public
          application form — see the sign-in screen's footer link. */}
        <Route path="/sign-in" element={<SignIn />} />
        {/* Public for the same reason as the reset screen below: somebody who
          cannot sign in has no session to prove anything with. The form is
          CAPTCHA-gated instead, and `send-password-reset` answers identically
          whether or not the address has an account. */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        {/* Where `send-password-reset` lands a vendor. Public: the recovery link
          IS the credential, so requiring a session first would be circular. */}
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/vendor-terms" element={<VendorTerms />} />
        <Route path="/escrow-policy" element={<EscrowPolicy />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Requires a session but sits outside the vendor shell: the forced
          password change must be reachable before VendorProvider loads a
          vendor record the applicant may not have finished onboarding yet. */}
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
          {/* The inbox renders the open thread itself — master–detail on
              desktop, a full-height drawer on mobile — so a deep link lands in
              the list rather than on a detached page with no way back. */}
          <Route path="/messages/:conversationId" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
