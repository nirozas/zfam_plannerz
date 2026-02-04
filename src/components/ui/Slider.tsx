import { cn } from '@/lib/utils'

interface SliderProps {
    value: number[]
    onValueChange: (value: number[]) => void
    min?: number
    max?: number
    step?: number
    className?: string
}

export function Slider({
    value,
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    className
}: SliderProps) {
    return (
        <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value[0]}
                onChange={(e) => onValueChange([parseInt(e.target.value, 10)])}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
        </div>
    )
}
