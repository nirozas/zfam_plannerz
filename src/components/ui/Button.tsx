import { cn } from '@/utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
}

export function Button({
    className,
    variant = 'primary',
    size = 'md',
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={cn(
                'rounded-lg font-medium transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                {
                    'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 focus:ring-indigo-500':
                        variant === 'primary',
                    'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400 focus:ring-gray-400':
                        variant === 'secondary',
                    'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-300':
                        variant === 'ghost',
                },
                {
                    'px-3 py-1.5 text-sm': size === 'sm',
                    'px-4 py-2 text-base': size === 'md',
                    'px-6 py-3 text-lg': size === 'lg',
                },
                className
            )}
            {...props}
        >
            {children}
        </button>
    )
}
