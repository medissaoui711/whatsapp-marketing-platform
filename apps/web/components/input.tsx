'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium">{label}</label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-3 py-2 border rounded-md bg-background
            focus:outline-none focus:ring-2 focus:ring-ring
            placeholder:text-muted-foreground
            disabled:opacity-50
            ${error ? 'border-destructive' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'


