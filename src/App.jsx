import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

// Layout
import AppShell from './components/layout/AppShell'
import RequireAuth from './components/auth/RequireAuth'
import RequireRole from './components/auth/RequireRole'
import RequireTier from './components/auth/RequireTier'
import RequireProduct from './components/auth/RequireProduct'

// Navigator pages
import NavigatorDashboardPage from './pages/navigator/NavigatorDashboardPage'
import NavigatorReferralsPage from './pages/navigator/NavigatorReferralsPage'
import NavigatorPlacementsPage from './pages/navigator/NavigatorPlacementsPage'
import NavigatorSupportsPage from './pages/navigator/NavigatorSupportsPage'
import NavigatorStudentPage from './pages/navigator/NavigatorStudentPage'
import NavigatorReportsPage from './pages/navigator/NavigatorReportsPage'
import NavigatorGoalsPage from './pages/navigator/NavigatorGoalsPage'
import NavigatorImportPage from './pages/navigator/NavigatorImportPage'
import NavigatorEscalationPage from './pages/navigator/NavigatorEscalationPage'
import NavigatorSkillMapPage from './pages/navigator/NavigatorSkillMapPage'
import NavigatorEffectivenessPage from './pages/navigator/NavigatorEffectivenessPage'
import NavigatorDisproportionalityPage from './pages/navigator/NavigatorDisproportionalityPage'
import NavigatorPilotPage from './pages/navigator/NavigatorPilotPage'

// Origins family portal (standalone — no AppShell)
import OriginsFamilyEntryPage from './pages/origins/portal/OriginsFamilyEntryPage'
import OriginsStudentPortalPage from './pages/origins/portal/OriginsStudentPortalPage'
import OriginsParentPortalPage from './pages/origins/portal/OriginsParentPortalPage'
import OriginsScenarioPlayer from './pages/origins/portal/OriginsScenarioPlayer'

// Origins staff pages
import OriginsDashboardPage from './pages/origins/OriginsDashboardPage'
import OriginsResponseMomentsPage from './pages/origins/OriginsResponseMomentsPage'
import OriginsReplayToolPage from './pages/origins/OriginsReplayToolPage'
import OriginsFamilyWorkspacePage from './pages/origins/OriginsFamilyWorkspacePage'
import OriginsSkillPathwaysPage from './pages/origins/OriginsSkillPathwaysPage'
import OriginsStudentDetailPage from './pages/origins/OriginsStudentDetailPage'
import OriginsProgressPage from './pages/origins/OriginsProgressPage'
import OriginsSettingsPage from './pages/origins/OriginsSettingsPage'

// Meridian pages
import MeridianDashboardPage from './pages/meridian/MeridianDashboardPage'
import MeridianTimelinesPage from './pages/meridian/MeridianTimelinesPage'
import MeridianStudentDetailPage from './pages/meridian/MeridianStudentDetailPage'
import MeridianDyslexiaPage from './pages/meridian/MeridianDyslexiaPage'
import MeridianFolderReadinessPage from './pages/meridian/MeridianFolderReadinessPage'
import MeridianCAPTrackerPage from './pages/meridian/MeridianCAPTrackerPage'
import MeridianWaypointSyncPage from './pages/meridian/MeridianWaypointSyncPage'
import MeridianIntegrationPage from './pages/meridian/MeridianIntegrationPage'
import MeridianSPPI13Page from './pages/meridian/MeridianSPPI13Page'
import MeridianRDAPage from './pages/meridian/MeridianRDAPage'

// Public pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'

