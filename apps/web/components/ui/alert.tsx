'use client';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
}

export function Alert({ children, variant = 'default' }: AlertProps) {
  const styles = {
    default: 'bg-blue-50 text-blue-800 border-blue-200',
    destructive: 'bg-red-50 text-red-800 border-red-200',
  };

  return (
    <div className={`p-3 rounded-lg border text-sm ${styles[variant]}`}>
      {children}
    </div>
  );
}

export function AlertDescription({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}
