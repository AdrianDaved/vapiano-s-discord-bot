import React, { useId } from 'react';

interface ToggleProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export default function Toggle({ enabled, onChange, label, description, disabled }: ToggleProps) {
  const id = useId();

  return (
    <div className="flex items-center justify-between">
      {(label || description) && (
        <div className="flex-1 mr-4">
          {label && (
            <label htmlFor={id} className="text-sm font-medium text-discord-white cursor-pointer">
              {label}
            </label>
          )}
          {description && <p className="text-xs text-discord-muted mt-0.5">{description}</p>}
        </div>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label || undefined}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`toggle ${enabled ? 'toggle-enabled' : 'toggle-disabled'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-discord-blurple focus-visible:ring-offset-2 focus-visible:ring-offset-discord-dark`}
      >
        <span
          aria-hidden="true"
          className={`toggle-knob ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );
}
