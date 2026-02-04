import { useState } from 'react';
import { X, Calendar, ChevronRight, Check, Loader2, Info, Layout, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlannerStore, generateUUID } from '@/store/plannerStore';
import { supabase } from '@/lib/supabase';

interface CalendarOptions {
    type: 'yearly' | 'monthly' | 'weekly' | 'daily';
    year: number;
    startMonth: number;
    endMonth: number;
    pageSize: 'A4' | 'A5' | 'Letter' | 'Custom';
    orientation: 'portrait' | 'landscape';
    includeHolidays: boolean;
    firstDayOfWeek: 0 | 1; // 0 for Sunday, 1 for Monday
}

interface CalendarGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CalendarGenerator({ isOpen, onClose }: CalendarGeneratorProps) {
    const [options, setOptions] = useState<CalendarOptions>({
        type: 'monthly',
        year: new Date().getFullYear(),
        startMonth: 1,
        endMonth: 12,
        pageSize: 'A4',
        orientation: 'portrait',
        includeHolidays: true,
        firstDayOfWeek: 1
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const { activePlanner, currentPageIndex, updatePages, takeSnapshot } = usePlannerStore();

    const generateCalendar = async () => {
        if (!activePlanner) return;

        setIsGenerating(true);
        try {
            const pagesData: any[] = [];

            if (options.type === 'yearly') {
                pagesData.push(generateYearlyPage(options.year));
            } else if (options.type === 'monthly') {
                for (let m = options.startMonth; m <= options.endMonth; m++) {
                    pagesData.push(generateMonthlyPage(options.year, m, options.firstDayOfWeek));
                }
            } else if (options.type === 'weekly') {
                for (let w = 1; w <= 52; w++) {
                    pagesData.push(generateWeeklyPage(options.year, w));
                }
            } else if (options.type === 'daily') {
                const days = isLeapYear(options.year) ? 366 : 365;
                for (let d = 1; d <= days; d++) {
                    pagesData.push(generateDailyPage(options.year, d));
                }
            }

            takeSnapshot();

            const startIdx = currentPageIndex + 1;
            const fullPages = pagesData.map((p, i) => ({
                id: generateUUID(),
                templateId: 'generated-calendar',
                elements: p.elements,
                inkPaths: [],
                section: options.type === 'monthly' ? getMonthName(options.startMonth + i - 1) : options.type.toUpperCase()
            }));

            const newPages = [...activePlanner.pages];
            newPages.splice(startIdx, 0, ...fullPages);
            updatePages(newPages);

            // Persist to DB
            for (let i = 0; i < fullPages.length; i++) {
                const p = fullPages[i];
                await supabase.from('pages').insert({
                    id: p.id,
                    planner_id: activePlanner.id,
                    index: startIdx + i,
                    template_id: 'generated-calendar'
                });
                await supabase.from('layers').insert({
                    page_id: p.id,
                    elements: p.elements,
                    ink_paths: []
                });
            }

            onClose();
        } catch (err) {
            console.error('Error generating calendar:', err);
            alert('Failed to generate calendar. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        key="calendar-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />
                    <motion.div
                        key="calendar-panel"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-4 md:inset-auto md:w-[600px] md:h-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 bg-white rounded-3xl shadow-2xl z-[101] flex flex-col overflow-hidden border border-gray-100"
                    >
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-100 rounded-2xl">
                                    <Calendar className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 leading-none">Calendar Generator</h2>
                                    <p className="text-sm text-gray-500 mt-2 font-medium tracking-tight">Generate custom calendar pages for your planner</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors group">
                                <X className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                {(['yearly', 'monthly', 'weekly', 'daily'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setOptions({ ...options, type })}
                                        className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 relative group overflow-hidden ${options.type === type
                                            ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-50'
                                            : 'border-gray-100 hover:border-indigo-200 hover:bg-white'
                                            }`}
                                    >
                                        {options.type === type && (
                                            <div className="absolute top-4 right-4 text-indigo-600">
                                                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                                                    <Check className="w-4 h-4" />
                                                </div>
                                            </div>
                                        )}
                                        <span className={`text-sm font-bold uppercase tracking-widest ${options.type === type ? 'text-indigo-600' : 'text-gray-400'}`}>
                                            {type}
                                        </span>
                                        <span className={`text-lg font-bold ${options.type === type ? 'text-gray-900' : 'text-gray-600'}`}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)} Planner
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="h-px bg-gray-100" />

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Planner Year</label>
                                        <input
                                            type="number"
                                            value={options.year}
                                            onChange={(e) => setOptions({ ...options, year: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl font-bold text-gray-900 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                                        />
                                    </div>

                                    {options.type === 'monthly' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Start</label>
                                                <select
                                                    value={options.startMonth}
                                                    onChange={(e) => setOptions({ ...options, startMonth: parseInt(e.target.value) })}
                                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl font-bold text-gray-900 focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none"
                                                >
                                                    {Array.from({ length: 12 }, (_, i) => (
                                                        <option key={i + 1} value={i + 1}>{getMonthName(i)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">End</label>
                                                <select
                                                    value={options.endMonth}
                                                    onChange={(e) => setOptions({ ...options, endMonth: parseInt(e.target.value) })}
                                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl font-bold text-gray-900 focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none"
                                                >
                                                    {Array.from({ length: 12 }, (_, i) => (
                                                        <option key={i + 1} value={i + 1}>{getMonthName(i)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                                            <Layout className="w-3.5 h-3.5" />
                                            Page Size
                                        </label>
                                        <select
                                            value={options.pageSize}
                                            onChange={(e) => setOptions({ ...options, pageSize: e.target.value as any })}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl font-bold text-gray-900 focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none"
                                        >
                                            <option value="A4">A4 (Standard)</option>
                                            <option value="A5">A5 (Compact)</option>
                                            <option value="Letter">Letter</option>
                                            <option value="Custom">Custom</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                                            <Layers className="w-3.5 h-3.5" />
                                            Orientation
                                        </label>
                                        <div className="flex bg-gray-50 p-1 rounded-xl">
                                            <button
                                                onClick={() => setOptions({ ...options, orientation: 'portrait' })}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${options.orientation === 'portrait' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Portrait
                                            </button>
                                            <button
                                                onClick={() => setOptions({ ...options, orientation: 'landscape' })}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${options.orientation === 'landscape' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Landscape
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl flex gap-4 items-start shadow-sm">
                                <div className="p-2 bg-white rounded-xl shadow-sm">
                                    <Info className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-blue-900">Pro Tip</p>
                                    <p className="text-xs text-blue-700 mt-1 leading-relaxed font-medium">Pages will be inserted immediately after your current page. You can always reorder them later in the thumbnail view.</p>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 border-t border-gray-100 bg-white flex items-center justify-end shadow-2xl">
                            <button
                                disabled={isGenerating}
                                onClick={generateCalendar}
                                className={`px-12 py-4 rounded-2xl text-base font-bold flex items-center gap-3 transition-all active:scale-95 shadow-lg ${isGenerating ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        Generate {options.type === 'monthly' ? (options.endMonth - options.startMonth + 1) : 1} Pages
                                        <ChevronRight className="w-6 h-6" />
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function getMonthName(idx: number) {
    return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2025, idx, 1));
}

function isLeapYear(year: number) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function generateYearlyPage(year: number) {
    return {
        elements: [
            { id: generateUUID(), type: 'text', x: 300, y: 50, text: `YEARLY PLANNER ${year}`, fontSize: 32, fontStyle: 'bold', fill: '#1F2937' }
        ]
    };
}

function generateMonthlyPage(year: number, month: number, firstDay: number) {
    const monthName = getMonthName(month - 1);
    const elements: any[] = [
        { id: generateUUID(), type: 'text', x: 50, y: 50, text: `${monthName} ${year}`, fontSize: 36, fontStyle: 'bold', fill: '#1F2937' }
    ];

    const gridX = 50;
    const gridY = 150;
    const cellW = 100;
    const cellH = 100;

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    if (firstDay === 0) days.unshift(days.pop()!);

    days.forEach((day, i) => {
        elements.push({
            id: generateUUID(),
            type: 'text',
            x: gridX + i * cellW + 30,
            y: gridY - 40,
            text: day, fontSize: 14, fontStyle: 'bold', fill: '#6B7280'
        });
    });

    const d = new Date(year, month - 1, 1);
    let startDay = d.getDay() - firstDay;
    if (startDay < 0) startDay += 7;

    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const row = Math.floor((day + startDay - 1) / 7);
        const col = (day + startDay - 1) % 7;

        elements.push({
            id: generateUUID(),
            type: 'shape',
            shapeType: 'rectangle',
            x: gridX + col * cellW,
            y: gridY + row * cellH,
            width: cellW,
            height: cellH,
            stroke: '#E5E7EB',
            strokeWidth: 1
        });

        elements.push({
            id: generateUUID(),
            type: 'text',
            x: gridX + col * cellW + 10,
            y: gridY + row * cellH + 10,
            text: day.toString(), fontSize: 16, fill: '#374151'
        });
    }

    return { elements };
}

function generateWeeklyPage(year: number, week: number) {
    return {
        elements: [
            { id: generateUUID(), type: 'text', x: 50, y: 50, text: `WEEK ${week} - ${year}`, fontSize: 32, fontStyle: 'bold', fill: '#1F2937' }
        ]
    };
}

function generateDailyPage(year: number, day: number) {
    return {
        elements: [
            { id: generateUUID(), type: 'text', x: 50, y: 50, text: `DAY ${day} - ${year}`, fontSize: 32, fontStyle: 'bold', fill: '#1F2937' }
        ]
    };
}
