import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

// Layout + guards — always eager (needed before any route renders)
import AppShell from './components/layout/AppShell'
import RequireAuth from './components/auth/RequireAuth'
import RequireRole from './components/auth/RequireRole'
import RequireTier from './components/auth/RequireTier'
import RequireProduct from './components/auth/RequireProduct'

// ── Eager pages (critical path — hit immediately on login) ──────────────────
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DemoGatePage from './pages/DemoGatePage'
import NotFoundPage from './pages/NotFoundPage'
import DashboardPage from './pages/DashboardPage'
import StudentsPage from './pages/StudentsPage'
import StudentDetailPage from './pages/StudentDetailPage'
import IncidentsPage from './pages/IncidentsPage'
import NewIncidentPage from './pages/NewIncidentPage'
import IncidentDetailPage from './pages/IncidentDetailPage'
import AlertsPage from './pages/AlertsPage'
import CompliancePage from './pages/CompliancePage'

// ── Lazy pages (load on first navigation to that route) ────────────────────
// Waypoint
const ComplianceDashboardPage   = lazy(() => import('./pages/ComplianceDashboardPage'))
const TransitionPlansPage       = lazy(() => import('./pages/TransitionPlansPage'))
const TransitionPlanDetailPage  = lazy(() => import('./pages/TransitionPlanDetailPage'))
const NewTransitionPlanPage     = lazy(() => import('./pages/NewTransitionPlanPage'))
const DaepDashboardPage         = lazy(() => import('./pages/DaepDashboardPage'))
const PhoneReturnPage           = lazy(() => import('./pages/PhoneReturnPage'))
const OrientationSchedulePage   = lazy(() => import('./pages/OrientationSchedulePage'))
const OrientationKioskPage      = lazy(() => import('./pages/OrientationKioskPage'))
const ReportsPage               = lazy(() => import('./pages/ReportsPage'))
const DisciplineMatrixPage      = lazy(() => import('./pages/DisciplineMatrixPage'))
const MatrixEditorPage          = lazy(() => import('./pages/MatrixEditorPage'))
const OffenseCodeManagerPage    = lazy(() => import('./pages/OffenseCodeManagerPage'))
const OrientationSettingsPage   = lazy(() => import('./pages/OrientationSettingsPage'))
const ImportDataPage            = lazy(() => import('./pages/ImportDataPage'))
const SettingsPage              = lazy(() => import('./pages/SettingsPage'))
const NotificationPrefsPage     = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.NotificationPreferencesPage })))
const UserManagementPage        = lazy(() => import('./pages/UserManagementPage'))
const QuickIncidentPage         = lazy(() => import('./pages/QuickIncidentPage'))
const DaepScoringPage           = lazy(() => import('./pages/DaepScoringPage'))
const CalendarPage              = lazy(() => import('./pages/CalendarPage'))
const KioskPage                 = lazy(() => import('./pages/KioskPage'))
const WaypointAdminPage         = lazy(() => import('./pages/WaypointAdminPage'))
const ParentDashboardPage       = lazy(() => import('./pages/ParentDashboardPage'))
const ParentIncidentViewPage    = lazy(() => import('./pages/ParentIncidentViewPage'))
const ParentPlanViewPage        = lazy(() => import('./pages/ParentPlanViewPage'))
const ParentRegisterPage        = lazy(() => import('./pages/ParentRegisterPage'))

// Navigator
const NavigatorDashboardPage        = lazy(() => import('./pages/navigator/NavigatorDashboardPage'))
const NavigatorReferralsPage        = lazy(() => import('./pages/navigator/NavigatorReferralsPage'))
const NavigatorPlacementsPage       = lazy(() => import('./pages/navigator/NavigatorPlacementsPage'))
const NavigatorSupportsPage         = lazy(() => import('./pages/navigator/NavigatorSupportsPage'))
const NavigatorStudentsListPage     = lazy(() => import('./pages/navigator/NavigatorStudentsListPage'))
const NavigatorStudentPage          = lazy(() => import('./pages/navigator/NavigatorStudentPage'))
const NavigatorReportsPage          = lazy(() => import('./pages/navigator/NavigatorReportsPage'))
const NavigatorGoalsPage            = lazy(() => import('./pages/navigator/NavigatorGoalsPage'))
const NavigatorImportPage           = lazy(() => import('./pages/navigator/NavigatorImportPage'))
const NavigatorFormsPage            = lazy(() => import('./pages/navigator/NavigatorFormsPage'))
const NavigatorEscalationPage       = lazy(() => import('./pages/navigator/NavigatorEscalationPage'))
const NavigatorSkillMapPage         = lazy(() => import('./pages/navigator/NavigatorSkillMapPage'))
const NavigatorEffectivenessPage    = lazy(() => import('./pages/navigator/NavigatorEffectivenessPage'))
const NavigatorDisproportionalityPage = lazy(() => import('./pages/navigator/NavigatorDisproportionalityPage'))
const NavigatorPilotPage            = lazy(() => import('./pages/navigator/NavigatorPilotPage'))
const ISSKioskPage                  = lazy(() => import('./pages/navigator/ISSKioskPage'))

