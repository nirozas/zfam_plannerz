export const PASTEL_COLORS = [
    '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'
];

/**
 * Generates a stable pastel color based on a string name.
 * This ensures "Food" always has the same color across all components.
 */
export const getColorForName = (name: string = 'Misc') => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return PASTEL_COLORS[hash % PASTEL_COLORS.length];
};
