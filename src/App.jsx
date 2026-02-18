import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

// Layout
import AppShell from './components/layout/AppShell'
import RequireAuth from './components/auth/RequireAuth'
import RequireRole from './components/auth/RequireRole'
import RequireTier from './components/auth/RequireTier'

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
import SettingsPage from './pages/SettingsPage'
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

          {/* Authenticated routes - Staff only (AppShell layout with sidebar) */}
          <Route element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route path="/dashboard" element={<RequireRole roles={STAFF_ROLES}><DashboardPage /></RequireRole>} />

            {/* Students */}
            <Route path="/students" element={<RequireRole roles={STAFF_ROLES}><StudentsPage /></RequireRole>} />
            <Route path="/students/:id" element={<RequireRole roles={STAFF_ROLES}><StudentDetailPage /></RequireRole>} />

            {/* Incidents */}
            <Route path="/incidents" element={<RequireRole roles={STAFF_ROLES}><IncidentsPage /></RequireRole>} />
            <Route path="/incidents/new" element={<RequireRole roles={STAFF_ROLES}><NewIncidentPage /></RequireRole>} />
            <Route path="/incidents/:id" element={<RequireRole roles={STAFF_ROLES}><IncidentDetailPage /></RequireRole>} />

            {/* Compliance */}
            <Route
              path="/compliance"
              element={
                <RequireRole roles={COMPLIANCE_ROLES}>
                  <RequireTier feature="compliance">
                    <CompliancePage />
                  </RequireTier>
                </RequireRole>
              }
            />

            {/* Alerts */}
            <Route
              path="/alerts"
              element={
                <RequireRole roles={ALERT_ROLES}>
                  <RequireTier feature="alerts">
                    <AlertsPage />
                  </RequireTier>
                </RequireRole>
              }
            />

            {/* Transition Plans */}
            <Route path="/plans" element={<RequireRole roles={STAFF_ROLES}><RequireTier feature="transition_plans"><TransitionPlansPage /></RequireTier></RequireRole>} />
            <Route path="/plans/new" element={<RequireRole roles={STAFF_ROLES}><RequireTier feature="transition_plans"><NewTransitionPlanPage /></RequireTier></RequireRole>} />
            <Route path="/plans/:id" element={<RequireRole roles={STAFF_ROLES}><RequireTier feature="transition_plans"><TransitionPlanDetailPage /></RequireTier></RequireRole>} />

            {/* DAEP Dashboard */}
            <Route path="/daep" element={<RequireRole roles={DAEP_ROLES}><RequireTier feature="daep_dashboard"><DaepDashboardPage /></RequireTier></RequireRole>} />
            <Route path="/daep/phone-return" element={<RequireRole roles={DAEP_ROLES}><RequireTier feature="phone_return"><PhoneReturnPage /></RequireTier></RequireRole>} />
            <Route path="/daep/orientations" element={<RequireRole roles={DAEP_ROLES}><RequireTier feature="daep_dashboard"><OrientationSchedulePage /></RequireTier></RequireRole>} />

            {/* Discipline Matrix */}
            <Route path="/matrix" element={<RequireRole roles={STAFF_ROLES}><DisciplineMatrixPage /></RequireRole>} />
            <Route
              path="/matrix/editor"
              element={
                <RequireRole roles={[ROLES.ADMIN]}>
                  <RequireTier feature="matrix_editor">
                    <MatrixEditorPage />
                  </RequireTier>
                </RequireRole>
              }
            />

            {/* Reports */}
            <Route
              path="/reports"
              element={
                <RequireRole roles={[ROLES.ADMIN, ROLES.PRINCIPAL]}>
                  <RequireTier feature="reports">
                    <ReportsPage />
                  </RequireTier>
                </RequireRole>
              }
            />

            {/* Settings */}
            <Route
              path="/settings"
              element={
                <RequireRole roles={[ROLES.ADMIN]}>
                  <SettingsPage />
                </RequireRole>
              }
            />
            <Route
              path="/settings/offense-codes"
              element={
                <RequireRole roles={[ROLES.ADMIN]}>
                  <OffenseCodeManagerPage />
                </RequireRole>
              }
            />
            <Route
              path="/settings/orientation"
              element={
                <RequireRole roles={[ROLES.ADMIN]}>
                  <OrientationSettingsPage />
                </RequireRole>
              }
            />
            <Route
              path="/settings/import-data"
              element={
                <RequireRole roles={STAFF_ROLES}>
                  <RequireTier feature="data_import">
                    <ImportDataPage />
                  </RequireTier>
                </RequireRole>
              }
            />
          </Route>

          {/* Kiosk - standalone full-screen layout (no AppShell) */}
          <Route path="/kiosk" element={<RequireTier feature="kiosk"><KioskPage /></RequireTier>} />
          <Route path="/orientation-kiosk" element={<RequireTier feature="orientation_kiosk"><OrientationKioskPage /></RequireTier>} />

          {/* Parent Portal - uses AppShell layout, parent role only */}
          <Route element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route path="/parent" element={<RequireRole roles={[ROLES.PARENT]}><RequireTier feature="parent_portal"><ParentDashboardPage /></RequireTier></RequireRole>} />
            <Route path="/parent/incidents/:id" element={<RequireRole roles={[ROLES.PARENT]}><RequireTier feature="parent_portal"><ParentIncidentViewPage /></RequireTier></RequireRole>} />
            <Route path="/parent/plans/:id" element={<RequireRole roles={[ROLES.PARENT]}><RequireTier feature="parent_portal"><ParentPlanViewPage /></RequireTier></RequireRole>} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
