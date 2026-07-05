import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, info);
    }
  }

  reload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 font-sans">
          <Card className="w-full max-w-2xl border border-destructive/30 bg-card shadow-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Si è verificato un errore
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                L'app ha incontrato un problema imprevisto. Ricarica per riprovare.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={this.reload} className="w-full sm:w-auto">
                Ricarica l'app
              </Button>
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-destructive mb-2">
                  Dettagli tecnici
                </p>
                <ScrollArea className="h-48 w-full rounded-md border border-border/50 bg-black/20 p-3">
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap break-all text-foreground/80">
                    {this.state.error.message}
                    {this.state.error.stack ? `\n\n${this.state.error.stack}` : ""}
                  </pre>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
