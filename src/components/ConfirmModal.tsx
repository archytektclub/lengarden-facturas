"use client";

import { X } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDanger?: boolean;
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    onConfirm,
    onCancel,
    isDanger = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-display text-text">{title}</h3>
                    <button onClick={onCancel} className="p-1 rounded-md text-muted hover:text-text hover:bg-surface2 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 text-sm text-text">
                    {message}
                </div>
                <div className="p-4 flex justify-end space-x-3 bg-surface2 border-t border-border">
                    <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-text bg-surface border border-border rounded-md hover:bg-surface transition-colors">
                        {cancelText}
                    </button>
                    <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isDanger ? 'bg-danger text-white hover:bg-danger/90' : 'bg-accent text-black hover:bg-accent/90'}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
