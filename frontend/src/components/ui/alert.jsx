import React from 'react';

export const Alert = ({ children, variant = 'error', className = '', ...props }) => {
  let variantStyles = '';

  if (variant === 'error') {
    variantStyles = 'bg-red-950/60 border-red-800 text-red-200';
  } else if (variant === 'success') {
    variantStyles = 'bg-emerald-950/60 border-emerald-800 text-emerald-200';
  } else if (variant === 'info') {
    variantStyles = 'bg-[#181210] border-[#CFC9BA]/30 text-[#CFC9BA]';
  }

  return (
    <div
      role="alert"
      className={`border p-3 sm:p-4 text-sm ${variantStyles} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};
