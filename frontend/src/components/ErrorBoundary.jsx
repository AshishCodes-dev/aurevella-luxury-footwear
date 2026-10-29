import React, { Component } from 'react';

/**
 * Luxury Atelier Error Boundary
 * Catches unhandled runtime rendering exceptions across the component tree,
 * preventing white screen crashes and providing a branded recovery flow.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Atelier Error Boundary]: Caught unhandled rendering exception:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen bg-[#0A0503] text-[#FEF5E6] flex flex-col items-center justify-center p-6 text-center"
        >
          <div className="max-w-md w-full border border-[#2F1C15] bg-[#0F0A09] p-8 shadow-2xl">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#B8AD9A] mb-3 block">
              Atelier Exception
            </span>
            <h1 className="font-serif text-2xl md:text-3xl text-[#FEF5E6] mb-4">
              Atelier Interruption
            </h1>
            <p className="text-sm text-[#B8AD9A] leading-relaxed mb-8 font-light">
              An unexpected interface anomaly occurred while loading this section. Our atelier team has recorded this event.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-6 py-3 bg-[#FEF5E6] text-[#0A0503] text-xs uppercase tracking-widest hover:bg-[#FEF5E6]/90 transition-colors duration-200"
              >
                Reload Atelier
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-6 py-3 border border-[#2F1C15] text-[#FEF5E6] text-xs uppercase tracking-widest hover:border-[#FEF5E6]/40 transition-colors duration-200"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
