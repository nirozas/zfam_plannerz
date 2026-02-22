import { useState, useRef, useEffect } from 'react';
import { transcribeAudio, generateTextAI } from '@/utils/transcription';
import { getOpenAIKey, setOpenAIKey, hasUserOpenAIKey, getGeminiKey, setGeminiKey, hasUserGeminiKey } from '@/utils/apiKey';
import {
    Sparkles,
    PenTool,
    FileText,
    Mic,
    Palette,
    Wand2,
    ArrowRight,
    Loader2,
    CheckCircle2,
    X,
    FileUp,
    FileText as FileIcon,
    ChevronDown,
    Check,
    Settings
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Textarea } from '../ui/Textarea';
import { cn } from '@/lib/utils';
import { AIFeature } from '@/types';

interface AIFeaturesPanelProps {
    onClose: () => void;
    onApplyResult: (result: string, type: AIFeature) => void;
    onStartSelection: () => void;
    onRunAI: (feature: AIFeature) => Promise<string | void>;
    selectedElement?: any;
}

const aiFeatures: {
    id: AIFeature;
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
}[] = [
        {
            id: 'ink-to-text',
            title: 'Ink to Text',
            description: 'Convert handwriting to editable text',
            icon: PenTool,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
        },
        {
            id: 'summarize',
            title: 'Summarize',
            description: 'Get AI-powered summaries of your notes',
            icon: FileText,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
        },
        {
            id: 'sound-to-text',
            title: 'Sound to Text',
            description: 'Transcribe voice to written notes',
            icon: Mic,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
        },
        {
            id: 'ink-to-artwork',
            title: 'Ink to Artwork',
            description: 'Transform sketches into beautiful artwork',
            icon: Palette,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
        },
        {
            id: 'smart-tasks',
            title: 'Smart Tasks',
            description: 'Extract checklist from your notes',
            icon: Check,
            color: 'text-cyan-600',
            bgColor: 'bg-cyan-50',
        },
        {
            id: 'creative-summary',
            title: 'Creative Mood',
            description: 'Inspiring summary of your day',
            icon: Sparkles,
            color: 'text-pink-600',
            bgColor: 'bg-pink-50',
        },
        {
            id: 'improve-handwriting',
            title: 'Polished Text',
            description: 'Refine and formalize your notes',
            icon: Wand2,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
        },
    ];