// Authenticated pages
import DashboardPage from './pages/DashboardPage'
import StudentsPage from './pages/StudentsPage'
import StudentDetailPage from './pages/StudentDetailPage'
import IncidentsPage from './pages/IncidentsPage'
import NewIncidentPage from './pages/NewIncidentPage'
import IncidentDetailPage from './pages/IncidentDetailPage'
import CompliancePage from './pages/CompliancePage'
import AlertsPage from './pages/AlertsPage'
import DisciplineMatrixPage from './pages/DisciplineMatrixPage'
import MatrixEditorPage from './pages/MatrixEditorPage'
import OffenseCodeManagerPage from './pages/OffenseCodeManagerPage'
import SettingsPage, { NotificationPreferencesPage } from './pages/SettingsPage'
import TransitionPlansPage from './pages/TransitionPlansPage'
import TransitionPlanDetailPage from './pages/TransitionPlanDetailPage'
import NewTransitionPlanPage from './pages/NewTransitionPlanPage'
import KioskPage from './pages/KioskPage'
import ParentDashboardPage from './pages/ParentDashboardPage'
import ParentIncidentViewPage from './pages/ParentIncidentViewPage'
import ParentPlanViewPage from './pages/ParentPlanViewPage'
import ReportsPage from './pages/ReportsPage'
import DaepDashboardPage from './pages/DaepDashboardPage'
import ImportDataPage from './pages/ImportDataPage'
import OrientationSettingsPage from './pages/OrientationSettingsPage'
import PhoneReturnPage from './pages/PhoneReturnPage'
import OrientationSchedulePage from './pages/OrientationSchedulePage'
import OrientationKioskPage from './pages/OrientationKioskPage'
import WaypointAdminPage from './pages/WaypointAdminPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import TeacherReferralPage from './pages/TeacherReferralPage'
import DaepScoringPage from './pages/DaepScoringPage'
import CalendarPage from './pages/CalendarPage'
import UserManagementPage from './pages/UserManagementPage'
import ParentRegisterPage from './pages/ParentRegisterPage'

