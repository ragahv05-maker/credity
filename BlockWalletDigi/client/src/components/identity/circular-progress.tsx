import React from 'react';

interface CircularProgressProps {
    value: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
}

// Futuristic Circular Progress Component
export const CircularProgress = ({ value, size = 120, strokeWidth = 8, color = "text-primary" }: CircularProgressProps) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Background Circle */}
            <svg className="transform -rotate-90 w-full h-full">
                <circle
                    className="text-secondary"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                {/* Progress Circle with Glow */}
                <circle
                    className={`${color} transition-all duration-1000 ease-out drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]`}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold">{value}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Score</span>
            </div>
        </div>
    );
};
