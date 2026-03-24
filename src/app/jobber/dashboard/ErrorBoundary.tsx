"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { trackError } from "@/lib/analytics";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    trackError(error, "ErrorBoundary", {
      component_stack: info.componentStack?.slice(0, 2000) ?? null,
    });
  }

  handleRefresh = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "300px",
            padding: "2rem",
            textAlign: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
            }}
          >
            !
          </div>
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "var(--foreground, #111827)",
              margin: 0,
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--muted-foreground, #6b7280)",
              margin: 0,
              maxWidth: "400px",
            }}
          >
            An unexpected error occurred while rendering this section. Try
            refreshing the page.
          </p>
          <button
            onClick={this.handleRefresh}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#fff",
              backgroundColor: "var(--primary, #2563eb)",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseOver={(e) =>
              ((e.target as HTMLButtonElement).style.opacity = "0.85")
            }
            onMouseOut={(e) =>
              ((e.target as HTMLButtonElement).style.opacity = "1")
            }
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
