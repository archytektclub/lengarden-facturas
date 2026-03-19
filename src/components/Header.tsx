"use client";

import { useAuth } from "@/components/AuthProvider";
import { LogOut, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface HeaderProps {
    currentDate: Date;
    onExport: () => void;
    isExporting: boolean;
    onPrevMonth?: () => void;
    onNextMonth?: () => void;
}

export default function Header({ currentDate, onExport, isExporting, onPrevMonth, onNextMonth }: HeaderProps) {
    const { signOut } = useAuth();

    const formattedMonth = format(currentDate, "MMMM yyyy", { locale: es });
    const displayMonth = formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1);

    return (
        <header className="sticky top-0 z-10 bg-bg/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center">
                <h1 className="text-2xl font-display font-bold text-accent tracking-tighter">
                    LENGARDEN
                </h1>
            </div>

            <div className="flex-1 flex justify-center items-center space-x-4">
                {onPrevMonth && (
                    <button onClick={onPrevMonth} className="p-1 hover:bg-surface2 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-muted hover:text-text" />
                    </button>
                )}

                <h2 className="text-xl font-medium text-text capitalize">
                    {displayMonth}
                </h2>

                {onNextMonth && (
                    <button onClick={onNextMonth} className="p-1 hover:bg-surface2 rounded-full transition-colors">
                        <ChevronRight className="w-5 h-5 text-muted hover:text-text" />
                    </button>
                )}
            </div>

            <div className="flex items-center space-x-4">
                <button
                    onClick={onExport}
                    disabled={isExporting}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-surface2 hover:bg-border text-text rounded-md border border-border transition-colors text-sm disabled:opacity-50"
                >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">
                        {isExporting ? "Exportando..." : "Exportar mes"}
                    </span>
                </button>

                <button
                    onClick={signOut}
                    className="p-1.5 text-muted hover:text-danger rounded-md transition-colors"
                    title="Cerrar sesión"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}
