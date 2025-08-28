// components/ErrorBoundary.jsx

import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-700">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            {this.props.fallbackTitle || "Something went wrong"}
          </h2>
          <p className="text-red-600 dark:text-red-300 mb-4">
            {this.props.fallbackMessage ||
              "An unexpected error occurred. Please try again."}
          </p>
          <button
            onClick={this.handleReset}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {this.props.retryText || "Try Again"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
