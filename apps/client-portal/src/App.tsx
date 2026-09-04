import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/auth/ProtectedRoute';
import SessionTimeoutGuard from '@/auth/SessionTimeoutGuard';
import AppShell from '@/components/shell/AppShell';

import SignIn from '@/pages/auth/signIn';
import SignUp from '@/pages/auth/signUp';
import ResetPassword from '@/pages/auth/resetPassword';
import AuthCallback from '@/pages/auth/authCallback';
import Terms from '@/pages/terms';
import EscrowPolicy from '@/pages/escrowPolicy';
import Privacy from '@/pages/privacy';

import Dashboard from '@/pages/dashboard';
import Discover from '@/pages/discover';
import Offers from '@/pages/offers';
import VendorDetail from '@/pages/vendorDetail';
import Bookings from '@/pages/bookings';
import BookingDetail from '@/pages/bookingDetail';
import Quotations from '@/pages/quotations';
import CompareQuotes from '@/pages/compareQuotes';
import QuotationDetail from '@/pages/quotationDetail';
import MyEvents from '@/pages/myEvents';
import EventDetail from '@/pages/eventDetail';
import Messages from '@/pages/messages';
import Payments from '@/pages/payments';
import PaymentReturn from '@/pages/paymentReturn';
import Escrow from '@/pages/escrow';
import Reviews from '@/pages/reviews';
import Notifications from '@/pages/notifications';
import Profile from '@/pages/profile';
import Settings from '@/pages/settings';
import NotFound from '@/pages/notFound';

export default function App() {
  return (
    <>
      {/* Above the routes on purpose: the idle guard then covers every
          authenticated page, including any that sit outside the app shell. */}
      <SessionTimeoutGuard />
      <Routes>
        {/* Public auth routes */}
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/escrow-policy" element={<EscrowPolicy />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Protected app shell */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/discover/vendors/:slug" element={<VendorDetail />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/bookings/:id" element={<BookingDetail />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/quotations/compare" element={<CompareQuotes />} />
          <Route path="/quotations/:id" element={<QuotationDetail />} />
          <Route path="/my-events" element={<MyEvents />} />
          <Route path="/my-events/:id" element={<EventDetail />} />
          <Route path="/messages" element={<Messages />} />
          {/* The inbox renders the open thread itself — master–detail on
              desktop, a full-height drawer on mobile — so a deep link lands in
              the list rather than on a detached page with no way back. */}
          <Route path="/messages/:conversationId" element={<Messages />} />
          <Route path="/payments" element={<Payments />} />
          {/* Where Pesapal sends the browser back after a hosted checkout
              (PESAPAL_CALLBACK_URL). Inside the shell on purpose: a session
              that lapsed during checkout goes through sign-in and returns
              here with the query string intact. */}
          <Route path="/payments/return" element={<PaymentReturn />} />
          <Route path="/escrow" element={<Escrow />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
