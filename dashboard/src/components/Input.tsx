import React, { useId, useState, useEffect, useRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = "", type, value, onChange, min, max, ...props }: InputProps) {
  const autoId = useId();
  const inputId = props.id || autoId;
  const isNumber = type === "number";

  // For number inputs: keep a local string so the user can delete freely.
  // We only call the parent onChange when they have a parseable number.
  // On blur we snap to min if the field is empty/invalid.
  const [localValue, setLocalValue] = useState(isNumber ? String(value ?? "") : "");
  const skipSync = useRef(false);

  // Sync local value when parent value changes (e.g. initial load)
  useEffect(() => {
    if (isNumber && !skipSync.current) {
      setLocalValue(String(value ?? ""));
    }
    skipSync.current = false;
  }, [value, isNumber]);

  if (isNumber) {
    const minVal = min !== undefined ? Number(min) : undefined;
    const maxVal = max !== undefined ? Number(max) : undefined;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, "");
      setLocalValue(raw);
      skipSync.current = true;
      if (raw !== "" && onChange) {
        const num = parseInt(raw, 10);
        const clamped = maxVal !== undefined ? Math.min(num, maxVal) : num;
        // fire a synthetic event with the numeric string
        const synth = { ...e, target: { ...e.target, value: String(clamped) } };
        onChange(synth as React.ChangeEvent<HTMLInputElement>);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (localValue === "" || isNaN(parseInt(localValue, 10))) {
        const fallback = minVal !== undefined ? minVal : 0;
        setLocalValue(String(fallback));
        skipSync.current = true;
        if (onChange) {
          const synth = { ...e, target: { ...e.target, value: String(fallback) } } as unknown as React.ChangeEvent<HTMLInputElement>;
          onChange(synth);
        }
      }
      props.onBlur?.(e);
    };

    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-discord-muted mb-1.5">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-3 py-2 bg-discord-darker border border-discord-lighter rounded-lg text-discord-white placeholder-discord-muted/50 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors ${error ? "border-discord-red" : ""} ${className}`}
          aria-invalid={error ? "true" : undefined}
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

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-discord-muted mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        className={`w-full px-3 py-2 bg-discord-darker border border-discord-lighter rounded-lg text-discord-white placeholder-discord-muted/50 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors ${error ? "border-discord-red" : ""} ${className}`}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        min={min}
        max={max}
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

export function Select({ label, error, options, className = "", ...props }: SelectProps) {
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
        className={`w-full px-3 py-2 bg-discord-darker border border-discord-lighter rounded-lg text-discord-white focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors ${error ? "border-discord-red" : ""} ${className}`}
        aria-invalid={error ? "true" : undefined}
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

export function Textarea({ label, error, className = "", ...props }: TextareaProps) {
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
        className={`w-full px-3 py-2 bg-discord-darker border border-discord-lighter rounded-lg text-discord-white placeholder-discord-muted/50 focus:outline-none focus:border-discord-blurple focus:ring-1 focus:ring-discord-blurple transition-colors resize-y min-h-[80px] ${error ? "border-discord-red" : ""} ${className}`}
        aria-invalid={error ? "true" : undefined}
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
