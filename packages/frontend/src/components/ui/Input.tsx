import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light-muted dark:text-text-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-4 py-2.5 bg-white dark:bg-primary-bg border border-gray-300 dark:border-gray-700 rounded-lg
              text-text-light-primary dark:text-text-primary placeholder-text-muted text-base
              min-h-[44px]
              focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-danger focus:ring-danger/50 focus:border-danger' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-danger">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextAreaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  rows?: number;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, rows = 4, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={`
            w-full px-4 py-2.5 bg-white dark:bg-primary-bg border border-gray-300 dark:border-gray-700 rounded-lg
            text-text-light-primary dark:text-text-primary placeholder-text-muted text-base
            focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary
            disabled:opacity-50 disabled:cursor-not-allowed resize-vertical
            ${error ? 'border-danger focus:ring-danger/50 focus:border-danger' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-danger">{error}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
