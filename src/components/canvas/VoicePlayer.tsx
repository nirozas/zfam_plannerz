import { useState, useRef, useEffect } from 'react'
import { Play, Pause, X, Volume2 } from 'lucide-react'

interface VoicePlayerProps {
    src: string
    duration: number // in seconds
    x: number
    y: number
    onClose: () => void
}

export function VoicePlayer({ src, duration, x, y, onClose }: VoicePlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        const audio = new Audio(src)
        audioRef.current = audio

        const updateTime = () => setCurrentTime(audio.currentTime)
        const handleEnded = () => setIsPlaying(false)
        const handleCanPlay = () => setIsLoaded(true)

        audio.addEventListener('timeupdate', updateTime)
        audio.addEventListener('ended', handleEnded)
        audio.addEventListener('canplaythrough', handleCanPlay)

        // Auto-play when opened? Maybe not, consistent with user intent "when playing... show controls"
        // Let's auto-play.
        audio.play().then(() => setIsPlaying(true)).catch(console.error)

        return () => {
            audio.pause()
            audio.removeEventListener('timeupdate', updateTime)
            audio.removeEventListener('ended', handleEnded)
            audio.removeEventListener('canplaythrough', handleCanPlay)
        }
    }, [src])

    const togglePlay = () => {
        if (!audioRef.current) return
        if (isPlaying) {
            audioRef.current.pause()
        } else {
            audioRef.current.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value)
        if (audioRef.current) {
            audioRef.current.currentTime = time
            setCurrentTime(time)
        }
    }

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60)
        const secs = Math.floor(time % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div
            className="absolute z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-3 flex items-center gap-3 w-64 animate-in zoom-in-95 duration-200"
            style={{ left: x, top: y - 80 }}
            onMouseDown={(e) => e.stopPropagation()} // Prevent canvas events
        >
            <button
                onClick={togglePlay}
                className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700 transition-colors"
            >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <div className="flex-1 flex flex-col gap-1">
                <input
                    type="range"
                    min="0"
                    max={duration || audioRef.current?.duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:rounded-full"
                />
                <div className="flex justify-between text-[10px] font-bold text-gray-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration || audioRef.current?.duration || 0)}</span>
                </div>
            </div>

            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-4 h-4" />
            </button>
        </div>
    )
}
