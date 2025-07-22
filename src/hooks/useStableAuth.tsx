
import { useState, useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export const useStableAuth = () => {
  const { ready, authenticated, user } = usePrivy();
  const [stableState, setStableState] = useState({
    ready: false,
    authenticated: false,
    user: null
  });
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastStateRef = useRef({ ready, authenticated, user });

  useEffect(() => {
    // Clear any pending updates
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only update if state actually changed
    const stateChanged = 
      lastStateRef.current.ready !== ready ||
      lastStateRef.current.authenticated !== authenticated ||
      lastStateRef.current.user !== user;

    if (stateChanged) {
      lastStateRef.current = { ready, authenticated, user };
      
      // Immediate update for logout (when authenticated becomes false)
      if (!authenticated && lastStateRef.current.authenticated) {
        console.log('useStableAuth: Immediate logout detected');
        setStableState({
          ready,
          authenticated,
          user
        });
        return;
      }
      
      // Debounce other state updates to prevent rapid changes
      timeoutRef.current = setTimeout(() => {
        setStableState({
          ready,
          authenticated,
          user
        });
      }, 25); // Reduced debounce for faster response
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [ready, authenticated, user]);

  return stableState;
};
