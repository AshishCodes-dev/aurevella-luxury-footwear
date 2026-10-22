import React from 'react';

export const Label = ({ children, htmlFor, className = '', ...props }) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-xs font-medium uppercase tracking-wider text-[#FEF5E6] mb-1.5 ${className}`.trim()}
      {...props}
    >
      {children}
    </label>
  );
};
