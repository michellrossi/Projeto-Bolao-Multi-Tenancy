import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).state = { hasError: false } as State;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const self = this as any;
    const props = self.props as Props;
    const state = self.state as State;

    if (state.hasError) {
      if (props.fallback) {
        return props.fallback;
      }

      return (
        <div className="min-h-screen bg-dark text-white flex flex-col items-center justify-center p-4">
          <div className="glass-dark p-8 rounded-3xl border border-red-500/20 text-center max-w-md w-full">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-black uppercase tracking-widest text-white mb-4">Algo deu errado</h1>
            <p className="text-white/60 mb-8">
              Ocorreu um erro inesperado na aplicação. Por favor, recarregue a página.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-dark py-4 rounded-xl font-black uppercase tracking-widest hover:scale-[1.02] transition-transform"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return props.children;
  }
}
