
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
      if (!authenticated && stableState.authenticated) {
        console.log('useStableAuth: Immediate logout detected');
        setStableState({
          ready,
          authenticated,
          user
        });
        return;
      }
      
      // Immediate update for login (when authenticated becomes true)
      if (authenticated && !stableState.authenticated) {
        console.log('useStableAuth: Immediate login detected');
        setStableState({
          ready,
          authenticated,
          user
        });
        return;
      }
      
      // Small debounce for other state updates
      timeoutRef.current = setTimeout(() => {
        setStableState({
          ready,
          authenticated,
          user
        });
      }, 10); // Minimal debounce for other changes
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [ready, authenticated, user, stableState.authenticated]);

  return stableState;
};
