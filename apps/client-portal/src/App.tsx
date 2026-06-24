import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/auth/ProtectedRoute';
import AppShell from '@/components/shell/AppShell';

import SignIn from '@/pages/auth/signIn';
import SignUp from '@/pages/auth/signUp';
import AuthCallback from '@/pages/auth/authCallback';
import Terms from '@/pages/terms';
import EscrowPolicy from '@/pages/escrowPolicy';
import Privacy from '@/pages/privacy';

import Dashboard from '@/pages/dashboard';
import Discover from '@/pages/discover';
import VendorDetail from '@/pages/vendorDetail';
import Bookings from '@/pages/bookings';
import BookingDetail from '@/pages/bookingDetail';
import Quotations from '@/pages/quotations';
import CompareQuotes from '@/pages/compareQuotes';
import MyEvents from '@/pages/myEvents';
import NewEvent from '@/pages/newEvent';
import Messages from '@/pages/messages';
import Conversation from '@/pages/conversation';
import Payments from '@/pages/payments';
import Escrow from '@/pages/escrow';
import Reviews from '@/pages/reviews';
import Notifications from '@/pages/notifications';
import Profile from '@/pages/profile';
import Settings from '@/pages/settings';
import NotFound from '@/pages/notFound';

export default function App() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/sign-up" element={<SignUp />} />
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
        <Route path="/discover/vendors/:slug" element={<VendorDetail />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/bookings/:id" element={<BookingDetail />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/quotations/compare" element={<CompareQuotes />} />
        <Route path="/my-events" element={<MyEvents />} />
        <Route path="/my-events/new" element={<NewEvent />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:conversationId" element={<Conversation />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/escrow" element={<Escrow />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
