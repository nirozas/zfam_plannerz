import { motion } from 'framer-motion';
import { Copy, ClipboardList, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface ContextMenuProps {
    x: number;
    y: number;
    onCopy: () => void;
    onPaste: () => void;
    onDelete: () => void;
    onBringToFront: () => void;
    onSendToBack: () => void;
    onClose: () => void;
    hasSelection: boolean;
    hasClipboard: boolean;
}

export function ContextMenu({
    x, y,
    onCopy, onPaste, onDelete, onBringToFront, onSendToBack, onClose,
    hasSelection, hasClipboard
}: ContextMenuProps) {
    return (
        <div
            className="fixed inset-0 z-[1000]"
            onClick={onClose}
            onContextMenu={(e) => { e.preventDefault(); onClose(); }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ left: x, top: y }}
                className="absolute bg-white shadow-xl rounded-xl border border-gray-200 py-2 min-w-[180px] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {hasSelection && (
                    <>
                        <button
                            onClick={() => { onCopy(); onClose(); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors"
                        >
                            <Copy className="w-4 h-4" />
                            Copy
                        </button>
                        <button
                            onClick={() => { onBringToFront(); onClose(); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors"
                        >
                            <ArrowUp className="w-4 h-4" />
                            Bring to Front
                        </button>
                        <button
                            onClick={() => { onSendToBack(); onClose(); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors"
                        >
                            <ArrowDown className="w-4 h-4" />
                            Send to Back
                        </button>
                        <div className="my-1 border-t border-gray-100" />
                        <button
                            onClick={() => { onDelete(); onClose(); }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </>
                )}

                <button
                    disabled={!hasClipboard}
                    onClick={() => { onPaste(); onClose(); }}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${hasClipboard ? 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600' : 'text-gray-300 cursor-not-allowed'
                        }`}
                >
                    <ClipboardList className="w-4 h-4" />
                    Paste
                </button>
            </motion.div>
        </div>
    );
}
