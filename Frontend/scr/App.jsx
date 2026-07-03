import React, { useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationBadgeProvider } from './contexts/NotificationBadgeContext'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Import CSS files properly
import './styles/globals.css'
import './styles/mobile.css'

// Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyPinPage from './pages/VerifyPinPage'
import Dashboard from './pages/Dashboard'
import About from './pages/About'
import Contact from './pages/Contact'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'

// Password Management Pages
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import ChangePassword from './pages/ChangePassword'  // Add this import

// Blog Pages
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import CreateBlogPost from './pages/CreateBlogPost'
import EditBlogPost from './pages/EditBlogPost'
import BlogManagement from './pages/BlogManagement'


// Pastor Pages
import PastorDashboard from './pages/pastor/PastorDashboard'
import SuperadminDashboard from './pages/admin/SuperadminDashboard'
import LeadershipAssignmentsPage from './pages/pastor/LeadershipAssignmentsPage'
import ZonesManagementPage from './pages/pastor/ZonesManagementPage'

// Church Management System Pages
import SundayCheckin from './pages/checkin/SundayCheckin'
import CellDashboard from './pages/cell/CellDashboard'
import CellAttendance from './pages/cell/CellAttendance'
import MeetingPollsPage from './pages/cell/MeetingPollsPage'
import ZoneDashboard from './pages/zone/ZoneDashboard'
import ZoneMembers from './pages/zone/ZoneMembers'
import ZoneCells from './pages/zone/ZoneCells'
import AssignCellLeaderPage from './pages/zone/AssignCellLeaderPage'
import CellChangeRequestPage from './pages/member/CellChangeRequestPage'
import CellChangeRequestsPage from './pages/leadership/CellChangeRequestsPage'

// Other Pages
import MembersPage from './pages/MembersPage'
import AddMemberPage from './pages/AddMemberPage'
import MemberDetailPage from './pages/MemberDetailPage'
import EditMemberPage from './pages/EditMemberPage'
import SermonsPage from './pages/SermonsPage'
import Gallery from './pages/Gallery'
import BiblePage from './pages/BiblePage'
import SermonPrepPage from './pages/SermonPrepPage'
import UploadSermonPage from './pages/UploadSermonPage'
import SermonManagementPage from './pages/SermonManagementPage'
import EventsPage from './pages/EventsPage'
import PublicEventsPage from './pages/PublicEventsPage'
import CreateEventPage from './pages/CreateEventPage'
import EditEventPage from './pages/EditEventPage'
import EventDetailPage from './pages/EventDetailPage'
import PrayerPage from './pages/PrayerPage'
import GivingPage from './pages/GivingPage'
import Give from './pages/Give'
import Support from './pages/Support'
import Careers from './pages/Careers'
import AnalyticsPage from './pages/AnalyticsPage'
import AttendanceHistoryPage from './pages/AttendanceHistoryPage'
import PastoralCarePage from './pages/PastoralCarePage'
import PastoralFollowUpPage from './pages/PastoralFollowUpPage'
import LeadershipPage from './pages/LeadershipPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import ChatPage from './pages/ChatPage'
import SettingsPage from './pages/SettingsPage'
import DonationsPage from './pages/DonationsPage'
import VolunteersPage from './pages/VolunteersPage'
import PermissionsPage from './pages/PermissionsPage'
import PrayerDetailPage from './pages/PrayerDetailPage'

// Developer Pages
import ChurchManagementAPIDocs from './components/ChurchManagementAPIDocs'
import DeveloperLogin from './pages/DeveloperLogin'
import DeveloperRegister from './pages/DeveloperRegister'
import APIKeysPage from './pages/APIKeysPage'
import PricingPage from './pages/PricingPage'
import WebhooksPage from './pages/WebhooksPage'
import APIAnalyticsPage from './pages/APIAnalyticsPage'
import IntegrationsPage from './pages/IntegrationsPage'

// Error Pages
import ErrorPage from './pages/ErrorPage'
import NotFoundPage from './pages/NotFoundPage'

// Family, Lineage & Disciples Pages
import FamilyTreePage from './pages/FamilyTreePage'
import SpiritualLineagePage from './pages/SpiritualLineagePage'
import MyConnectionsPage from './pages/MyConnectionsPage'
import DisciplesPage from './pages/disciples/DisciplesPage'
import DisciplesGroupPage from './pages/disciples/DisciplesGroupPage'

