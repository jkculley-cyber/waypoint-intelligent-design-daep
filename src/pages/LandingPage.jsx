import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Waypoint" className="h-10 w-10 object-contain" />
            <h1 className="text-2xl font-bold">
              <span className="text-orange-600">Way</span><span className="text-purple-600">point</span>
            </h1>
          </div>
          <nav className="flex items-center gap-4 sm:gap-6 text-sm">
            <a href="#features" className="text-gray-600 hover:text-gray-900 hidden sm:block">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 hidden sm:block">How It Works</a>
            <a href="#about" className="text-gray-600 hover:text-gray-900 hidden sm:block">About</a>
            <Link to="/login" className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors">
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-purple-50 to-white py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1 text-sm text-orange-700 font-medium mb-6">
            Texas TEC Chapter 37 Compliant
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            DAEP & Discipline Management<br />
            <span className="text-orange-600">Built for Texas</span>
          </h2>
          <p className="text-lg text-gray-600 mb-4 max-w-2xl mx-auto leading-relaxed">
            Waypoint automates the entire discipline lifecycle — incident creation, SPED/504 compliance blocking, approval chains, DAEP placements, transition plans, and re-entry tracking. One platform replaces your spreadsheets, paper forms, and email chains.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Used by Texas campus administrators, principals, AP's, counselors, and SPED coordinators.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/login" className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors text-base">
              Sign In →
            </Link>
            <Link to="/login?demo=1" className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors text-base">
              Explore Demo →
            </Link>
            <a href="#features" className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors text-base">
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold mb-6">The Problem You Know Too Well</h3>
          <p className="text-gray-300 text-lg leading-relaxed mb-8 max-w-3xl mx-auto">
            A SPED student hits 10 cumulative removal days and nobody catches it until the parent's attorney calls. A DAEP transition plan goes 90 days without a review. A teacher files an incident and the consequence doesn't match the discipline matrix. Documentation lives in 6 different spreadsheets across 3 staff members' desktops.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="text-3xl font-bold text-orange-400 mb-1">90,000+</div>
              <div className="text-sm text-gray-400">Texas DAEP placements per year</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="text-3xl font-bold text-red-400 mb-1">#1</div>
              <div className="text-sm text-gray-400">OCR finding: failure to provide FAPE during removal</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="text-3xl font-bold text-amber-400 mb-1">$40-60K</div>
              <div className="text-sm text-gray-400">Average corrective action cost per SPED violation</div>
            </div>
          </div>
          <p className="text-orange-400 font-semibold text-lg mt-8">Waypoint prevents these problems before they start.</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-3">What Waypoint Does</h3>
            <p className="text-gray-500 max-w-2xl mx-auto">Every step of the discipline lifecycle, automated and compliance-checked.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon="🛡️"
              title="SPED/504 Compliance Blocking"
              description="Automatic compliance checklists fire when SPED/504 students face removal. Placements are blocked until MDR is complete. Cumulative removal days tracked against the 10-day IDEA limit — with hard blocks at the threshold."
            />
            <FeatureCard
              icon="📋"
              title="Incident → DAEP Workflow"
              description="Create an incident, select the offense (with TEC reference auto-populated), assign a consequence guided by your discipline matrix, trigger approval chains, schedule orientation, and activate placement — all in one flow."
            />
            <FeatureCard
              icon="✅"
              title="Approval Chains"
              description="Multi-step approval workflows for DAEP placements. Principal → Director → Superintendent — each step tracked with timestamps, notifications, and the ability to return for revision."
            />
            <FeatureCard
              icon="📊"
              title="Discipline Matrix"
              description="Visual consequence guide by offense and occurrence. Shows minimum, recommended, and maximum consequences with proactive interventions and restorative alternatives. Configurable by your district."
            />
            <FeatureCard
              icon="🔄"
              title="Transition Plans & Re-Entry"
              description="Campus re-entry transition plans with 30/60/90 day review schedules. Automated alerts when reviews are overdue. Track the student's return to their home campus with documented support plans."
            />
            <FeatureCard
              icon="📈"
              title="Reports & Analytics"
              description="Disproportionality analysis, recidivism tracking, intervention effectiveness, PEIMS export, and campus-wide compliance dashboards. PDF and Excel exports for every report."
            />
            <FeatureCard
              icon="🚨"
              title="Automated Alerts"
              description="Repeat offender detection, cumulative removal day warnings, overdue transition plan reviews, and approval escalation alerts. Your team gets notified before problems become crises."
            />
            <FeatureCard
              icon="👨‍👩‍👧"
              title="Separation Orders"
              description="Track keep-away-from orders between students involved in incidents. FERPA-protected hot box on the alerts page ensures staff awareness without exposing details to unauthorized users."
            />
            <FeatureCard
              icon="🏫"
              title="Multi-Campus, Multi-Role"
              description="District-wide deployment with campus-level scoping. Admins see everything. Principals see their campus. Counselors see compliance. SPED coordinators see only SPED-related incidents. Role-based access controls throughout."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gray-50 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-3">How It Works</h3>
            <p className="text-gray-500">From incident to resolution — every step documented, every deadline tracked.</p>
          </div>
          <div className="space-y-8">
            <StepCard number="1" title="Incident Created" description="Administrator or staff member documents the incident. Student is identified, offense code selected (with TEC reference), and the discipline matrix suggests a consequence range. SPED/504 flags automatically trigger compliance workflows." />
            <StepCard number="2" title="Compliance Check" description="If the student is SPED or 504, Waypoint auto-creates a compliance checklist. For DAEP placements, MDR documentation is required before the placement can proceed. Cumulative removal days are tracked — at 10 days, placement is blocked until the ARD committee acts." />
            <StepCard number="3" title="Approval & Placement" description="DAEP placements route through a multi-step approval chain. Each approver gets an email notification. The placement is scheduled, orientation is tracked, and the DAEP campus is assigned. Daily behavior tracking begins on day one." />
            <StepCard number="4" title="Transition & Re-Entry" description="Before the student returns, a campus re-entry transition plan is created with academic, behavioral, and counseling support goals. 30/60/90 day reviews are auto-scheduled with alerts when they're due." />
            <StepCard number="5" title="Data & Accountability" description="Every action is logged. Disproportionality reports catch equity issues. Recidivism tracking measures whether interventions work. PEIMS export sends data to TEA. The district has a complete, auditable record." />
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-3">Explore the Demo</h3>
          <p className="text-gray-500 mb-8 max-w-2xl mx-auto">Log in with the demo credentials below and explore Waypoint with sample data from Lone Star ISD. No signup required.</p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 max-w-md mx-auto mb-6">
            <div className="text-sm text-gray-500 mb-3">Demo Credentials</div>
            <div className="space-y-2 text-left">
              <div className="flex justify-between items-center bg-white rounded-lg px-4 py-2 border">
                <span className="text-gray-500 text-sm">Email</span>
                <span className="font-mono text-sm font-medium text-gray-900">admin@lonestar-isd.org</span>
              </div>
              <div className="flex justify-between items-center bg-white rounded-lg px-4 py-2 border">
                <span className="text-gray-500 text-sm">Password</span>
                <span className="font-mono text-sm font-medium text-gray-900">Password123!</span>
              </div>
            </div>
          </div>
          <Link to="/login" className="inline-flex items-center gap-2 bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors text-base">
            Open Waypoint Demo →
          </Link>
          <p className="text-xs text-gray-400 mt-4">Sample data includes 12 incidents, 6 transition plans, SPED compliance scenarios, and Navigator behavioral tracking.</p>
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-gray-900 text-white py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold mb-3">Built by Educators, for Educators</h3>
          </div>
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              Waypoint was created by Kim Culley — a former IB Head of School, campus administrator, and behavior coordinator in Texas. Every workflow, every compliance check, and every alert was designed from the perspective of the person who actually handles discipline at 7:30 AM on a Monday morning.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed mb-8">
              We don't build software and then look for problems to solve. We lived the problems, then built the solutions.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-xl font-bold text-orange-400">2025</div>
                <div className="text-xs text-gray-400 mt-1">Founded</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-xl font-bold text-orange-400">Texas</div>
                <div className="text-xs text-gray-400 mt-1">Headquarters</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-xl font-bold text-orange-400">5</div>
                <div className="text-xs text-gray-400 mt-1">Products Live</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-xl font-bold text-orange-400">FERPA</div>
                <div className="text-xs text-gray-400 mt-1">Compliant</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to see Waypoint in action?</h3>
          <p className="text-gray-500 mb-6">Explore the demo with sample data, or contact us to set up your district.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/login" className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors">
              Sign In →
            </Link>
            <a href="mailto:support@clearpathedgroup.com?subject=Waypoint%20Demo%20Request" className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Request a Demo →
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Clear Path Education Group, LLC. All rights reserved.</p>
          <p className="text-xs text-gray-500 mt-2">
            <a href="https://clearpathedgroup.com" className="hover:text-gray-300">clearpathedgroup.com</a>
            {' · '}
            <a href="mailto:support@clearpathedgroup.com" className="hover:text-gray-300">support@clearpathedgroup.com</a>
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="text-2xl mb-3">{icon}</div>
      <h4 className="text-lg font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function StepCard({ number, title, description }) {
  return (
    <div className="flex gap-4 sm:gap-6">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-1">{title}</h4>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
