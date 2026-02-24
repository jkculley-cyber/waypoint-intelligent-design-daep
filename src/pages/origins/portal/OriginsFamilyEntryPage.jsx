import { useNavigate } from 'react-router-dom'
import OriginsPortalLayout from './OriginsPortalLayout'

export default function OriginsFamilyEntryPage() {
  const navigate = useNavigate()

  return (
    <OriginsPortalLayout>
      <div className="text-center mb-10">
        <div className="w-20 h-20 rounded-full bg-teal-600 flex items-center justify-center mx-auto mb-5 shadow-lg">
          <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.47 9.53l-4.94 2.47-2.47 4.94 4.94-2.47 2.47-4.94z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Origins</h1>
        <p className="text-gray-500 max-w-md mx-auto">
          A place for families and students to build real skills — together.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Student card */}
        <button
          onClick={() => navigate('/family/student')}
          className="group bg-white rounded-2xl border-2 border-teal-100 hover:border-teal-400 p-8 text-left shadow-sm hover:shadow-md transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-teal-50 group-hover:bg-teal-100 flex items-center justify-center mb-5 transition-colors">
            <svg className="h-7 w-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">I'm a Student</h2>
          <p className="text-sm text-gray-500">
            Work through your assigned scenarios, reflections, and skill activities.
          </p>
          <div className="mt-5 flex items-center gap-1 text-teal-600 text-sm font-medium">
            Get started
            <svg className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </button>

        {/* Parent card */}
        <button
          onClick={() => navigate('/family/parent')}
          className="group bg-white rounded-2xl border-2 border-emerald-100 hover:border-emerald-400 p-8 text-left shadow-sm hover:shadow-md transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center mb-5 transition-colors">
            <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">I'm a Parent / Guardian</h2>
          <p className="text-sm text-gray-500">
            See your child's progress and access family conversation starters and activities.
          </p>
          <div className="mt-5 flex items-center gap-1 text-emerald-600 text-sm font-medium">
            View dashboard
            <svg className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-8">
        Partnering with your school district to build lasting skills at home.
      </p>
    </OriginsPortalLayout>
  )
}
