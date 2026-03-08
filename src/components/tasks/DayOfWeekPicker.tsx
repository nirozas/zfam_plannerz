import React from 'react';

const DAYS = [
    { label: 'Su', full: 'Sunday', value: 0 },
    { label: 'Mo', full: 'Monday', value: 1 },
    { label: 'Tu', full: 'Tuesday', value: 2 },
    { label: 'We', full: 'Wednesday', value: 3 },
    { label: 'Th', full: 'Thursday', value: 4 },
    { label: 'Fr', full: 'Friday', value: 5 },
    { label: 'Sa', full: 'Saturday', value: 6 },
];

interface DayOfWeekPickerProps {
    selected: number[];   // e.g. [1, 3, 5] for Mon/Wed/Fri
    onChange: (days: number[]) => void;
}

const DayOfWeekPicker: React.FC<DayOfWeekPickerProps> = ({ selected, onChange }) => {
    const toggle = (day: number) => {
        if (selected.includes(day)) {
            onChange(selected.filter(d => d !== day));
        } else {
            onChange([...selected, day].sort((a, b) => a - b));
        }
    };

    return (
        <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Days of Week
            </label>
            <div className="flex gap-1.5 flex-wrap">
                {DAYS.map(day => {
                    const isOn = selected.includes(day.value);
                    return (
                        <button
                            key={day.value}
                            type="button"
                            title={day.full}
                            onClick={() => toggle(day.value)}
                            className={`w-9 h-9 rounded-xl text-[11px] font-black transition-all select-none
                                ${isOn
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                                    : 'bg-white text-gray-400 border border-gray-200 hover:border-indigo-300 hover:text-indigo-500'
                                }`}
                        >
                            {day.label}
                        </button>
                    );
                })}
            </div>
            {selected.length > 0 && (
                <p className="mt-1.5 text-[10px] font-bold text-indigo-400">
                    Every {selected.map(d => DAYS[d].full).join(', ')}
                </p>
            )}
        </div>
    );
};

export default DayOfWeekPicker;
