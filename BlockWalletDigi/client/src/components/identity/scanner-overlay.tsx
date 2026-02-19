import React from 'react';
import { motion } from 'framer-motion';

// Immersive Scanner Overlay
export const ScannerOverlay = ({ active, status }: { active: boolean; status: string }) => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
            {active && (
                <>
                    {/* Scanning Grid */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        className="absolute inset-0 bg-[url('/grid-pattern.png')] bg-repeat opacity-20"
                    />

                    {/* Scanning Line */}
                    <motion.div
                        initial={{ top: "0%" }}
                        animate={{ top: "100%" }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent shadow-[0_0_20px_rgba(34,197,94,0.8)]"
                    />

                    {/* Corner Brackets */}
                    <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-green-500/50 rounded-tl-lg" />
                    <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-green-500/50 rounded-tr-lg" />
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-green-500/50 rounded-bl-lg" />
                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-green-500/50 rounded-br-lg" />

                    {/* Status Badge */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-1 rounded-full border border-white/10 text-xs font-mono text-green-400 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        {status || "SEARCHING..."}
                    </div>
                </>
            )}
        </div>
    );
};
