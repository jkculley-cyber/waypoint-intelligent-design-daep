import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

// Layout
import AppShell from './components/layout/AppShell'
import RequireAuth from './components/auth/RequireAuth'
import RequireRole from './components/auth/RequireRole'

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
import PhoneReturnPage from './pages/PhoneReturnPage'

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
                  <CompliancePage />
                </RequireRole>
              }
            />

            {/* Alerts */}
            <Route
              path="/alerts"
              element={
                <RequireRole roles={ALERT_ROLES}>
                  <AlertsPage />
                </RequireRole>
              }
            />

            {/* Transition Plans */}
            <Route path="/plans" element={<RequireRole roles={STAFF_ROLES}><TransitionPlansPage /></RequireRole>} />
            <Route path="/plans/new" element={<RequireRole roles={STAFF_ROLES}><NewTransitionPlanPage /></RequireRole>} />
            <Route path="/plans/:id" element={<RequireRole roles={STAFF_ROLES}><TransitionPlanDetailPage /></RequireRole>} />

            {/* DAEP Dashboard */}
            <Route path="/daep" element={<RequireRole roles={DAEP_ROLES}><DaepDashboardPage /></RequireRole>} />
            <Route path="/daep/phone-return" element={<RequireRole roles={DAEP_ROLES}><PhoneReturnPage /></RequireRole>} />

            {/* Discipline Matrix */}
            <Route path="/matrix" element={<RequireRole roles={STAFF_ROLES}><DisciplineMatrixPage /></RequireRole>} />
            <Route
              path="/matrix/editor"
              element={
                <RequireRole roles={[ROLES.ADMIN]}>
                  <MatrixEditorPage />
                </RequireRole>
              }
            />

            {/* Reports */}
            <Route
              path="/reports"
              element={
                <RequireRole roles={[ROLES.ADMIN, ROLES.PRINCIPAL]}>
                  <ReportsPage />
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
              path="/settings/import-data"
              element={
                <RequireRole roles={STAFF_ROLES}>
                  <ImportDataPage />
                </RequireRole>
              }
            />
          </Route>

          {/* Kiosk - standalone full-screen layout (no AppShell) */}
          <Route path="/kiosk" element={<KioskPage />} />

          {/* Parent Portal - uses AppShell layout, parent role only */}
          <Route element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route path="/parent" element={<RequireRole roles={[ROLES.PARENT]}><ParentDashboardPage /></RequireRole>} />
            <Route path="/parent/incidents/:id" element={<RequireRole roles={[ROLES.PARENT]}><ParentIncidentViewPage /></RequireRole>} />
            <Route path="/parent/plans/:id" element={<RequireRole roles={[ROLES.PARENT]}><ParentPlanViewPage /></RequireRole>} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
