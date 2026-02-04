import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, X, Save, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePlannerStore } from '@/store/plannerStore';

interface VoiceRecorderProps {
    isOpen: boolean;
    onClose: () => void;
    onAddVoice: (url: string, duration: number) => void;
}

export function VoiceRecorder({ isOpen, onClose, onAddVoice }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const { uploadAsset } = usePlannerStore();

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            if (!window.isSecureContext && window.location.hostname !== 'localhost') {
                alert("Microphone access requires a secure connection (HTTPS). Please try accessing the site via HTTPS or localhost.");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err: any) {
            console.error("Error accessing microphone:", err);
            if (err.name === 'NotAllowedError') {
                alert("Microphone access was denied. Please check your browser settings and allow microphone access for this site.");
            } else if (err.name === 'NotFoundError') {
                alert("No microphone found. Please connect a microphone and try again.");
            } else {
                alert(`Microphone error: ${err.message || "Access denied or not available."}`);
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleSave = async () => {
        if (!audioBlob) return;
        setIsUploading(true);
        try {
            const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });

            // 1. Upload to Supabase and get the public URL
            const publicUrl = await uploadAsset(file, 'voice', 'Voice Note');

            if (publicUrl) {
                // 2. Add to planner with the permanent URL
                onAddVoice(publicUrl, recordingTime);
                onClose();
            }
        } catch (error) {
            console.error("Failed to save voice note:", error);
            alert("Failed to save voice note to cloud storage.");
        } finally {
            setIsUploading(false);
        }
    };

    const togglePlayback = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-[80] overflow-hidden"
                    >
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-500">
                                        <Mic className="w-5 h-5" />
                                    </div>
                                    Voice Note
                                </h2>
                                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-8 flex flex-col items-center justify-center border border-gray-100 mb-8">
                                {isRecording ? (
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                                            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center text-white relative z-10 shadow-lg shadow-red-500/30">
                                                <Square className="w-8 h-8 fill-current" />
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-3xl font-mono font-bold text-gray-900">{formatTime(recordingTime)}</p>
                                            <p className="text-sm text-red-500 font-bold mt-1 animate-pulse">RECORDING</p>
                                        </div>
                                    </div>
                                ) : audioUrl ? (
                                    <div className="flex flex-col items-center gap-6 w-full">
                                        <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 cursor-pointer hover:scale-105 transition-all"
                                            onClick={togglePlayback}
                                        >
                                            {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current translate-x-1" />}
                                        </div>
                                        <div className="text-center w-full">
                                            <p className="text-sm font-bold text-gray-500 mb-4">Preview Recording ({formatTime(recordingTime)})</p>
                                            <audio
                                                ref={audioRef}
                                                src={audioUrl}
                                                onEnded={() => setIsPlaying(false)}
                                                className="hidden"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-6">
                                        <button
                                            onClick={startRecording}
                                            className="w-20 h-20 bg-white border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center text-gray-400 hover:border-red-500 hover:text-red-500 transition-all hover:bg-red-50"
                                        >
                                            <Mic className="w-8 h-8" />
                                        </button>
                                        <p className="text-sm font-bold text-gray-500">Click to start recording</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4">
                                {audioUrl ? (
                                    <>
                                        <button
                                            onClick={() => { setAudioUrl(null); setAudioBlob(null); setRecordingTime(0); }}
                                            className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" /> Discard
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={isUploading}
                                            className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                                        >
                                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Add to Planner
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        disabled={!isRecording}
                                        onClick={stopRecording}
                                        className={cn(
                                            "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border-2",
                                            isRecording
                                                ? "bg-red-50 border-red-500 text-red-500 hover:bg-red-100"
                                                : "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed"
                                        )}
                                    >
                                        <Square className="w-4 h-4 fill-current" /> Stop Recording
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
