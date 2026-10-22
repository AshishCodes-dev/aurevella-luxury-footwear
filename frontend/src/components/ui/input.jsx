import React from 'react';

export const Input = React.forwardRef(
  ({ type = 'text', className = '', error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={`w-full min-h-[44px] px-3 py-2 bg-[#181210] text-[#CFC9BA] border ${
          error ? 'border-red-500' : 'border-[#2E1814]'
        } placeholder-[#9E9685] text-sm focus:outline-none focus:border-[#CFC9BA] focus:ring-1 focus:ring-[#CFC9BA] disabled:opacity-50 disabled:cursor-not-allowed ${className}`.trim()}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