// Constants
import { COMPLIANCE_ROLES, ALERT_ROLES, ROLES, STAFF_ROLES, DAEP_ROLES } from './lib/constants'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Authenticated routes - Staff only (AppShell layout with sidebar) */}
          <Route element={<RequireAuth><AppShell /></RequireAuth>}>

            {/* ── Waypoint product routes ── */}
            <Route element={<RequireProduct product="waypoint"><Outlet /></RequireProduct>}>
              <Route path="/dashboard" element={<RequireRole roles={STAFF_ROLES}><DashboardPage /></RequireRole>} />

              <Route path="/students" element={<RequireRole roles={STAFF_ROLES}><StudentsPage /></RequireRole>} />
              <Route path="/students/:id" element={<RequireRole roles={STAFF_ROLES}><StudentDetailPage /></RequireRole>} />

              <Route path="/incidents" element={<RequireRole roles={STAFF_ROLES}><IncidentsPage /></RequireRole>} />
              <Route path="/incidents/new" element={<RequireRole roles={STAFF_ROLES}><NewIncidentPage /></RequireRole>} />
              <Route path="/incidents/:id" element={<RequireRole roles={STAFF_ROLES}><IncidentDetailPage /></RequireRole>} />

              <Route path="/compliance" element={<RequireRole roles={COMPLIANCE_ROLES}><RequireTier feature="compliance"><CompliancePage /></RequireTier></RequireRole>} />
              <Route path="/alerts" element={<RequireRole roles={ALERT_ROLES}><RequireTier feature="alerts"><AlertsPage /></RequireTier></RequireRole>} />

              <Route path="/plans" element={<RequireRole roles={STAFF_ROLES}><RequireTier feature="transition_plans"><TransitionPlansPage /></RequireTier></RequireRole>} />
              <Route path="/plans/new" element={<RequireRole roles={STAFF_ROLES}><RequireTier feature="transition_plans"><NewTransitionPlanPage /></RequireTier></RequireRole>} />
              <Route path="/plans/:id" element={<RequireRole roles={STAFF_ROLES}><RequireTier feature="transition_plans"><TransitionPlanDetailPage /></RequireTier></RequireRole>} />

              <Route path="/daep" element={<RequireRole roles={DAEP_ROLES}><RequireTier feature="daep_dashboard"><DaepDashboardPage /></RequireTier></RequireRole>} />
              <Route path="/daep/phone-return" element={<RequireRole roles={DAEP_ROLES}><RequireTier feature="phone_return"><PhoneReturnPage /></RequireTier></RequireRole>} />
              <Route path="/daep/orientations" element={<RequireRole roles={DAEP_ROLES}><RequireTier feature="daep_dashboard"><OrientationSchedulePage /></RequireTier></RequireRole>} />
              <Route path="/daep/scoring" element={<RequireRole roles={STAFF_ROLES}><RequireTier feature="daep_dashboard"><DaepScoringPage /></RequireTier></RequireRole>} />

              <Route path="/referral" element={<RequireRole roles={STAFF_ROLES}><TeacherReferralPage /></RequireRole>} />
              <Route path="/calendar" element={<RequireRole roles={STAFF_ROLES}><CalendarPage /></RequireRole>} />

              <Route path="/reports" element={<RequireRole roles={[ROLES.ADMIN, ROLES.PRINCIPAL]}><RequireTier feature="reports"><ReportsPage /></RequireTier></RequireRole>} />

              <Route path="/settings/offense-codes" element={<RequireRole roles={[ROLES.ADMIN]}><OffenseCodeManagerPage /></RequireRole>} />
              <Route path="/settings/orientation" element={<RequireRole roles={[ROLES.ADMIN]}><OrientationSettingsPage /></RequireRole>} />
              <Route path="/settings/import-data" element={<RequireRole roles={STAFF_ROLES}><RequireTier feature="data_import"><ImportDataPage /></RequireTier></RequireRole>} />
            </Route>

            {/* ── Navigator product routes ── */}
            <Route element={<RequireProduct product="navigator"><Outlet /></RequireProduct>}>
              <Route path="/navigator" element={<RequireRole roles={STAFF_ROLES}><NavigatorDashboardPage /></RequireRole>} />
              <Route path="/navigator/referrals" element={<RequireRole roles={STAFF_ROLES}><NavigatorReferralsPage /></RequireRole>} />
              <Route path="/navigator/placements" element={<RequireRole roles={STAFF_ROLES}><NavigatorPlacementsPage /></RequireRole>} />
              <Route path="/navigator/supports" element={<RequireRole roles={STAFF_ROLES}><NavigatorSupportsPage /></RequireRole>} />
              <Route path="/navigator/students/:id" element={<RequireRole roles={STAFF_ROLES}><NavigatorStudentPage /></RequireRole>} />
              <Route path="/navigator/reports" element={<RequireRole roles={STAFF_ROLES}><NavigatorReportsPage /></RequireRole>} />
              <Route path="/navigator/goals" element={<RequireRole roles={STAFF_ROLES}><NavigatorGoalsPage /></RequireRole>} />
              <Route path="/navigator/import" element={<RequireRole roles={[ROLES.ADMIN, ROLES.PRINCIPAL]}><NavigatorImportPage /></RequireRole>} />
              <Route path="/navigator/escalation" element={<RequireRole roles={STAFF_ROLES}><NavigatorEscalationPage /></RequireRole>} />
              <Route path="/navigator/skill-map" element={<RequireRole roles={STAFF_ROLES}><NavigatorSkillMapPage /></RequireRole>} />
              <Route path="/navigator/effectiveness" element={<RequireRole roles={STAFF_ROLES}><NavigatorEffectivenessPage /></RequireRole>} />
              <Route path="/navigator/disproportionality" element={<RequireRole roles={STAFF_ROLES}><NavigatorDisproportionalityPage /></RequireRole>} />
              <Route path="/navigator/pilot" element={<RequireRole roles={[ROLES.ADMIN, ROLES.PRINCIPAL]}><NavigatorPilotPage /></RequireRole>} />
            </Route>

            {/* ── Meridian product routes ── */}
            <Route element={<RequireProduct product="meridian"><Outlet /></RequireProduct>}>
              <Route path="/meridian" element={<RequireRole roles={STAFF_ROLES}><MeridianDashboardPage /></RequireRole>} />
              <Route path="/meridian/timelines" element={<RequireRole roles={STAFF_ROLES}><MeridianTimelinesPage /></RequireRole>} />
              <Route path="/meridian/students/:studentId" element={<RequireRole roles={STAFF_ROLES}><MeridianStudentDetailPage /></RequireRole>} />
              <Route path="/meridian/dyslexia" element={<RequireRole roles={STAFF_ROLES}><MeridianDyslexiaPage /></RequireRole>} />
              <Route path="/meridian/folders" element={<RequireRole roles={STAFF_ROLES}><MeridianFolderReadinessPage /></RequireRole>} />
              <Route path="/meridian/cap" element={<RequireRole roles={STAFF_ROLES}><MeridianCAPTrackerPage /></RequireRole>} />
              <Route path="/meridian/waypoint-sync" element={<RequireRole roles={STAFF_ROLES}><MeridianWaypointSyncPage /></RequireRole>} />
              <Route path="/meridian/integration" element={<RequireRole roles={STAFF_ROLES}><MeridianIntegrationPage /></RequireRole>} />
              <Route path="/meridian/transition" element={<RequireRole roles={STAFF_ROLES}><MeridianSPPI13Page /></RequireRole>} />
              <Route path="/meridian/rda" element={<RequireRole roles={STAFF_ROLES}><MeridianRDAPage /></RequireRole>} />
            </Route>

            {/* ── Origins product routes ── */}
            <Route element={<RequireProduct product="origins"><Outlet /></RequireProduct>}>
              <Route path="/origins" element={<RequireRole roles={STAFF_ROLES}><OriginsDashboardPage /></RequireRole>} />
              <Route path="/origins/response-moments" element={<RequireRole roles={STAFF_ROLES}><OriginsResponseMomentsPage /></RequireRole>} />
              <Route path="/origins/replay-tool" element={<RequireRole roles={STAFF_ROLES}><OriginsReplayToolPage /></RequireRole>} />
              <Route path="/origins/family-workspace" element={<RequireRole roles={STAFF_ROLES}><OriginsFamilyWorkspacePage /></RequireRole>} />
              <Route path="/origins/pathways" element={<RequireRole roles={STAFF_ROLES}><OriginsSkillPathwaysPage /></RequireRole>} />
              <Route path="/origins/students/:id" element={<RequireRole roles={STAFF_ROLES}><OriginsStudentDetailPage /></RequireRole>} />
              <Route path="/origins/progress" element={<RequireRole roles={STAFF_ROLES}><OriginsProgressPage /></RequireRole>} />
              <Route path="/origins/settings" element={<RequireRole roles={[ROLES.ADMIN]}><OriginsSettingsPage /></RequireRole>} />
            </Route>

            {/* ── Discipline Matrix — shared district config, accessible with any product ── */}
            <Route path="/matrix" element={<RequireRole roles={STAFF_ROLES}><DisciplineMatrixPage /></RequireRole>} />
            <Route path="/matrix/editor" element={<RequireRole roles={[ROLES.ADMIN]}><RequireTier feature="matrix_editor"><MatrixEditorPage /></RequireTier></RequireRole>} />

            {/* ── Settings — always accessible to admin regardless of product ── */}
            <Route path="/settings" element={<RequireRole roles={[ROLES.ADMIN]}><SettingsPage /></RequireRole>} />
            <Route path="/settings/users" element={<RequireRole roles={[ROLES.ADMIN]}><UserManagementPage /></RequireRole>} />
            <Route path="/settings/notifications" element={<RequireRole roles={STAFF_ROLES}><NotificationPreferencesPage /></RequireRole>} />
          </Route>

          {/* Kiosk - standalone full-screen layout (no AppShell) */}
          <Route path="/kiosk" element={<RequireTier feature="kiosk"><KioskPage /></RequireTier>} />
          <Route path="/orientation-kiosk" element={<RequireTier feature="orientation_kiosk"><OrientationKioskPage /></RequireTier>} />

          {/* Waypoint Internal Admin - standalone, requires waypoint_admin role */}
          <Route path="/waypoint-admin" element={
            <RequireAuth><RequireRole roles={[ROLES.WAYPOINT_ADMIN]}><WaypointAdminPage /></RequireRole></RequireAuth>
          } />

          {/* Parent Portal - uses AppShell layout, parent role only */}
          <Route element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route path="/parent" element={<RequireRole roles={[ROLES.PARENT]}><RequireTier feature="parent_portal"><ParentDashboardPage /></RequireTier></RequireRole>} />
            <Route path="/parent/incidents/:id" element={<RequireRole roles={[ROLES.PARENT]}><RequireTier feature="parent_portal"><ParentIncidentViewPage /></RequireTier></RequireRole>} />
            <Route path="/parent/plans/:id" element={<RequireRole roles={[ROLES.PARENT]}><RequireTier feature="parent_portal"><ParentPlanViewPage /></RequireTier></RequireRole>} />
          </Route>

          {/* Parent self-registration — public, no auth required */}
          <Route path="/parent-register" element={<ParentRegisterPage />} />

          {/* Origins Family Portal — standalone, no auth required */}
          <Route path="/family" element={<OriginsFamilyEntryPage />} />
          <Route path="/family/student" element={<OriginsStudentPortalPage />} />
          <Route path="/family/student/scenario/:id" element={<OriginsScenarioPlayer />} />
          <Route path="/family/parent" element={<OriginsParentPortalPage />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
