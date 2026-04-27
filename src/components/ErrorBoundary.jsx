import React from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails } = this.state;

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary, #f8fafc)',
          color: 'var(--text-primary, #0f172a)',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            background: 'var(--bg-secondary, #ffffff)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
            textAlign: 'center'
          }}>
            {/* Icon */}
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <AlertTriangle size={36} color="#ef4444" />
            </div>

            {/* Title */}
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
              Something went wrong
            </h1>
            <p style={{
              color: 'var(--text-secondary, #64748b)',
              marginBottom: '24px',
              lineHeight: 1.6
            }}>
              An unexpected error occurred while rendering this page. You can try reloading, or check the error details below.
            </p>

            {/* Error message summary */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
              textAlign: 'left',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: '#ef4444',
              wordBreak: 'break-word'
            }}>
              {error?.message || 'Unknown error'}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: '1px solid var(--border, #e2e8f0)',
                  background: 'var(--bg-primary, #f8fafc)',
                  color: 'var(--text-primary, #0f172a)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--accent, #3b82f6)',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <RefreshCw size={16} /> Reload Page
              </button>
            </div>

            {/* Expandable details */}
            <button
              onClick={this.toggleDetails}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary, #64748b)',
                fontWeight: 500,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                margin: '0 auto',
                padding: '4px 8px'
              }}
            >
              {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showDetails ? 'Hide' : 'Show'} Stack Trace
            </button>

            {showDetails && (
              <div style={{
                marginTop: '12px',
                background: 'var(--bg-primary, #f8fafc)',
                border: '1px solid var(--border, #e2e8f0)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'left',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                <pre style={{
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                  color: 'var(--text-secondary, #64748b)'
                }}>
                  {error?.stack || 'No stack trace available'}
                  {errorInfo?.componentStack && (
                    <>
                      {'\n\n--- Component Stack ---\n'}
                      {errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