// Meridian
const MeridianDashboardPage     = lazy(() => import('./pages/meridian/MeridianDashboardPage'))
const MeridianTimelinesPage     = lazy(() => import('./pages/meridian/MeridianTimelinesPage'))
const MeridianStudentDetailPage = lazy(() => import('./pages/meridian/MeridianStudentDetailPage'))
const MeridianDyslexiaPage      = lazy(() => import('./pages/meridian/MeridianDyslexiaPage'))
const MeridianFolderReadinessPage = lazy(() => import('./pages/meridian/MeridianFolderReadinessPage'))
const MeridianCAPTrackerPage    = lazy(() => import('./pages/meridian/MeridianCAPTrackerPage'))
const MeridianWaypointSyncPage  = lazy(() => import('./pages/meridian/MeridianWaypointSyncPage'))
const MeridianIntegrationPage   = lazy(() => import('./pages/meridian/MeridianIntegrationPage'))
const MeridianSPPI13Page        = lazy(() => import('./pages/meridian/MeridianSPPI13Page'))
const MeridianRDAPage           = lazy(() => import('./pages/meridian/MeridianRDAPage'))

// Origins staff
const OriginsDashboardPage        = lazy(() => import('./pages/origins/OriginsDashboardPage'))
const OriginsResponseMomentsPage  = lazy(() => import('./pages/origins/OriginsResponseMomentsPage'))
const OriginsReplayToolPage       = lazy(() => import('./pages/origins/OriginsReplayToolPage'))
const OriginsFamilyWorkspacePage  = lazy(() => import('./pages/origins/OriginsFamilyWorkspacePage'))
const OriginsSkillPathwaysPage    = lazy(() => import('./pages/origins/OriginsSkillPathwaysPage'))
const OriginsStudentDetailPage    = lazy(() => import('./pages/origins/OriginsStudentDetailPage'))
const OriginsProgressPage         = lazy(() => import('./pages/origins/OriginsProgressPage'))
const OriginsSettingsPage         = lazy(() => import('./pages/origins/OriginsSettingsPage'))

// Origins family portal (standalone)
const OriginsFamilyEntryPage   = lazy(() => import('./pages/origins/portal/OriginsFamilyEntryPage'))
const OriginsStudentPortalPage = lazy(() => import('./pages/origins/portal/OriginsStudentPortalPage'))
const OriginsParentPortalPage  = lazy(() => import('./pages/origins/portal/OriginsParentPortalPage'))
const OriginsScenarioPlayer    = lazy(() => import('./pages/origins/portal/OriginsScenarioPlayer'))

