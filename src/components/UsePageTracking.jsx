import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Ensure gtag is defined (Google Analytics script is loaded)
    if (typeof window.gtag === 'function') {

      // Construct a clean path including the hash (e.g., /#/about)
      const customPath = location.pathname + location.search + window.location.hash;

      window.gtag('event', 'page_view', {
        page_path: customPath,
        page_title: document.title || 'React App',
        page_location: window.location.href
      });
    }
  }, [location]); // Fires every time the route changes
};

export default usePageTracking;
