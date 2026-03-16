import React from 'react';
import Button from './Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-16 h-16 rounded-full bg-discord-red/20 flex items-center justify-center mb-4">
            <span className="text-2xl text-discord-red">!</span>
          </div>
          <h2 className="text-xl font-semibold text-discord-white mb-2">Algo salio mal</h2>
          <p className="text-discord-muted mb-1 max-w-md">
            Ocurrio un error inesperado al renderizar esta pagina.
          </p>
          {this.state.error && (
            <p className="text-xs text-discord-muted/60 mb-4 font-mono max-w-lg break-all">
              {this.state.error.message}
            </p>
          )}
          <Button
            variant="primary"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Recargar pagina
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