// Constants
import { COMPLIANCE_ROLES, ALERT_ROLES, ROLES, STAFF_ROLES, DAEP_ROLES } from './lib/constants'

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/demo" element={<DemoGatePage />} />
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
                <Route path="/compliance-dashboard" element={<RequireRole roles={[ROLES.ADMIN]}><RequireTier feature="compliance"><ComplianceDashboardPage /></RequireTier></RequireRole>} />
                <Route path="/alerts" element={<RequireRole roles={ALERT_ROLES}><RequireTier feature="alerts"><AlertsPage /></RequireTier></RequireRole>} />

                <Route path="/plans" element={<RequireRole roles={STAFF_ROLES}><RequireTier feature="transition_plans"><TransitionPlansPage /></RequireTier></RequireRole>} />
                <Route path="/plans/new" element={<RequireRole roles={STAFF_ROLES}><RequireTier feature="transition_plans"><NewTransitionPlanPage /></RequireTier></RequireRole>} />
                <Route path="/plans/:id" element={<RequireRole roles={STAFF_ROLES}><RequireTier feature="transition_plans"><TransitionPlanDetailPage /></RequireTier></RequireRole>} />

                <Route path="/daep" element={<RequireRole roles={DAEP_ROLES}><RequireTier feature="daep_dashboard"><DaepDashboardPage /></RequireTier></RequireRole>} />
                <Route path="/daep/phone-return" element={<RequireRole roles={DAEP_ROLES}><RequireTier feature="phone_return"><PhoneReturnPage /></RequireTier></RequireRole>} />
                <Route path="/daep/orientations" element={<RequireRole roles={DAEP_ROLES}><RequireTier feature="daep_dashboard"><OrientationSchedulePage /></RequireTier></RequireRole>} />
                <Route path="/quick-report" element={<RequireRole roles={STAFF_ROLES}><QuickIncidentPage /></RequireRole>} />
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
                <Route path="/navigator/students" element={<RequireRole roles={STAFF_ROLES}><NavigatorStudentsListPage /></RequireRole>} />
                <Route path="/navigator/students/:id" element={<RequireRole roles={STAFF_ROLES}><NavigatorStudentPage /></RequireRole>} />
                <Route path="/navigator/reports" element={<RequireRole roles={STAFF_ROLES}><NavigatorReportsPage /></RequireRole>} />
                <Route path="/navigator/goals" element={<RequireRole roles={STAFF_ROLES}><NavigatorGoalsPage /></RequireRole>} />
                <Route path="/navigator/forms" element={<RequireRole roles={STAFF_ROLES}><NavigatorFormsPage /></RequireRole>} />
                <Route path="/navigator/import" element={<RequireRole roles={[ROLES.ADMIN, ROLES.PRINCIPAL]}><NavigatorImportPage /></RequireRole>} />
                <Route path="/navigator/escalation" element={<RequireRole roles={STAFF_ROLES}><NavigatorEscalationPage /></RequireRole>} />
                <Route path="/navigator/skill-map" element={<RequireRole roles={STAFF_ROLES}><NavigatorSkillMapPage /></RequireRole>} />
                <Route path="/navigator/effectiveness" element={<RequireRole roles={STAFF_ROLES}><NavigatorEffectivenessPage /></RequireRole>} />
                <Route path="/navigator/disproportionality" element={<RequireRole roles={STAFF_ROLES}><NavigatorDisproportionalityPage /></RequireRole>} />
                <Route path="/navigator/pilot" element={<RequireRole roles={STAFF_ROLES}><NavigatorPilotPage /></RequireRole>} />
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

              {/* ── Discipline Matrix ── */}
              <Route path="/matrix" element={<RequireRole roles={STAFF_ROLES}><DisciplineMatrixPage /></RequireRole>} />
              <Route path="/matrix/editor" element={<RequireRole roles={[ROLES.ADMIN]}><RequireTier feature="matrix_editor"><MatrixEditorPage /></RequireTier></RequireRole>} />

              {/* ── Settings ── */}
              <Route path="/settings" element={<RequireRole roles={[ROLES.ADMIN]}><SettingsPage /></RequireRole>} />
              <Route path="/settings/users" element={<RequireRole roles={[ROLES.ADMIN]}><UserManagementPage /></RequireRole>} />
              <Route path="/settings/notifications" element={<RequireRole roles={STAFF_ROLES}><NotificationPrefsPage /></RequireRole>} />
            </Route>

            {/* Kiosk - standalone full-screen layout (no AppShell) */}
            <Route path="/kiosk" element={<RequireTier feature="kiosk"><KioskPage /></RequireTier>} />
            <Route path="/orientation-kiosk" element={<RequireTier feature="orientation_kiosk"><OrientationKioskPage /></RequireTier>} />
            <Route path="/navigator/iss-kiosk" element={<RequireAuth><RequireProduct product="navigator"><ISSKioskPage /></RequireProduct></RequireAuth>} />

            {/* Waypoint Internal Admin */}
            <Route path="/waypoint-admin" element={
              <RequireAuth><RequireRole roles={[ROLES.WAYPOINT_ADMIN]}><WaypointAdminPage /></RequireRole></RequireAuth>
            } />

            {/* Parent portal removed — parents are notified via email, not app login */}
            {/* Parent self-registration removed — not needed for admin-only tool */}

            {/* Origins Family Portal */}
            <Route path="/family" element={<OriginsFamilyEntryPage />} />
            <Route path="/family/student" element={<OriginsStudentPortalPage />} />
            <Route path="/family/student/scenario/:id" element={<OriginsScenarioPlayer />} />
            <Route path="/family/parent" element={<OriginsParentPortalPage />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  )
}

export default App
