import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { useSidebar } from '../../contexts/SidebarContext'
import { cn } from '../../lib/utils'
import { COMPLIANCE_ROLES, ALERT_ROLES, ROLES, DAEP_ROLES } from '../../lib/constants'
import AlertBadge from '../alerts/AlertBadge'

const navigatorNavigation = [
  { name: 'Nav Dashboard',      path: '/navigator',                   icon: DashboardIcon      },
  { name: 'Referrals',          path: '/navigator/referrals',         icon: ReferralIcon       },
  { name: 'Placements',         path: '/navigator/placements',        icon: PlacementIcon      },
  { name: 'Supports',           path: '/navigator/supports',          icon: SupportsIcon       },
  { name: 'Reports',            path: '/navigator/reports',           icon: ReportsIcon        },
  { name: 'Goals & Progress',   path: '/navigator/goals',             icon: GoalsIcon          },
  { name: 'Escalation Engine',  path: '/navigator/escalation',        icon: EscalationIcon     },
  { name: 'Skill Gap Map',      path: '/navigator/skill-map',         icon: BrainIcon          },
  { name: 'Effectiveness',      path: '/navigator/effectiveness',     icon: TrendingUpIcon     },
  { name: 'Disproportionality', path: '/navigator/disproportionality',icon: ScaleIcon          },
  { name: 'Pilot Summary',      path: '/navigator/pilot',             icon: ClipboardListIcon  },
  { name: 'Data Import',        path: '/navigator/import',            icon: ImportIcon         },
]

const originsNavigation = [
  { name: 'Dashboard',        path: '/origins',                   icon: OriginsProductIcon    },
  { name: 'Response Moments', path: '/origins/response-moments',  icon: PlayCircleIcon        },
  { name: 'Replay Tool',      path: '/origins/replay-tool',       icon: ArrowPathIcon         },
  { name: 'Family Workspace', path: '/origins/family-workspace',  icon: HomeIcon              },
  { name: 'Skill Pathways',   path: '/origins/pathways',          icon: AcademicCapIcon       },
  { name: 'Progress Reports', path: '/origins/progress',          icon: ReportsIcon           },
]

const meridianNavigation = [
  { name: 'SPED Overview',     path: '/meridian',                icon: DashboardIcon      },
  { name: 'ARD Timelines',     path: '/meridian/timelines',      icon: PlansIcon          },
  { name: 'Dyslexia / HB 3928',path: '/meridian/dyslexia',       icon: ComplianceIcon     },
  { name: 'Folder Readiness',  path: '/meridian/folders',        icon: ImportIcon         },
  { name: 'CAP Tracker',       path: '/meridian/cap',            icon: AlertsIcon         },
  { name: 'Transition (SPPI-13)',path: '/meridian/transition',   icon: TransitionIcon     },
  { name: 'RDA Dashboard',     path: '/meridian/rda',            icon: RDAIcon            },
  { name: 'Waypoint Sync',     path: '/meridian/waypoint-sync',  icon: MatrixIcon         },
  { name: 'Data Integration',  path: '/meridian/integration',    icon: SettingsIcon       },
]

