import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/auth/ProtectedRoute';
import { VendorProvider } from '@/vendor/VendorProvider';
import AppShell from '@/components/shell/AppShell';

import SignIn from '@/pages/auth/SignIn';
import SignUp from '@/pages/auth/SignUp';
import AuthCallback from '@/pages/auth/AuthCallback';

import Dashboard from '@/pages/Dashboard';
import Onboarding from '@/pages/Onboarding';
import Subscription from '@/pages/Subscription';
import Profile from '@/pages/Profile';
import Services from '@/pages/Services';
import Portfolio from '@/pages/Portfolio';
import Calendar from '@/pages/Calendar';
import Bookings from '@/pages/Bookings';
import BookingDetail from '@/pages/BookingDetail';
import Quotations from '@/pages/Quotations';
import QuotationDetail from '@/pages/QuotationDetail';
import Templates from '@/pages/Templates';
import PublicEvents from '@/pages/PublicEvents';
import Escrow from '@/pages/Escrow';
import Payouts from '@/pages/Payouts';
import Promotions from '@/pages/Promotions';
import Discounts from '@/pages/Discounts';
import Reviews from '@/pages/Reviews';
import Analytics from '@/pages/Analytics';
import Messages from '@/pages/Messages';
import Conversation from '@/pages/Conversation';
import Notifications from '@/pages/Notifications';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

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
