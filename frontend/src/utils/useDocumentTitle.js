import { useEffect } from 'react';

export const useDocumentTitle = (title) => {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) {
      document.title = `${title} | AUREVELLA`;
    } else {
      document.title = 'AUREVELLA — Luxury, Reimagined.';
    }

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
};

export default useDocumentTitle;