// Staff navigation items
// product: 'waypoint' — only shown when district has Waypoint licensed
// no product field     — always shown (role/feature still apply)
const staffNavigation = [
  { name: 'Dashboard',        path: '/dashboard',                   icon: DashboardIcon, roles: null,                                              product: 'waypoint' },
  { name: 'Students',         path: '/students',                    icon: StudentsIcon,  roles: null,                                              product: 'waypoint' },
  { name: 'Incidents',        path: '/incidents',                   icon: IncidentsIcon, roles: null,                                              product: 'waypoint' },
  { name: 'Compliance',       path: '/compliance',                  icon: ComplianceIcon, roles: COMPLIANCE_ROLES, feature: 'compliance',          product: 'waypoint' },
  { name: 'Alerts',           path: '/alerts',                      icon: AlertsIcon,    roles: ALERT_ROLES,        feature: 'alerts',             product: 'waypoint' },
  { name: 'Transition Plans', path: '/plans',                       icon: PlansIcon,     roles: null,               feature: 'transition_plans',   product: 'waypoint' },
  { name: 'DAEP Dashboard',   path: '/daep',                        icon: DaepIcon,      roles: DAEP_ROLES,         feature: 'daep_dashboard',     product: 'waypoint' },
  { name: 'Phone Return',     path: '/daep/phone-return',           icon: PhoneIcon,     roles: DAEP_ROLES,         feature: 'phone_return',       product: 'waypoint' },
  { name: 'Orientations',     path: '/daep/orientations',           icon: CalendarIcon,  roles: DAEP_ROLES,         feature: 'daep_dashboard',     product: 'waypoint' },
  { name: 'Discipline Matrix',path: '/matrix',                      icon: MatrixIcon,    roles: null,                                              product: 'waypoint' },
  { name: 'Submit Referral',  path: '/referral',                    icon: ReferralIcon,  roles: [ROLES.TEACHER],                                   product: 'waypoint' },
  { name: 'My Referrals',     path: '/incidents?filter=cbc_queue',  icon: IncidentsIcon, roles: [ROLES.CBC],                                       product: 'waypoint' },
  { name: 'My Cases',         path: '/incidents?filter=sss_queue',  icon: IncidentsIcon, roles: [ROLES.SSS],                                       product: 'waypoint' },
  { name: '504 Reviews',      path: '/incidents?filter=504_queue',  icon: ComplianceIcon,roles: [ROLES.SECTION_504_COORDINATOR],                   product: 'waypoint' },
  { name: 'Pending Approval', path: '/incidents?filter=director_queue', icon: IncidentsIcon, roles: [ROLES.DIRECTOR_STUDENT_AFFAIRS],              product: 'waypoint' },
  { name: 'Daily Scoring',    path: '/daep/scoring',                icon: ScoringIcon,   roles: [ROLES.TEACHER, ROLES.ADMIN, ROLES.PRINCIPAL], feature: 'daep_dashboard', product: 'waypoint' },
  { name: 'Calendar',         path: '/calendar',                    icon: CalendarIcon,  roles: null,                                              product: 'waypoint' },
  { name: 'Reports',          path: '/reports',                     icon: ReportsIcon,   roles: [ROLES.ADMIN, ROLES.PRINCIPAL], feature: 'reports', product: 'waypoint' },
  { name: 'Data Import',      path: '/settings/import-data',        icon: ImportIcon,    roles: [ROLES.ADMIN, ROLES.PRINCIPAL], feature: 'data_import', product: 'waypoint' },
  { name: 'Student Kiosk',    path: '/kiosk',                       icon: KioskIcon,     roles: [ROLES.ADMIN], external: true, feature: 'kiosk',  product: 'waypoint' },
  { name: 'Orientation Kiosk',path: '/orientation-kiosk',           icon: KioskIcon,     roles: [ROLES.ADMIN], external: true, feature: 'orientation_kiosk', product: 'waypoint' },
  // Settings — always accessible regardless of product (admin only)
  { name: 'Settings',         path: '/settings',                    icon: SettingsIcon,  roles: [ROLES.ADMIN] },
]

// Parent-only navigation items
const parentNavigation = [
  {
    name: 'My Dashboard',
    path: '/parent',
    icon: DashboardIcon,
    roles: null,
  },
]

// Grouped Waypoint navigation — paths determine which sub-section each item belongs to
const WAYPOINT_GROUPS = [
  {
    label: 'Overview',
    paths: ['/dashboard', '/students'],
  },
  {
    label: 'Discipline',
    paths: ['/incidents', '/referral', '/incidents?filter=cbc_queue', '/incidents?filter=sss_queue', '/incidents?filter=504_queue', '/incidents?filter=director_queue'],
  },
  {
    label: 'Compliance & Alerts',
    paths: ['/compliance', '/alerts'],
  },
  {
    label: 'DAEP Program',
    paths: ['/daep', '/daep/orientations', '/daep/phone-return', '/daep/scoring'],
  },
  {
    label: 'Planning',
    paths: ['/plans', '/calendar', '/matrix'],
  },
  {
    label: 'Reports & Admin',
    paths: ['/reports', '/settings/import-data', '/kiosk', '/orientation-kiosk', '/settings'],
  },
]

