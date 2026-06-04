import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  tabName: string;
}

interface State {
  error: Error | null;
}

/**
 * Error boundary per i tab di analisi DVW. Un dato malformato in un singolo
 * tab non deve far crashare l'intera pagina MatchAnalysis.
 */
export class TabErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(`[TabErrorBoundary · ${this.props.tabName}]`, error, info);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Errore nel tab {this.props.tabName}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Il calcolo è fallito su un dato anomalo. Prova con filtri diversi o ricarica la pagina.
            </p>
          </div>
          <button
            type="button"
            onClick={this.reset}
            className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded bg-secondary hover:bg-secondary/70"
          >
            Riprova
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
