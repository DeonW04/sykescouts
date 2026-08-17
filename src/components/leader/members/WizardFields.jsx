import React from 'react';

export function Field({ label, required, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, type = 'text', required, disabled }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#7413dc] focus:ring-2 focus:ring-[#7413dc]/20 transition-all disabled:bg-gray-100 disabled:text-gray-500"
    />
  );
}

export function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#7413dc] focus:ring-2 focus:ring-[#7413dc]/20 transition-all resize-none"
    />
  );
}

export function SelectInput({ value, onChange, placeholder, options }) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#7413dc] focus:ring-2 focus:ring-[#7413dc]/20 transition-all"
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function WizardStepHeader({ title, subtitle, step, totalSteps }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-gray-900 text-base">{title}</h3>
        {totalSteps ? <span className="text-xs text-gray-400 font-medium">{step}/{totalSteps}</span> : null}
      </div>
      {subtitle && <p className="text-xs text-gray-500 mb-3">{subtitle}</p>}
      {totalSteps ? (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#7413dc] to-[#004851] rounded-full transition-all duration-500"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}