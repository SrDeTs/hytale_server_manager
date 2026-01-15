/**
 * Error Boundary Tests
 *
 * Tests for the ErrorBoundary component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import {
  ErrorBoundary,
  PageErrorBoundary,
  WidgetErrorBoundary,
} from '../ErrorBoundary';

// Mock console.error to prevent noise in test output
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
});

// Component that throws an error
function ThrowError({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
}

describe('ErrorBoundary', () => {
  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary name="Test">
        <div data-testid="child">Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should render fallback UI when error occurs', () => {
    render(
      <ErrorBoundary name="Test">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary name="Test" onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should show Try Again button in fallback', () => {
    render(
      <ErrorBoundary name="Test">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('should show Refresh Page button in fallback', () => {
    render(
      <ErrorBoundary name="Test">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
  });

  it('should show Go Home button in fallback', () => {
    render(
      <ErrorBoundary name="Test">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('should use custom fallback when provided', () => {
    const customFallback = <div data-testid="custom">Custom fallback</div>;

    render(
      <ErrorBoundary name="Test" fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom')).toBeInTheDocument();
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('should call custom fallback function with error details', () => {
    const fallbackFn = vi.fn().mockReturnValue(<div>Custom</div>);

    render(
      <ErrorBoundary name="Test" fallback={fallbackFn}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(fallbackFn).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test error message',
        timestamp: expect.any(Date),
        url: expect.any(String),
        userAgent: expect.any(String),
      }),
      expect.any(Function) // reset function
    );
  });
});

describe('PageErrorBoundary', () => {
  it('should render children when no error occurs', () => {
    render(
      <PageErrorBoundary name="TestPage">
        <div>Page content</div>
      </PageErrorBoundary>
    );

    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('should render error UI when error occurs', () => {
    render(
      <PageErrorBoundary name="TestPage">
        <ThrowError />
      </PageErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});

describe('WidgetErrorBoundary', () => {
  it('should render children when no error occurs', () => {
    render(
      <WidgetErrorBoundary name="TestWidget">
        <div>Widget content</div>
      </WidgetErrorBoundary>
    );

    expect(screen.getByText('Widget content')).toBeInTheDocument();
  });

  it('should render compact error UI when error occurs', () => {
    render(
      <WidgetErrorBoundary name="TestWidget">
        <ThrowError />
      </WidgetErrorBoundary>
    );

    expect(screen.getByText(/failed to load testwidget/i)).toBeInTheDocument();
  });

  it('should show error message in widget error UI', () => {
    render(
      <WidgetErrorBoundary name="TestWidget">
        <ThrowError />
      </WidgetErrorBoundary>
    );

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <WidgetErrorBoundary name="TestWidget" className="custom-class">
        <ThrowError />
      </WidgetErrorBoundary>
    );

    const errorContainer = screen.getByText(/failed to load/i).closest('div');
    expect(errorContainer?.parentElement).toHaveClass('custom-class');
  });
});
