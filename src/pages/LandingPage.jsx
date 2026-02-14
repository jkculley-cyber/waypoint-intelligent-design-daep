import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Waypoint" className="h-10 w-10 object-contain" />
            <h1 className="text-2xl font-bold text-orange-600">Waypoint</h1>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm">Features</a>
            <a href="#about" className="text-gray-600 hover:text-gray-900 text-sm">About</a>
            <Link to="/login" className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <img src="/logo.png" alt="Waypoint Behavioral Solutions" className="h-40 w-40 mx-auto mb-6 object-contain" />
        <h2 className="text-5xl font-bold text-gray-900 mb-4">
          Waypoint Behavioral Solutions
        </h2>
        <p className="text-xl text-gray-500 italic mb-2">
          Compliance-Driven, Data-Informed, Equity-Focused
        </p>
        <p className="text-lg text-green-600 font-medium mb-10">
          Reducing Recidivism Through Smart Intervention
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/login" className="bg-orange-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors text-lg">
            Get Started
          </Link>
          <a href="#features" className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors text-lg">
            Learn More
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Schools Choose Waypoint
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              title="Compliance-Driven"
              description="Built around IDEA, state regulations, and district policies. Every action is logged and auditable."
              icon="shield"
            />
            <FeatureCard
              title="Data-Informed"
              description="Track patterns, identify at-risk students, and measure intervention effectiveness with real-time analytics."
              icon="chart"
            />
            <FeatureCard
              title="Equity-Focused"
              description="Monitor for disproportionality in discipline actions across demographics. Ensure fair treatment for all students."
              icon="balance"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Waypoint Behavioral Solutions. All rights reserved.</p>
          <p className="text-xs text-gray-500 mt-2">A product of Clear Path Education Group, LLC.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ title, description, icon }) {
  const icons = {
    shield: (
      <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    chart: (
      <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    balance: (
      <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="mb-4">{icons[icon]}</div>
      <h4 className="text-xl font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