function SidebarGroupLabel({ label }) {
  return (
    <div className="px-3 pt-3 pb-0.5">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{label}</span>
    </div>
  )
}

function WaypointNav({ items, alertCount }) {
  return (
    <>
      {WAYPOINT_GROUPS.map(group => {
        const groupItems = items.filter(i => group.paths.includes(i.path))
        if (groupItems.length === 0) return null
        return (
          <div key={group.label}>
            <SidebarGroupLabel label={group.label} />
            {groupItems.map(item => <NavItem key={item.path} item={item} alertCount={alertCount} />)}
          </div>
        )
      })}
      {/* Any items not in a group */}
      {items
        .filter(i => !WAYPOINT_GROUPS.flatMap(g => g.paths).includes(i.path))
        .map(item => <NavItem key={item.path} item={item} alertCount={alertCount} />)
      }
    </>
  )
}

function NavItem({ item, alertCount }) {
  const { setSidebarOpen } = useSidebar()

  if (item.external) {
    return (
      <a
        href={item.path}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setSidebarOpen(false)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-gray-300 hover:bg-gray-800 hover:text-white"
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        <span className="flex-1">{item.name}</span>
        <ExternalLinkIcon className="h-3.5 w-3.5 text-gray-500" />
      </a>
    )
  }
  return (
    <NavLink
      to={item.path}
      onClick={() => setSidebarOpen(false)}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-orange-500 text-white'
            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        )
      }
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1">{item.name}</span>
      {item.path === '/alerts' && alertCount > 0 && (
        <AlertBadge count={alertCount} />
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { profile, hasRole, hasFeature, hasProduct, signOut } = useAuth()
  const { alertCount } = useNotifications()
  const { sidebarOpen, setSidebarOpen } = useSidebar()

  const isParent = profile?.role === 'parent'
  const showWaypoint = !isParent && hasProduct('waypoint')
  const showNavigator = !isParent && hasProduct('navigator')
  const showMeridian = !isParent && hasProduct('meridian')
  const activeProductCount = [showWaypoint, showNavigator, showMeridian].filter(Boolean).length
  const showProductHeaders = activeProductCount > 1

  function itemVisible(item) {
    if (item.roles && !hasRole(item.roles)) return false
    if (item.feature && !hasFeature(item.feature)) return false
    return true
  }

  const waypointItems = isParent ? [] : staffNavigation.filter(i => i.product === 'waypoint' && itemVisible(i))
  const commonItems = (isParent ? parentNavigation : staffNavigation).filter(i => !i.product && itemVisible(i))

  return (
    <aside className={cn(
      'flex flex-col w-64 bg-gray-900 text-white flex-shrink-0',
      // Mobile: fixed overlay drawer with slide animation
      'fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out overflow-y-auto',
      // Desktop: static sidebar in flex layout, always visible
      'md:relative md:inset-y-auto md:left-auto md:z-auto md:translate-x-0 md:min-h-screen',
      // Mobile open/close state
      sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    )}>
      {/* Logo */}
      <div className="relative px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Compass Pathway" className="h-9 w-9 object-contain" />
          <div>
            <h1 className="text-sm font-bold leading-tight">
              <span className="text-orange-400">Compass</span>
              <span className="text-purple-400"> Pathway</span>
            </h1>
            <p className="text-xs text-gray-400">Behavioral Solutions</p>
          </div>
        </div>
        {/* X close button — mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden absolute top-4 right-3 p-1.5 text-gray-400 hover:text-white rounded"
          aria-label="Close menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Waypoint section */}
        {showWaypoint && (
          <>
            {showProductHeaders && (
              <div className="pt-2 pb-1 px-3 flex items-center gap-1.5">
                <WaypointProductIcon className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">Waypoint</span>
              </div>
            )}
            <WaypointNav items={waypointItems} alertCount={alertCount} profile={profile} />
          </>
        )}

        {/* Navigator section */}
        {showNavigator && (
          <>
            <div className="pt-3 pb-1 px-3 flex items-center gap-1.5">
              <NavigatorProductIcon className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Navigator</span>
            </div>
            {navigatorNavigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/navigator'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{item.name}</span>
              </NavLink>
            ))}
            {/* Discipline Matrix — only show here if Waypoint isn't active (avoids duplication) */}
            {!showWaypoint && (
              <NavLink
                to="/matrix"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )
                }
              >
                <MatrixIcon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">Discipline Matrix</span>
              </NavLink>
            )}
          </>
        )}

        {/* Meridian section */}
        {showMeridian && (
          <>
            <div className="pt-3 pb-1 px-3 flex items-center gap-1.5">
              <MeridianProductIcon className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Meridian</span>
            </div>
            {meridianNavigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/meridian'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{item.name}</span>
              </NavLink>
            ))}
          </>
        )}

        {/* Common items — always visible (Settings etc.) */}
        {commonItems.length > 0 && (
          <div className="pt-2">
            {commonItems.map(item => <NavItem key={item.path} item={item} alertCount={alertCount} />)}
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm font-medium">
            {profile?.full_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-400 truncate capitalize">
              {profile?.role?.replace('_', ' ') || 'Staff'}
            </p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 mt-1 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <LogoutIcon className="h-5 w-5" />
          Sign Out
        </button>
      </div>

      {/* LLC Attribution */}
      <div className="px-4 py-3 border-t border-gray-800">
        <p className="text-[10px] text-gray-500 text-center leading-tight">
          &copy; 2026 Clear Path Education Group, LLC. All rights reserved.
        </p>
      </div>
    </aside>
  )
}

// ---- Icons ----

function DashboardIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )
}

function StudentsIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function IncidentsIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function ComplianceIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

function AlertsIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
}

function PlansIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

function MatrixIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12h-4.5m4.5 0c.621 0 1.125.504 1.125 1.125M12 10.875c0-.621.504-1.125 1.125-1.125m0 0c.621 0 1.125.504 1.125 1.125" />
    </svg>
  )
}

function ReportsIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}

function SettingsIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function KioskIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
    </svg>
  )
}

function PhoneIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  )
}

function DaepIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  )
}

function CalendarIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function ExternalLinkIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  )
}

function ImportIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function LogoutIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  )
}

function ReferralIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ScoringIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  )
}

// ---- Product Brand Icons ----

function WaypointProductIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}

function NavigatorProductIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  )
}

function MeridianProductIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  )
}

function PlacementIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  )
}

function GoalsIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2M3 12h2m14 0h2" />
    </svg>
  )
}

function SupportsIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
    </svg>
  )
}

// ---- Origins Icons ----

function OriginsProductIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm0 0v.75m0 18.75v-.75M2.25 12h.75m18.75 0h-.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.47 9.53l-4.94 2.47-2.47 4.94 4.94-2.47 2.47-4.94z" />
    </svg>
  )
}

function PlayCircleIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.328l5.603 3.113z" />
    </svg>
  )
}

function ArrowPathIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function HomeIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

function AcademicCapIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  )
}

// Graduation cap — Transition (SPPI-13)
function TransitionIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  )
}

// Bar chart — RDA Dashboard
function RDAIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}

// ---- Navigator Intelligence Icons ----

// Fire — Escalation Engine
function EscalationIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
    </svg>
  )
}

// Light bulb / brain — Skill Gap Map
function BrainIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  )
}

// Arrow trending up — Effectiveness
function TrendingUpIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  )
}

// Scale — Disproportionality
function ScaleIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
    </svg>
  )
}

// Clipboard list — Pilot Summary
function ClipboardListIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  )
}
