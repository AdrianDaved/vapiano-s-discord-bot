import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  const autoId = useId();
  const inputId = props.id || autoId;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-discord-muted mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2 bg-discord-darker border border-discord-lighter rounded-lg text-discord-white placeholder-discord-muted/50 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors ${error ? 'border-discord-red' : ''} ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-discord-red mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  const autoId = useId();
  const selectId = props.id || autoId;

  return (
    <div>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-discord-muted mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-3 py-2 bg-discord-darker border border-discord-lighter rounded-lg text-discord-white focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors ${error ? 'border-discord-red' : ''} ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="text-xs text-discord-red mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  const autoId = useId();
  const textareaId = props.id || autoId;

  return (
    <div>
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-discord-muted mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full px-3 py-2 bg-discord-darker border border-discord-lighter rounded-lg text-discord-white placeholder-discord-muted/50 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors resize-y min-h-[80px] ${error ? 'border-discord-red' : ''} ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${textareaId}-error`} className="text-xs text-discord-red mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