// Admin Pages
import HomeImageManagement from './pages/HomeImageManagement'
import ContactMessagesPage from './pages/admin/ContactMessagesPage'
import AdminCareersPage from './pages/AdminCareersPage'
import sermonPrepPage from './pages/SermonPrepPage'

// Protected Route Component
import ProtectedRoute from './components/common/ProtectedRoute'
import OfflineBanner from './components/common/OfflineBanner'

function RootLayout() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return <Outlet />
}

// Create router with future flags to remove warnings
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/home",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signin",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/signup",
    element: <Register />,
  },
  {
    path: "/verify-pin",
    element: <VerifyPinPage />,
  },
  
  // Public Info Routes
  {
    path: "/about",
    element: <About />,
  },
  {
    path: "/contact",
    element: <Contact />,
  },
  {
    path: "/privacy",
    element: <PrivacyPolicy />,
  },
  {
    path: "/privacy-policy",
    element: <PrivacyPolicy />,
  },
  {
    path: "/terms",
    element: <TermsOfService />,
  },
  {
    path: "/terms-of-service",
    element: <TermsOfService />,
  },
  
  // Password Management Routes
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/forgot",
    element: <ForgotPassword />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "/reset-password/:token",
    element: <ResetPassword />,
  },
  {
    path: "/change-password",
    element: (
      <ProtectedRoute>
        <ChangePassword />
      </ProtectedRoute>
    ),
  },
  
  // Blog Routes (Public)
  {
    path: "/blog",
    element: <Blog />,
  },
  {
    path: "/resources/gallery",
    element: <Gallery />,
  },
  {
    path: "/blog/:id",
    element: <BlogPost />,
  },
  
  // Bible Routes (Public - No Authentication Required)
  {
    path: "/bible",
    element: <BiblePage />,
  },
  
  // Blog Admin Routes (Protected)
  {
    path: "/blog/create",
    element: (
      <ProtectedRoute requirePastor={true}>
        <CreateBlogPost />
      </ProtectedRoute>
    ),
  },
  {
    path: "/blog/edit/:id",
    element: (
      <ProtectedRoute requirePastor={true}>
        <EditBlogPost />
      </ProtectedRoute>
    ),
  },
  {
    path: "/blog/manage",
    element: (
      <ProtectedRoute requirePastor={true}>
        <BlogManagement />
      </ProtectedRoute>
    ),
  },
  
  // Pricing Page (Public)
  {
    path: "/pricing",
    element: <PricingPage />,
  },
  
  // API Documentation Routes (Public)
  {
    path: "/api-docs",
    element: <ChurchManagementAPIDocs />,
  },
  {
    path: "/developers",
    element: <ChurchManagementAPIDocs />,
  },
  {
    path: "/documentation",
    element: <ChurchManagementAPIDocs />,
  },
  
  // Developer Authentication Routes (Public)
  {
    path: "/developers/login",
    element: <DeveloperLogin />,
  },
  {
    path: "/developers/register",
    element: <DeveloperRegister />,
  },
  {
    path: "/dev-login",
    element: <DeveloperLogin />,
  },
  {
    path: "/dev-register",
    element: <DeveloperRegister />,
  },
  
  // Developer Portal Routes (Protected)
  {
    path: "/developers/api-keys",
    element: (
      <ProtectedRoute requireDeveloper={true}>
        <APIKeysPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/developers/webhooks",
    element: (
      <ProtectedRoute requireDeveloper={true}>
        <WebhooksPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/developers/analytics",
    element: (
      <ProtectedRoute requireDeveloper={true}>
        <APIAnalyticsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/developers/integrations",
    element: (
      <ProtectedRoute requireDeveloper={true}>
        <IntegrationsPage />
      </ProtectedRoute>
    ),
  },
  
  // Legacy API Keys route
  {
    path: "/api-keys",
    element: (
      <ProtectedRoute requireDeveloper={true}>
        <APIKeysPage />
      </ProtectedRoute>
    ),
  },
  
  // Pastor Dashboard
  {
    path: "/pastor-dashboard",
    element: (
      <ProtectedRoute requirePastor={true}>
        <PastorDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin-dashboard",
    element: (
      <ProtectedRoute requireRoles={['admin', 'superadmin']}>
        <SuperadminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/pastor/assignments",
    element: (
      <ProtectedRoute requirePastor={true}>
        <LeadershipAssignmentsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/pastor/zones",
    element: (
      <ProtectedRoute requireRoles={['admin', 'superadmin', 'pastor', 'elder']}>
        <ZonesManagementPage />
      </ProtectedRoute>
    ),
  },
  
  // Church Management System Routes
  // Usher Check-in (for ushers and admins)
  {
    path: "/checkin",
    element: (
      <ProtectedRoute requireRoles={['usher', 'admin', 'pastor', 'superadmin']}>
        <SundayCheckin />
      </ProtectedRoute>
    ),
  },
  
  // Cell Leader Routes
  {
    path: "/cell/dashboard",
    element: (
      <ProtectedRoute requireRoles={['cell_leader', 'admin', 'superadmin', 'pastor', 'elder']}>
        <CellDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/cell/attendance",
    element: (
      <ProtectedRoute requireRoles={['cell_leader', 'admin', 'superadmin', 'pastor', 'elder']}>
        <CellAttendance />
      </ProtectedRoute>
    ),
  },
  {
    path: "/meetings/polls",
    element: (
      <ProtectedRoute requireRoles={['member', 'cell_leader', 'zone_leader', 'admin', 'pastor', 'superadmin', 'elder']}>
        <MeetingPollsPage />
      </ProtectedRoute>
    ),
  },
  
  // Zone Leader Routes
  {
    path: "/zone/dashboard",
    element: (
      <ProtectedRoute requireRoles={['zone_leader', 'admin', 'superadmin', 'pastor', 'elder']}>
        <ZoneDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/zone/members",
    element: (
      <ProtectedRoute requireRoles={['zone_leader', 'admin', 'pastor', 'superadmin', 'elder']}>
        <ZoneMembers />
      </ProtectedRoute>
    ),
  },
  {
    path: "/zone/cells",
    element: (
      <ProtectedRoute requireRoles={['zone_leader', 'admin', 'pastor', 'superadmin', 'elder']}>
        <ZoneCells />
      </ProtectedRoute>
    ),
  },
  {
    path: "/zone/cells/:cellId/leader",
    element: (
      <ProtectedRoute requireRoles={['zone_leader', 'admin', 'pastor', 'superadmin', 'elder']}>
        <AssignCellLeaderPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/member/cell-change",
    element: (
      <ProtectedRoute requireRoles={['member']}>
        <CellChangeRequestPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/leadership/cell-change-requests",
    element: (
      <ProtectedRoute requireRoles={['cell_leader', 'zone_leader', 'admin', 'pastor', 'superadmin', 'elder']}>
        <CellChangeRequestsPage />
      </ProtectedRoute>
    ),
  },
  
  // Regular Dashboard
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: <Navigate to="/admin-dashboard" replace />,
  },
  {
    path: "/admin/members",
    element: <Navigate to="/members" replace />,
  },
  {
    path: "/cells",
    element: <Navigate to="/zone/cells" replace />,
  },
  {
    path: "/reports/attendance",
    element: <Navigate to="/analytics" replace />,
  },
  {
    path: "/reports/comparison",
    element: <Navigate to="/analytics" replace />,
  },
  {
    path: "/attendance/my",
    element: (
      <ProtectedRoute>
        <AttendanceHistoryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/attendance/history",
    element: (
      <ProtectedRoute>
        <AttendanceHistoryPage />
      </ProtectedRoute>
    ),
  },

  // Member Management Routes
  {
    path: "/members",
    element: (
      <ProtectedRoute>
        <MembersPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/members/add",
    element: (
      <ProtectedRoute>
        <AddMemberPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/members/:id",
    element: (
      <ProtectedRoute>
        <MemberDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/members/edit/:id",
    element: (
      <ProtectedRoute>
        <EditMemberPage />
      </ProtectedRoute>
    ),
  },

  // Sermons Routes
  {
    path: "/sermons",
    element: <SermonsPage />,
  },
  {
    path: "/sermons/prepare",
    element: (
      <ProtectedRoute>
        <SermonPrepPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/sermons/upload",
    element: (
      <ProtectedRoute>
        <UploadSermonPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/sermons/manage",
    element: (
      <ProtectedRoute requirePastor={true}>
        <SermonManagementPage />
      </ProtectedRoute>
    ),
  },

  // Events Routes
  {
    path: "/events",
    element: <PublicEventsPage />,
  },
  {
    path: "/events/manage",
    element: (
      <ProtectedRoute>
        <EventsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/events/create",
    element: (
      <ProtectedRoute>
        <CreateEventPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/events/:id",
    element: (
      <ProtectedRoute>
        <EventDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/events/edit/:id",
    element: (
      <ProtectedRoute>
        <EditEventPage />
      </ProtectedRoute>
    ),
  },

  // Prayer Routes
  {
    path: "/prayer",
    element: (
      <ProtectedRoute>
        <PrayerPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/prayers",
    element: (
      <ProtectedRoute>
        <PrayerPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/prayers/:id",
    element: (
      <ProtectedRoute requirePastor={true}>
        <PrayerDetailPage />
      </ProtectedRoute>
    ),
  },

  // Public giving landing page
  {
    path: "/give",
    element: <Give />,
  },

  // Public support & careers
  {
    path: "/support",
    element: <Support />,
  },
  {
    path: "/careers",
    element: <Careers />,
  },

  // Giving & Finance Routes
  {
    path: "/giving",
    element: (
      <ProtectedRoute>
        <GivingPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/analytics",
    element: (
      <ProtectedRoute>
        <AnalyticsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/donations",
    element: (
      <ProtectedRoute>
        <DonationsPage />
      </ProtectedRoute>
    ),
  },

  // Pastoral Care Routes
  {
    path: "/pastoral-care",
    element: (
      <ProtectedRoute>
        <PastoralCarePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/pastoral-care/follow-up",
    element: (
      <ProtectedRoute requireRoles={['admin', 'pastor', 'superadmin', 'elder']}>
        <PastoralFollowUpPage />
      </ProtectedRoute>
    ),
  },

  // Sermon Page
  {
    path: "/sermonPrepPage",
    element: (
      <ProtectedRoute requirePastor={true}>
        <SermonPrepPage />
      </ProtectedRoute>
    ),  
  },
  
  // Leadership Routes
  {
    path: "/leadership",
    element: (
      <ProtectedRoute>
        <LeadershipPage />
      </ProtectedRoute>
    ),
  },

  // Communication Routes
  {
    path: "/announcements",
    element: (
      <ProtectedRoute>
        <AnnouncementsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/chat",
    element: (
      <ProtectedRoute>
        <ChatPage />
      </ProtectedRoute>
    ),
  },

  // Settings & Admin Routes
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/permissions",
    element: (
      <ProtectedRoute requirePastor={true}>
        <PermissionsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/home-images",
    element: (
      <ProtectedRoute requirePastor={true}>
        <HomeImageManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/contact-messages",
    element: (
      <ProtectedRoute requireRoles={['admin', 'pastor', 'superadmin', 'elder']}>
        <ContactMessagesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/careers",
    element: (
      <ProtectedRoute requireRoles={['admin', 'superadmin']}>
        <AdminCareersPage />
      </ProtectedRoute>
    ),
  },

  // Family Tree
  {
    path: "/family",
    element: (
      <ProtectedRoute requireRoles={['admin', 'pastor', 'superadmin', 'elder']}>
        <FamilyTreePage />
      </ProtectedRoute>
    ),
  },

  // Spiritual Lineage
  {
    path: "/spiritual-lineage",
    element: (
      <ProtectedRoute requireRoles={['admin', 'pastor', 'superadmin', 'elder']}>
        <SpiritualLineagePage />
      </ProtectedRoute>
    ),
  },

  // My Connections (all members)
  {
    path: "/my-connections",
    element: (
      <ProtectedRoute>
        <MyConnectionsPage />
      </ProtectedRoute>
    ),
  },

  // Disciples Groups
  {
    path: "/disciples",
    element: (
      <ProtectedRoute>
        <DisciplesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/disciples/:id",
    element: (
      <ProtectedRoute>
        <DisciplesGroupPage />
      </ProtectedRoute>
    ),
  },

  // Volunteers Routes
  {
    path: "/volunteers",
    element: (
      <ProtectedRoute>
        <VolunteersPage />
      </ProtectedRoute>
    ),
  },

  
  // Error Routes
  {
    path: "/error",
    element: <ErrorPage />,
  },
  {
    path: "/404",
    element: <NotFoundPage />,
  },
  
  // Catch all route - Keep this LAST
  {
    path: "*",
    element: <Navigate to="/404" replace />,
  },
    ],
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

function App() {
  return (
    <AuthProvider>
        <NotificationBadgeProvider>
          <div className="app min-h-screen bg-gray-50">
            <OfflineBanner />
            <RouterProvider
              router={router}
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            />
            
            <ToastContainer
              position="top-center"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </div>
        </NotificationBadgeProvider>
    </AuthProvider>
  )
}

export default App
