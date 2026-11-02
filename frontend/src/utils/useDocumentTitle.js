import { useEffect } from 'react';

/**
 * Custom hook to update document title, description, and indexing robots meta tags.
 *
 * @param {string} title
 * @param {Object} [options]
 * @param {string} [options.description]
 * @param {boolean} [options.noIndex=false]
 */
export const useDocumentTitle = (title, options = {}) => {
  const { description, noIndex = false } = options;

  useEffect(() => {
    const previousTitle = document.title;
    if (title) {
      document.title = title.includes('AUREVELLA') ? title : `${title} | AUREVELLA`;
    } else {
      document.title = 'AUREVELLA — Luxury, Reimagined.';
    }

    // Handle meta description
    let descMeta = document.querySelector('meta[name="description"]');
    const prevDesc = descMeta ? descMeta.getAttribute('content') : null;
    if (description && descMeta) {
      descMeta.setAttribute('content', description);
    }

    // Handle robots indexing meta
    let robotsMeta = document.querySelector('meta[name="robots"]');
    let createdRobotsMeta = false;
    const prevRobots = robotsMeta ? robotsMeta.getAttribute('content') : null;

    if (noIndex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
        createdRobotsMeta = true;
      }
      robotsMeta.setAttribute('content', 'noindex, nofollow');
    }

    return () => {
      document.title = previousTitle;
      if (description && descMeta && prevDesc !== null) {
        descMeta.setAttribute('content', prevDesc);
      }
      if (noIndex) {
        if (createdRobotsMeta && robotsMeta && robotsMeta.parentNode) {
          robotsMeta.parentNode.removeChild(robotsMeta);
        } else if (robotsMeta) {
          if (prevRobots !== null) {
            robotsMeta.setAttribute('content', prevRobots);
          } else {
            robotsMeta.removeAttribute('content');
          }
        }
      }
    };
  }, [title, description, noIndex]);
};

export default useDocumentTitle;
