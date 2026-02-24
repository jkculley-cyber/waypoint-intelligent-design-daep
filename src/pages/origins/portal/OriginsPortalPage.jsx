import { useNavigate } from 'react-router-dom'

export default function OriginsPortalPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 flex flex-col items-center justify-center px-6">

      {/* Logo / Brand */}
      <div className="text-center mb-10">
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <CompassIcon className="h-10 w-10 text-teal-200" />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Origins</h1>
        <p className="text-teal-200 mt-2 text-base">Skills for life. Built at home.</p>
      </div>

      {/* Role selector */}
      <div className="w-full max-w-sm space-y-4">
        <p className="text-teal-300 text-sm text-center uppercase tracking-widest font-medium mb-6">Who are you?</p>

        <button
          onClick={() => navigate('/family/student')}
          className="w-full bg-white text-teal-900 rounded-2xl px-6 py-5 flex items-center gap-4 shadow-lg hover:bg-teal-50 transition-colors group"
        >
          <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center shrink-0 group-hover:bg-teal-200 transition-colors">
            <StudentIcon className="h-6 w-6 text-teal-700" />
          </div>
          <div className="text-left">
            <p className="font-bold text-lg text-teal-900">I'm a Student</p>
            <p className="text-sm text-teal-600">Complete your activities and build skills</p>
          </div>
          <ArrowIcon className="h-5 w-5 text-teal-400 ml-auto" />
        </button>

        <button
          onClick={() => navigate('/family/parent')}
          className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-2xl px-6 py-5 flex items-center gap-4 hover:bg-white/20 transition-colors group"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
            <ParentIcon className="h-6 w-6 text-teal-200" />
          </div>
          <div className="text-left">
            <p className="font-bold text-lg text-white">I'm a Parent / Guardian</p>
            <p className="text-sm text-teal-300">Support your child's growth journey</p>
          </div>
          <ArrowIcon className="h-5 w-5 text-white/40 ml-auto" />
        </button>
      </div>

      {/* Footer */}
      <p className="text-teal-500 text-xs mt-12 text-center">
        Origins by Clear Path Education Group · In partnership with your school district
      </p>
    </div>
  )
}

function CompassIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 7.5l-2.25 4.5-4.5 2.25 2.25-4.5 4.5-2.25z" />
    </svg>
  )
}
function StudentIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  )
}
function ParentIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}
function ArrowIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}
