import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
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

    return this.props.children;
  }
}
