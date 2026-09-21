'use client';

// fields.tsx — campos de la ficha sobre react-hook-form + shadcn.
// Todos llevan Label asociado, `aria-invalid`, mensaje de error con
// `aria-describedby` y, si aplica, contador de caracteres en vivo.

import { useId, type ReactNode } from 'react';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface BaseFieldProps<T extends FieldValues> {
  control: Control<T, unknown, T>;
  name: FieldPath<T>;
  label: string;
  help?: ReactNode;
  required?: boolean;
  className?: string;
}

interface FieldFrameProps {
  id: string;
  label: string;
  required?: boolean;
  help?: ReactNode;
  error?: string;
  counter?: { length: number; max: number; soft?: boolean };
  className?: string;
  children: ReactNode;
}

export function FieldFrame({ id, label, required, help, error, counter, className, children }: FieldFrameProps) {
  const over = counter ? counter.length > counter.max : false;
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-end justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required ? <span className="text-red-600" aria-hidden> *</span> : null}
        </Label>
        {counter ? (
          <span
            className={cn('text-xs tabular-nums', over ? 'font-medium text-amber-700' : 'text-gray-600')}
            aria-live="polite"
          >
            {counter.length}/{counter.max}
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : help ? (
        <p id={`${id}-help`} className="text-xs text-gray-600">
          {help}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, error?: string, help?: ReactNode): string | undefined =>
  error ? `${id}-error` : help ? `${id}-help` : undefined;

interface TextFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  maxLength?: number;
  /** Límite recomendado (SEO): avisa pero no bloquea la escritura. */
  softMax?: number;
  placeholder?: string;
  type?: 'text' | 'number' | 'date';
  inputMode?: 'text' | 'numeric' | 'decimal';
  step?: string;
  mono?: boolean;
  uppercase?: boolean;
  disabled?: boolean;
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  help,
  required,
  className,
  maxLength,
  softMax,
  placeholder,
  type = 'text',
  inputMode,
  step,
  mono,
  uppercase,
  disabled,
}: TextFieldProps<T>) {
  const id = useId();
  const {
    field: { ref, value: rawValue, onChange, onBlur, name: fieldName, disabled: fieldDisabled },
    fieldState,
  } = useController({ control, name });
  const value = typeof rawValue === 'string' ? rawValue : '';
  const error = fieldState.error?.message;
  const max = softMax ?? maxLength;
  return (
    <FieldFrame
      id={id}
      label={label}
      required={required}
      help={help}
      error={error}
      className={className}
      counter={max ? { length: value.length, max } : undefined}
    >
      <Input
        id={id}
        ref={ref}
        name={fieldName}
        type={type}
        inputMode={inputMode}
        step={step}
        min={type === 'number' ? 0 : undefined}
        value={value}
        onChange={(e) => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
        onBlur={onBlur}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled || fieldDisabled}
        aria-invalid={!!error}
        aria-required={required}
        aria-describedby={describedBy(id, error, help)}
        className={cn(mono && 'font-mono')}
        autoComplete="off"
      />
    </FieldFrame>
  );
}

interface TextAreaFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  maxLength?: number;
  softMax?: number;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  lang?: string;
}

export function TextAreaField<T extends FieldValues>({
  control,
  name,
  label,
  help,
  required,
  className,
  maxLength,
  softMax,
  placeholder,
  rows = 4,
  disabled,
  lang,
}: TextAreaFieldProps<T>) {
  const id = useId();
  const {
    field: { ref, value: rawValue, onChange, onBlur, name: fieldName, disabled: fieldDisabled },
    fieldState,
  } = useController({ control, name });
  const value = typeof rawValue === 'string' ? rawValue : '';
  const error = fieldState.error?.message;
  const max = softMax ?? maxLength;
  return (
    <FieldFrame
      id={id}
      label={label}
      required={required}
      help={help}
      error={error}
      className={className}
      counter={max ? { length: value.length, max } : undefined}
    >
      <Textarea
        id={id}
        ref={ref}
        name={fieldName}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled || fieldDisabled}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, help)}
        lang={lang}
      />
    </FieldFrame>
  );
}

interface SwitchFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  disabled?: boolean;
  /** Intercepta el cambio (p. ej. para pedir confirmación). Devuelve `false` para cancelarlo. */
  onBeforeChange?: (next: boolean) => boolean;
}

export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  help,
  className,
  disabled,
  onBeforeChange,
}: SwitchFieldProps<T>) {
  const id = useId();
  const {
    field: { ref, value: rawValue, onChange, onBlur, disabled: fieldDisabled },
  } = useController({ control, name });
  const checked = rawValue === true;
  return (
    <div className={cn('flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3', className)}>
      <div className="min-w-0">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        {help ? (
          <p id={`${id}-help`} className="mt-0.5 text-xs text-gray-600">
            {help}
          </p>
        ) : null}
      </div>
      <Switch
        id={id}
        ref={ref}
        checked={checked}
        onCheckedChange={(next) => {
          if (onBeforeChange && !onBeforeChange(next)) return;
          onChange(next);
        }}
        onBlur={onBlur}
        disabled={disabled || fieldDisabled}
        aria-describedby={help ? `${id}-help` : undefined}
        className="mt-0.5"
      />
    </div>
  );
}
