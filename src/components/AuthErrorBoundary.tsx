
import React, { Component, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthErrorBoundaryState {
  hasAuthError: boolean;
  isLoggingOut: boolean;
}

interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = { hasAuthError: false, isLoggingOut: false };
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    // Check if it's an auth provider error during logout
    if (error.message?.includes('useAuth must be used within an AuthProvider')) {
      return { hasAuthError: true, isLoggingOut: true };
    }
    return {};
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only handle auth provider errors, let others bubble up
    if (error.message?.includes('useAuth must be used within an AuthProvider')) {
      console.log('Auth provider temporarily unavailable during logout transition');
      
      // Auto-recover after a short delay
      setTimeout(() => {
        this.setState({ hasAuthError: false, isLoggingOut: false });
      }, 2000);
    } else {
      // Re-throw non-auth errors
      throw error;
    }
  }

  render() {
    if (this.state.hasAuthError && this.state.isLoggingOut) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Signing out...</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
