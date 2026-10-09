import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { t } from '../i18n';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  error?: string | null;
  hint?: string | null;
  action?: ReactNode;
};

export function TextField({ label, error, hint, action, ...input }: Props) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <div className="field__row">
        <label htmlFor={id}>{label}</label>
        {action}
      </div>
      <input
        id={id}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...input}
      />
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function PasswordField(props: Omit<Props, 'type' | 'action'>) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      action={
        <button type="button" className="link-button" onClick={() => setVisible((v) => !v)}>
          {visible ? t('auth.hidePassword') : t('auth.showPassword')}
        </button>
      }
    />
  );
}
