import { cn } from '../../lib/utils'

export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  helpText,
  className,
  ...props
}) {
  const inputClasses = cn(
    'w-full px-3 py-2 border rounded-lg text-sm transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500',
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
    error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300',
    className
  )

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(inputClasses, 'min-h-[80px] resize-y')}
          {...props}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
          {...props}
        />
      )}
      {helpText && !error && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}

export function SelectField({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  error,
  required = false,
  disabled = false,
  className,
  ...props
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2 border rounded-lg text-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500',
          'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
          error ? 'border-red-300' : 'border-gray-300',
          className
        )}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
