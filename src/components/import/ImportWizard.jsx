import { useImportWizard } from '../../hooks/useImportWizard'
import ImportStepUpload from './ImportStepUpload'
import ImportStepMapping from './ImportStepMapping'
import ImportStepValidation from './ImportStepValidation'
import ImportStepConfirm from './ImportStepConfirm'

const STEP_LABELS = ['Upload', 'Map Columns', 'Validate', 'Import']

export default function ImportWizard({ allowedTypes, defaultType }) {
  const wizard = useImportWizard()

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <StepIndicator currentStep={wizard.step} steps={STEP_LABELS} />

      {/* Error Banner */}
      {wizard.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-red-800">{wizard.error}</p>
        </div>
      )}

      {/* Step Content */}
      {wizard.step === 0 && (
        <ImportStepUpload
          onNext={wizard.handleFileUpload}
          allowedTypes={allowedTypes}
          defaultType={defaultType}
        />
      )}

      {wizard.step === 1 && (
        <ImportStepMapping
          importType={wizard.importType}
          fileHeaders={wizard.fileHeaders}
          columnMapping={wizard.columnMapping}
          rawRows={wizard.rawRows}
          onConfirm={wizard.handleMappingConfirm}
          onBack={wizard.goBack}
          validating={wizard.validating}
        />
      )}

      {wizard.step === 2 && (
        <ImportStepValidation
          importType={wizard.importType}
          validationResults={wizard.validationResults}
          onConfirm={wizard.handleImportConfirm}
          onBack={wizard.goBack}
        />
      )}

      {wizard.step === 3 && (
        <ImportStepConfirm
          importing={wizard.importing}
          importProgress={wizard.importProgress}
          importResult={wizard.importResult}
          error={wizard.error}
          onReset={wizard.reset}
        />
      )}
    </div>
  )
}

function StepIndicator({ currentStep, steps }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, index) => (
        <div key={label} className="flex items-center">
          {index > 0 && (
            <div className={`w-8 h-0.5 mx-1 ${index <= currentStep ? 'bg-orange-500' : 'bg-gray-200'}`} />
          )}
          <div className="flex items-center gap-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
              index < currentStep
                ? 'bg-orange-500 text-white'
                : index === currentStep
                  ? 'bg-orange-500 text-white ring-2 ring-orange-200'
                  : 'bg-gray-200 text-gray-500'
            }`}>
              {index < currentStep ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span className={`text-xs font-medium hidden sm:inline ${
              index <= currentStep ? 'text-orange-600' : 'text-gray-400'
            }`}>
              {label}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
