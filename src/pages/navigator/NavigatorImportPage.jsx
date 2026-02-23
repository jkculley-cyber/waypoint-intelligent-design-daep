import Topbar from '../../components/layout/Topbar'
import ImportWizard from '../../components/import/ImportWizard'

const NAVIGATOR_TYPES = ['navigator_referrals', 'navigator_placements', 'navigator_supports']

export default function NavigatorImportPage() {
  return (
    <div>
      <Topbar
        title="Navigator — Data Import"
        subtitle="Bulk import referrals, ISS/OSS placements, and student supports"
      />
      <div className="p-6">
        <ImportWizard allowedTypes={NAVIGATOR_TYPES} />
      </div>
    </div>
  )
}
