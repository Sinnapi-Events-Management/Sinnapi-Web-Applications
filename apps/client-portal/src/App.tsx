import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/auth/ProtectedRoute";
import AppShell from "@/components/shell/AppShell";

import SignIn from "@/pages/auth/SignIn";
import SignUp from "@/pages/auth/SignUp";
import AuthCallback from "@/pages/auth/AuthCallback";

import Dashboard from "@/pages/Dashboard";
import Discover from "@/pages/Discover";
import VendorDetail from "@/pages/VendorDetail";
import Bookings from "@/pages/Bookings";
import BookingDetail from "@/pages/BookingDetail";
import Quotations from "@/pages/Quotations";
import CompareQuotes from "@/pages/CompareQuotes";
import MyEvents from "@/pages/MyEvents";
import NewEvent from "@/pages/NewEvent";
import Messages from "@/pages/Messages";
import Conversation from "@/pages/Conversation";
import Payments from "@/pages/Payments";
import Escrow from "@/pages/Escrow";
import Reviews from "@/pages/Reviews";
import Notifications from "@/pages/Notifications";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

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
