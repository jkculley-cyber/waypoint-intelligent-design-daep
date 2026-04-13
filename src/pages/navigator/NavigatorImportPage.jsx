import Topbar from '../../components/layout/Topbar'
import ImportWizard from '../../components/import/ImportWizard'

const NAVIGATOR_TYPES = ['students', 'navigator_referrals', 'navigator_placements', 'navigator_supports']

export default function NavigatorImportPage() {
  return (
    <div>
      <Topbar
        title="Navigator — Data Import"
        subtitle="Import student roster, referrals, placements, and supports"
      />
      <div className="p-3 md:p-6">
        <ImportWizard allowedTypes={NAVIGATOR_TYPES} />
      </div>
    </div>
  )
}