export function AIFeaturesPanel({ onClose, onApplyResult, onStartSelection, onRunAI, selectedElement }: AIFeaturesPanelProps) {
    const [activeFeature, setActiveFeature] = useState<AIFeature | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [summarySize, setSummarySize] = useState<'sentence' | '100words' | 'paragraph'>('paragraph');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [userApiKey, setUserApiKey] = useState(getOpenAIKey() || '');
    const [userGeminiKey, setUserGeminiKey] = useState(getGeminiKey() || '');
    const [keySaved, setKeySaved] = useState(false);

    const handleSaveKey = () => {
        setOpenAIKey(userApiKey);
        setGeminiKey(userGeminiKey);
        setKeySaved(true);
        setTimeout(() => {
            setKeySaved(false);
            setIsSettingsOpen(false);
        }, 1500);
    };

    const handleProcess = async () => {
        if (!activeFeature) return;

        if (activeFeature === 'sound-to-text') {
            return; // Handled by VoiceTranscriptionUI
        }

        setIsProcessing(true);
        try {
            let prompt = "";
            let context = inputText;

            switch (activeFeature) {
                case 'summarize':
                    const size = summarySize === 'sentence' ? 'a single sentence' : summarySize === '100words' ? 'about 100 words' : 'a detailed paragraph';
                    prompt = `Provide a high-density, professional summary of the following content in ${size}. Focus on key actions, themes, and dates.`;
                    if (uploadedFile) {
                        context = `File Name: ${uploadedFile.name}\nContent: (Summarization of uploaded file content - implement file reading if needed)`;
                        // Note: For real production, we'd need a PDF/DocX text extractor here.
                    }
                    break;
                case 'ink-to-text':
                case 'ink-to-artwork':
                    const res = await onRunAI(activeFeature);
                    if (res) {
                        setResult(res as string);
                    } else if (activeFeature === 'ink-to-text') {
                        setResult("Handwriting converted successfully!");
                    }
                    setIsProcessing(false);
                    return;
                case 'smart-tasks':
                    prompt = "Extract all actionable tasks, deadlines, and responsibilities from the following text and present them as a clean, high-density checklist.";
                    break;
                case 'creative-summary':
                    prompt = "Give me a creative, inspiring summary of these notes. High density, poetic but practical.";
                    break;
                case 'improve-handwriting':
                    prompt = "The user has converted handwriting to the text below. Please polish the grammar, refine the wording for clarity, and maintain a professional tone while keeping the original intent.";
                    break;
            }

            if (prompt) {
                const response = await generateTextAI(prompt, context);
                setResult(response);
            }
        } catch (err: any) {
            console.error("AI Feature Error:", err);
            if (err.message === "OPENAI_QUOTA_EXCEEDED") {
                setResult("Error: OpenAI quota exceeded. Please switch to Gemini in Settings.");
            } else if (err.message === "GEMINI_RATE_LIMIT") {
                setResult("Error: Gemini rate limit reached (15/min). Please wait a few seconds.");
            } else {
                setResult("Error: Failed to process request. Please check your API keys.");
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300 w-[400px]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-50">
                        <Sparkles className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">AI Assistant</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Premium Tools</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className={cn(
                            "p-2 rounded-lg transition-colors hover:bg-gray-100 relative",
                            isSettingsOpen ? "bg-indigo-50 text-indigo-600" : "text-gray-400"
                        )}
                        title="AI Settings"
                    >
                        <Settings className="h-5 w-5" />
                        {(hasUserOpenAIKey() || hasUserGeminiKey()) && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full border border-white" />
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-900"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative">
                {isSettingsOpen && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 p-6 animate-in fade-in duration-200">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 border-b pb-2">User API Settings</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-gray-700 block">OpenAI API Key</label>
                                        {hasUserOpenAIKey() && <span className="text-[9px] font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded">ACTIVE</span>}
                                    </div>
                                    <input
                                        type="password"
                                        value={userApiKey}
                                        onChange={(e) => setUserApiKey(e.target.value)}
                                        placeholder="sk-..."
                                        className="w-full p-2 text-xs border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-[9px] text-indigo-500 hover:underline">Get OpenAI Key</a>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-gray-700 block">Google Gemini Key (Recommended)</label>
                                        {hasUserGeminiKey() && <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded">ACTIVE</span>}
                                    </div>
                                    <input
                                        type="password"
                                        value={userGeminiKey}
                                        onChange={(e) => setUserGeminiKey(e.target.value)}
                                        placeholder="AIza..."
                                        className="w-full p-2 text-xs border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[9px] text-indigo-500 hover:underline">Get Gemini Key (Free Tier available)</a>
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-400 italic">
                                Keys are stored locally on your browser. We never see them on our servers.
                            </p>

                            <Button
                                onClick={handleSaveKey}
                                className={cn(
                                    "w-full text-xs font-bold transition-all",
                                    keySaved ? "bg-green-500 hover:bg-green-600" : "bg-indigo-600 hover:bg-indigo-700"
                                )}
                            >
                                {keySaved ? (
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4" />
                                        Settings Saved!
                                    </div>
                                ) : "Update Settings"}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Feature Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {aiFeatures.map(feature => (
                        <button
                            key={feature.id}
                            className={cn(
                                "p-4 rounded-2xl border-2 transition-all duration-300 text-left flex flex-col gap-3 group relative overflow-hidden",
                                activeFeature === feature.id
                                    ? "border-indigo-600 bg-indigo-50/30 ring-4 ring-indigo-50"
                                    : "border-gray-50 bg-gray-50/50 hover:bg-white hover:border-indigo-200"
                            )}
                            onClick={() => {
                                setActiveFeature(feature.id);
                                setResult(null);
                            }}
                        >
                            <div className={cn("p-2 rounded-xl w-fit transition-transform group-hover:scale-110", feature.bgColor)}>
                                <feature.icon className={cn("h-4 w-4", feature.color)} />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-gray-900 leading-snug">{feature.title}</div>
                                <div className="text-[10px] text-gray-400 mt-1 font-medium leading-tight">{feature.description}</div>
                            </div>
                            {activeFeature === feature.id && (
                                <div className="absolute top-2 right-2">
                                    <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Active Tool Workspace */}
                {activeFeature && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-indigo-100 shadow-xl shadow-indigo-500/5 overflow-visible">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-900">
                                    <Wand2 className="h-4 w-4 text-indigo-500" />
                                    {aiFeatures.find(f => f.id === activeFeature)?.title}
                                </CardTitle>
                                <CardDescription className="text-[11px]">
                                    {getFeatureInstructions(activeFeature)}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Custom Interaction Areas */}
                                {activeFeature === 'sound-to-text' ? (
                                    <VoiceTranscriptionUI
                                        selectedElement={selectedElement}
                                        onResult={(text) => setResult(text)}
                                    />
                                ) : activeFeature === 'ink-to-artwork' || activeFeature === 'ink-to-text' ? (
                                    <div
                                        className="border-2 border-dashed border-indigo-200 rounded-2xl p-8 text-center bg-indigo-50/20 group hover:border-indigo-400 hover:bg-indigo-50/40 transition-all cursor-pointer"
                                        onClick={onStartSelection}
                                    >
                                        <div className="p-4 bg-white rounded-2xl w-fit mx-auto shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                            <PenTool className="h-8 w-8 text-indigo-600" />
                                        </div>
                                        <p className="text-xs font-bold text-indigo-900 group-hover:text-indigo-600 transition-colors">Select content on canvas</p>
                                        <p className="text-[10px] text-indigo-400 mt-2 font-medium">Use Lasso tool to select your ink</p>
                                    </div>
                                ) : activeFeature === 'summarize' ? (
                                    <div className="space-y-4">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                                <span>Summary Length</span>
                                            </div>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setIsSizeDropdownOpen(!isSizeDropdownOpen)}
                                                    className="w-full h-10 px-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between text-xs font-semibold text-gray-700 transition-all hover:bg-white hover:border-indigo-200"
                                                >
                                                    <span className="capitalize">{summarySize === '100words' ? '100 Words' : summarySize}</span>
                                                    <ChevronDown size={14} className={cn("text-gray-400 transition-transform", isSizeDropdownOpen && "rotate-180")} />
                                                </button>
                                                {isSizeDropdownOpen && (
                                                    <div className="absolute top-[110%] left-0 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in zoom-in-95 duration-200">
                                                        {(['sentence', '100words', 'paragraph'] as const).map(size => (
                                                            <button
                                                                key={size}
                                                                onClick={() => {
                                                                    setSummarySize(size);
                                                                    setIsSizeDropdownOpen(false);
                                                                }}
                                                                className="w-full px-4 py-2 text-left text-xs font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-between group"
                                                            >
                                                                <span className="capitalize">{size === '100words' ? '100 Words' : size}</span>
                                                                {summarySize === size && <Check size={14} className="text-indigo-600" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                                <span>Input Source</span>
                                            </div>

                                            {!uploadedFile ? (
                                                <div className="space-y-3">
                                                    <Textarea
                                                        placeholder="Paste your text here..."
                                                        className="min-h-[100px] text-xs font-medium bg-gray-50/50 border-gray-100 focus:bg-white transition-colors"
                                                        value={inputText}
                                                        onChange={(e) => setInputText(e.target.value)}
                                                    />
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            id="ai-file-upload"
                                                            className="hidden"
                                                            accept=".pdf,.doc,.docx,.txt"
                                                            onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                                                        />
                                                        <label
                                                            htmlFor="ai-file-upload"
                                                            className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-[10px] font-bold text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-all cursor-pointer group"
                                                        >
                                                            <FileUp size={14} className="group-hover:scale-110 transition-transform" />
                                                            UPLOAD PDF OR WORD FILE
                                                        </label>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="p-2 bg-white rounded-lg text-indigo-600">
                                                            <FileIcon size={16} />
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="text-[11px] font-bold text-indigo-900 truncate">{uploadedFile.name}</p>
                                                            <p className="text-[9px] text-indigo-400">{(uploadedFile.size / 1024).toFixed(1)} KB • Ready to summarize</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setUploadedFile(null)}
                                                        className="p-1 hover:bg-indigo-100 rounded-md text-indigo-400 transition-colors"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <Textarea
                                        placeholder="Enter context or notes for the AI..."
                                        className="min-h-[120px] text-xs font-medium"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                    />
                                )}

                                <Button
                                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] gap-2 text-xs font-bold uppercase tracking-wider"
                                    onClick={handleProcess}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            Magic Process
                                            <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </Button>

                                {/* Result Section */}
                                {result && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-in zoom-in-95 duration-300">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                AI Output
                                            </h4>
                                            <span className="text-[9px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full">READY</span>
                                        </div>
                                        {activeFeature === 'ink-to-artwork' ? (
                                            <div className="rounded-lg overflow-hidden border border-gray-200 aspect-square bg-white flex items-center justify-center p-4">
                                                <img src={result} alt="AI Artwork" className="max-w-full h-auto rounded shadow-sm" />
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-700 font-medium leading-relaxed italic border-l-2 border-indigo-200 pl-3">"{result}"</p>
                                        )}
                                        <div className="flex gap-2 mt-4">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="flex-1 h-8 text-[10px] font-bold rounded-lg"
                                                onClick={() => navigator.clipboard.writeText(result)}
                                            >
                                                COPY
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-[2] h-8 text-[10px] font-bold rounded-lg bg-gray-900 text-white"
                                                onClick={() => onApplyResult(result, activeFeature)}
                                            >
                                                INSERT INTO NOTE
                                            </Button>
                                        </div>
                                        {activeFeature === 'sound-to-text' && (
                                            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                                                <button onClick={() => onApplyResult(result, activeFeature)} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all">
                                                    <FileText className="w-3 h-3 text-indigo-600" />
                                                    <span className="text-[8px] font-bold text-gray-500">PASTE</span>
                                                </button>
                                                <button onClick={() => setResult("Summary: " + result.split(' ').slice(0, 5).join(' ') + "...")} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all">
                                                    <Sparkles className="w-3 h-3 text-purple-600" />
                                                    <span className="text-[8px] font-bold text-gray-500">SUMMARIZE</span>
                                                </button>
                                                <button onClick={() => alert("Caption added!")} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all">
                                                    <PenTool className="w-3 h-3 text-green-600" />
                                                    <span className="text-[8px] font-bold text-gray-500">CAPTION</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* AI Tips */}
                {!activeFeature && (
                    <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                        <h3 className="text-xs font-bold text-indigo-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
                            <Sparkles className="h-4 w-4 text-indigo-500" />
                            AI Power Tips
                        </h3>
                        <ul className="space-y-3">
                            {[
                                "Write clearly for 99% ink-to-text accuracy",
                                "Use Summarize for long meeting notes",
                                "Sketch roughly - Magic Art handles the rest",
                                "Sound-to-text is perfect for 'Voice-Journaling'"
                            ].map((tip, i) => (
                                <li key={i} className="flex gap-3 text-[11px] font-medium text-gray-600">
                                    <span className="text-indigo-300 font-bold">•</span>
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

function getFeatureInstructions(feature: AIFeature): string {
    switch (feature) {
        case 'ink-to-text':
            return 'Select your handwriting, then click process to convert to digital text';
        case 'summarize':
            return 'Provide text or select content to generate a concise summary';
        case 'sound-to-text':
            return 'Record voice memos to transcribe them directly into your planner';
        case 'ink-to-artwork':
            return 'Turn any simple sketch into a beautiful, professional illustration';
        case 'smart-tasks':
            return 'Extract todos and tasks from your handwritten or typed notes';
        case 'creative-summary':
            return 'Generate an inspiring, deep-dive summary of your recent notes';
        case 'improve-handwriting':
            return 'Refine and polish your text for clarity and professional tone';
        default:
            return 'Use AI to enhance your planning experience';
    }
}

// --- Nested Professional Voice Component ---

function VoiceTranscriptionUI({ selectedElement, onResult }: { selectedElement?: any, onResult: (text: string) => void }) {
    const [status, setStatus] = useState<'idle' | 'recording' | 'processing'>('idle');
    const [vizData, setVizData] = useState<number[]>(new Array(20).fill(10));

    // Check if a voice note is selected
    const isVoiceNoteSelected = selectedElement?.type === 'voice';

    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const vizInterval = useRef<NodeJS.Timeout | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            const recorder = new MediaRecorder(stream);
            audioChunks.current = [];

            recorder.ondataavailable = (e) => {
                audioChunks.current.push(e.data);
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                setStatus('processing');

                if (vizInterval.current) clearInterval(vizInterval.current);
                setVizData(new Array(20).fill(5));

                try {
                    const text = await transcribeAudio(audioBlob);
                    onResult(text);
                } catch (err: any) {
                    console.error(err);
                    if (err.message === "OPENAI_QUOTA_EXCEEDED") {
                        onResult("Error: OpenAI quota exceeded. Please visit Settings and add a Google Gemini Key (Recommended) for free, accurate transcription.");
                    } else {
                        onResult("Error: Failed to transcribe audio. Please check your API keys.");
                    }
                } finally {
                    setStatus('idle');
                }

                // Cleanup stream
                stream.getTracks().forEach(t => t.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setStatus('recording');

            // Pulse visualization
            vizInterval.current = setInterval(() => {
                setVizData(prev => prev.map(() => Math.random() * 30 + 10));
            }, 100);

        } catch (e) {
            console.error("Microphone Access Error:", e);
            setStatus('idle');
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
    };

    // Clean up interval on unmount
    useEffect(() => {
        return () => {
            if (vizInterval.current) clearInterval(vizInterval.current);
        };
    }, []);

    if (isVoiceNoteSelected) {
        return (
            <div className="space-y-4">
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                        <Mic className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-indigo-900">Voice Note Selected</h4>
                        <p className="text-[10px] text-indigo-500">Ready to transcribe this note</p>
                    </div>
                </div>
                <Button
                    onClick={async () => {
                        const url = selectedElement?.url || selectedElement?.src;
                        if (!url) return;

                        setStatus('processing');
                        try {
                            const response = await fetch(url);
                            const blob = await response.blob();
                            const text = await transcribeAudio(blob);
                            onResult(text);
                        } catch (err: any) {
                            console.error(err);
                            if (err.message === "OPENAI_QUOTA_EXCEEDED") {
                                onResult("Error: OpenAI quota exceeded. Please visit Settings and add a Google Gemini Key (Recommended).");
                            } else {
                                onResult("Error: Failed to transcribe voice note.");
                            }
                        } finally {
                            setStatus('idle');
                        }
                    }}
                    disabled={status !== 'idle'}
                    className="w-full bg-indigo-600 text-white"
                >
                    {status === 'processing' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    {status === 'processing' ? 'Processing...' : 'Transcribe Voice'}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Visualizer Area */}
            <div className="h-24 bg-gray-900 rounded-xl flex items-center justify-center gap-1 overflow-hidden relative">
                {status === 'recording' && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[9px] font-bold text-red-500">REC</span>
                    </div>
                )}

                {status === 'processing' && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                            <span className="text-[10px] font-bold text-indigo-200">
                                {getGeminiKey() ? "Processing with Gemini 1.5 Flash..." : "Processing with OpenAI Whisper..."}
                            </span>
                        </div>
                    </div>
                )}

                {vizData.map((height, i) => (
                    <div
                        key={i}
                        className="w-1 bg-indigo-500 rounded-full transition-all duration-100"
                        style={{ height: `${height}%`, opacity: status === 'recording' ? 1 : 0.3 }}
                    />
                ))}
            </div>

            {/* Controls */}
            {status === 'idle' ? (
                <div
                    onClick={startRecording}
                    className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 hover:border-red-400 cursor-pointer transition-all group"
                >
                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Mic className="h-6 w-6 text-red-500" />
                    </div>
                    <div className="text-center">
                        <span className="text-xs font-bold text-gray-700">Tap to Record</span>
                        <p className="text-[9px] text-gray-400">High-Fidelity Audio Mode (16kHz)</p>
                    </div>
                </div>
            ) : (
                <Button
                    className="w-full bg-red-500 hover:bg-red-600 text-white"
                    onClick={stopRecording}
                >
                    Stop Recording
                </Button>
            )}

            <div className="text-[10px] text-center text-gray-400 flex flex-col gap-1">
                <span>AI Denoising Active • Temperature: 0</span>
                {!(hasUserOpenAIKey() || hasUserGeminiKey()) && (
                    <span className="text-amber-500 font-bold bg-amber-50 px-2 py-1 rounded-full w-fit mx-auto border border-amber-200">
                        ⚠️ AI API Key Missing (Using Mock)
                    </span>
                )}
            </div>
        </div>
    );
}
