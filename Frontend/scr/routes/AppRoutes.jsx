import { Routes, Route } from 'react-router-dom'
import MobileDashboard from '../pages/mobile/MobileDashboard'
import MobileGiving from '../pages/mobile/MobileGiving'
import MobileEvents from '../pages/mobile/MobileEvents'
import MobileNotifications from '../pages/mobile/MobileNotifications'
import Login from '../pages/Login'
import PastorDashboard from '../pages/pastor/PastorDashboard'
import SuperadminDashboard from '../pages/admin/SuperadminDashboard'
import LeadershipAssignmentsPage from '../pages/pastor/LeadershipAssignmentsPage'
import ZonesManagementPage from '../pages/pastor/ZonesManagementPage'
import ZoneLeaderRequestPage from '../pages/member/ZoneLeaderRequestPage'
import AssignCellLeaderPage from '../pages/zone/AssignCellLeaderPage'
import PermissionsPage from '../pages/PermissionsPage'
import AddMemberPage from '../pages/AddMemberPage'
import MembersPage from '../pages/MembersPage'
import VolunteersPage from '../pages/VolunteersPage'
import SermonPrepPage from '../pages/SermonPrepPage'
import UploadSermonPage from '../pages/UploadSermonPage'
import SermonsPage from '../pages/SermonsPage'
import LeadershipPage from '../pages/LeadershipPage'
import CreateEventPage from '../pages/CreateEventPage'
import EventsPage from '../pages/EventsPage'
import AnnouncementsPage from '../pages/AnnouncementsPage'
import PastoralCarePage from '../pages/PastoralCarePage'
import PrayerPage from '../pages/PrayerPage'
import PrayerDetailPage from '../pages/PrayerDetailPage'
import GivingPage from '../pages/GivingPage'
import AnalyticsPage from '../pages/AnalyticsPage'
import DonationsPage from '../pages/DonationsPage'
import ChatPage from '../pages/ChatPage'
import SettingsPage from '../pages/SettingsPage'
import Dashboard from '../pages/Dashboard'


export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/mobile/dashboard" element={<MobileDashboard />} />
      <Route path="/mobile/giving" element={<MobileGiving />} />
      <Route path="/mobile/events" element={<MobileEvents />} />
      <Route path="/mobile/notifications" element={<MobileNotifications />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="/pastor-dashboard" element={<PastorDashboard />} />
      <Route path="/admin-dashboard" element={<SuperadminDashboard />} />
      <Route path="/pastor/assignments" element={<LeadershipAssignmentsPage />} />
      <Route path="/pastor/zones" element={<ZonesManagementPage />} />
      <Route path="/zone/cells/:cellId/leader" element={<AssignCellLeaderPage />} />
      <Route path="/member/zone-leader-request" element={<ZoneLeaderRequestPage />} />
      <Route path="/members/add" element={<AddMemberPage />} />
      <Route path="/members" element={<MembersPage />} />
      <Route path="/volunteers" element={<VolunteersPage />} />
      <Route path="/sermons/prepare" element={<SermonPrepPage />} />
      <Route path="/sermons/upload" element={<UploadSermonPage />} />
      <Route path="/sermons" element={<SermonsPage />} />
      <Route path="/leadership" element={<LeadershipPage />} />
      <Route path="/events/create" element={<CreateEventPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/announcements" element={<AnnouncementsPage />} />
      <Route path="/pastoral-care" element={<PastoralCarePage />} />
      <Route path="/prayers" element={<PrayerPage />} />
      <Route path="/prayers/:id" element={<PrayerDetailPage />} />
      <Route path="/giving" element={<GivingPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/donations" element={<DonationsPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/permissions" element={<PermissionsPage />} />
    </Routes>
  )
}
