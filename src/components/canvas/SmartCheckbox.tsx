import { Group, Rect, Path } from 'react-konva';

export type CheckboxState = 'empty' | 'completed' | 'failed';

interface SmartCheckboxProps {
    state: CheckboxState;
    x: number;
    y: number;
    size?: number;
    onChange: (newState: CheckboxState) => void;
    onClick?: () => void;
}

export const SmartCheckbox = ({
    state,
    x,
    y,
    size = 24,
    onChange,
    onClick
}: SmartCheckboxProps) => {
    const handleToggle = (e: any) => {
        e.cancelBubble = true;
        let newState: CheckboxState = 'empty';
        if (state === 'empty') newState = 'completed';
        else if (state === 'completed') newState = 'failed';
        else if (state === 'failed') newState = 'empty';

        onChange(newState);
        if (onClick) onClick();
    };

    const cornerRadius = 6;
    const padding = size * 0.2;

    const getColors = () => {
        switch (state) {
            case 'completed': return { bg: '#10b981', border: '#059669', icon: 'white' }; // Emerald Green
            case 'failed': return { bg: '#ef4444', border: '#dc2626', icon: 'white' }; // Crimson Red
            default: return { bg: 'transparent', border: '#d1d5db', icon: 'transparent' }; // Light gray
        }
    };

    const colors = getColors();

    return (
        <Group
            x={x}
            y={y}
            onClick={handleToggle}
            onTap={handleToggle}
            listening={true}
            hitGraphEnabled={true}
        >
            {/* Hit area - significantly larger than the box for better touch/click targets */}
            <Rect
                x={-size / 2}
                y={-size / 2}
                width={size * 2}
                height={size * 2}
                fill="transparent"
                listening={true}
            />

            {/* The Checkbox Container */}
            <Rect
                width={size}
                height={size}
                fill={colors.bg}
                stroke={colors.border}
                strokeWidth={1}
                cornerRadius={cornerRadius}
                shadowBlur={state !== 'empty' ? 2 : 0}
                shadowColor="rgba(0,0,0,0.1)"
                listening={false}
            />

            {/* Checkmark Icon (✅) */}
            {state === 'completed' && (
                <Path
                    data={`M${padding} ${size / 2} L${size / 2 - 2} ${size - padding - 2} L${size - padding} ${padding + 2}`}
                    stroke="white"
                    strokeWidth={3}
                    lineCap="round"
                    lineJoin="round"
                    listening={false}
                />
            )}

            {/* Failed Icon (❌) */}
            {state === 'failed' && (
                <Group listening={false}>
                    <Path
                        data={`M${padding + 2} ${padding + 2} L${size - padding - 2} ${size - padding - 2}`}
                        stroke="white"
                        strokeWidth={3}
                        lineCap="round"
                        listening={false}
                    />
                    <Path
                        data={`M${size - padding - 2} ${padding + 2} L${padding + 2} ${size - padding - 2}`}
                        stroke="white"
                        strokeWidth={3}
                        lineCap="round"
                        listening={false}
                    />
                </Group>
            )}
        </Group>
    );
};
