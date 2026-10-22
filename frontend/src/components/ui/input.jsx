import React from 'react';

export const Input = React.forwardRef(
  ({ type = 'text', className = '', error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={`w-full min-h-[44px] px-3 py-2 bg-[#181210] text-[#FEF5E6] border ${
          error ? 'border-red-500' : 'border-[#2F1C15]'
        } placeholder-[#B8AD9A] text-sm transition-subtle focus:outline-none focus:border-[#FEF5E6] focus:ring-1 focus:ring-[#FEF5E6] disabled:opacity-50 disabled:cursor-not-allowed ${className}`.trim()}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
