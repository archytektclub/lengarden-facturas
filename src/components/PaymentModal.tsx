"use client";

import { useState } from "react";
import { Factura } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { X } from "lucide-react";

interface PaymentModalProps {
    factura: Factura | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function PaymentModal({ factura, isOpen, onClose, onSuccess }: PaymentModalProps) {
    const [fechaPago, setFechaPago] = useState("");
    const [notas, setNotas] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !factura) return null;

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: updateError } = await supabase
            .from("facturas")
            .update({
                estado: "pagado",
                fecha_pago: fechaPago || new Date().toISOString().split("T")[0],
                notas: notas || null,
            })
            .eq("id", factura.id);

        if (updateError) {
            setError(updateError.message);
            setLoading(false);
        } else {
            setLoading(false);
            onSuccess();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-xl font-display text-accent" id="modal-title">
                        Registrar Pago
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-md text-muted hover:text-text hover:bg-surface2 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4">
                    <div className="text-sm text-text space-y-2 mb-6 p-4 bg-surface2 rounded-md border border-border">
                        <p><span className="text-muted">Cliente:</span> {factura.cliente}</p>
                        <p><span className="text-muted">Factura N°:</span> {factura.numero}</p>
                        <p><span className="text-muted">Monto:</span> <span className="font-mono text-accent">{formatCurrency(factura.monto)}</span></p>
                    </div>

                    <form onSubmit={handlePay} className="space-y-4">
                        {error && (
                            <div className="text-danger text-sm bg-danger/10 border border-danger/20 p-2 rounded">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="fecha_pago" className="block text-sm font-medium text-text">
                                Fecha de pago
                            </label>
                            <input
                                type="date"
                                id="fecha_pago"
                                value={fechaPago}
                                onChange={(e) => setFechaPago(e.target.value)}
                                required
                                className="mt-1 block w-full bg-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-text [color-scheme:dark]"
                            />
                        </div>

                        <div>
                            <label htmlFor="notas" className="block text-sm font-medium text-text">
                                Notas <span className="text-muted font-normal">(opcional)</span>
                            </label>
                            <textarea
                                id="notas"
                                rows={3}
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                                placeholder="Transferencia BancoEstado rev 123456"
                                className="mt-1 block w-full bg-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-text placeholder-muted"
                            />
                        </div>

                        <div className="pt-4 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-text bg-surface hover:bg-surface2 border border-border rounded-md transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-black bg-accent hover:bg-accent/90 rounded-md transition-colors flex items-center justify-center disabled:opacity-50"
                            >
                                {loading ? "Confirmando..." : "Confirmar Pago"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
