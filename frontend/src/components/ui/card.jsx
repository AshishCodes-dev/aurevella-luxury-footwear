import React from 'react';

export const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-[#181210] border border-[#2E1814] p-6 sm:p-8 animate-fade-in transition-subtle ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', ...props }) => {
  return (
    <div className={`mb-6 text-center ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className = '', ...props }) => {
  return (
    <h2
      className={`font-serif text-2xl sm:text-3xl tracking-wide text-[#CFC9BA] ${className}`.trim()}
      {...props}
    >
      {children}
    </h2>
  );
};

export const CardDescription = ({ children, className = '', ...props }) => {
  return (
    <p className={`mt-2 text-sm text-[#9E9685] ${className}`.trim()} {...props}>
      {children}
    </p>
  );
};

export const CardContent = ({ children, className = '', ...props }) => {
  return (
    <div className={`${className}`.trim()} {...props}>
      {children}
    </div>
  );
};

export const CardFooter = ({ children, className = '', ...props }) => {
  return (
    <div className={`mt-6 pt-6 border-t border-[#2E1814] text-center ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};
