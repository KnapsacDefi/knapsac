import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrivyErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface PrivyErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

export class PrivyErrorBoundary extends Component<PrivyErrorBoundaryProps, PrivyErrorBoundaryState> {
  constructor(props: PrivyErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): PrivyErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log Privy-specific errors
    console.error('Privy Error caught by boundary:', error, errorInfo);
    
    // Check for specific Privy connection issues
    if (error.message.includes('Could not establish connection') || 
        error.message.includes('postMessage') ||
        error.message.includes('iframe')) {
      console.error('Privy iframe connection issue detected');
    }
    
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onRetry?.();
    
    // Force reload if retry doesn't work
    setTimeout(() => {
      if (this.state.hasError) {
        window.location.reload();
      }
    }, 5000);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Authentication Error</h2>
            <p className="text-muted-foreground mb-4">
              There was an issue connecting to the authentication service. This might be due to:
            </p>
            <ul className="text-sm text-muted-foreground mb-6 text-left list-disc list-inside">
              <li>Network connectivity issues</li>
              <li>Browser extension conflicts</li>
              <li>Temporary service unavailability</li>
            </ul>
            <div className="space-y-2">
              <Button 
                onClick={this.handleRetry}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Refresh Page
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-medium">Technical Details</summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}