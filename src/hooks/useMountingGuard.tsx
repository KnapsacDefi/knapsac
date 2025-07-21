
import { useRef, useEffect } from 'react';

export const useMountingGuard = () => {
  const isMountedRef = useRef(false);
  const isStableRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Add a small delay to ensure component is fully stable
    const timer = setTimeout(() => {
      isStableRef.current = true;
    }, 100);

    return () => {
      isMountedRef.current = false;
      isStableRef.current = false;
      clearTimeout(timer);
    };
  }, []);

  return {
    isMounted: isMountedRef.current,
    isStable: isStableRef.current
  };
};
