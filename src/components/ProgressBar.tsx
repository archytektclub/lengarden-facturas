"use client";

import { useEffect, useState } from "react";

interface ProgressBarProps {
    porcentaje: number;
}

export default function ProgressBar({ porcentaje }: ProgressBarProps) {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        // Animación al montar
        const timer = setTimeout(() => {
            setWidth(Math.min(Math.max(porcentaje, 0), 100)); // clamp 0-100
        }, 100);
        return () => clearTimeout(timer);
    }, [porcentaje]);

    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-text">% cobrado del mes</span>
                <span className="text-sm font-bold text-cobrado">{width.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-surface2 rounded-full h-2.5 overflow-hidden">
                <div
                    className="bg-cobrado h-2.5 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${width}%` }}
                ></div>
            </div>
        </div>
    );
}
