import { cn } from '@/lib/utils';

export function Card({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <div className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden", className)}>
            {children}
        </div>
    );
}

export function CardHeader({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <div className={cn("p-6 pb-4", className)}>
            {children}
        </div>
    );
}

export function CardTitle({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <h3 className={cn("text-lg font-bold text-gray-900 leading-tight", className)}>
            {children}
        </h3>
    );
}

export function CardDescription({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <p className={cn("text-sm text-gray-500 mt-1.5", className)}>
            {children}
        </p>
    );
}

export function CardContent({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <div className={cn("p-6 pt-0", className)}>
            {children}
        </div>
    );
}
