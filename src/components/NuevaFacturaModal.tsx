"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X } from "lucide-react";

interface NuevaFacturaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function NuevaFacturaModal({ isOpen, onClose, onSuccess }: NuevaFacturaModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        numero: "",
        cliente: "",
        rut_cliente: "",
        monto: "",
        fecha_emision: new Date().toISOString().split("T")[0],
        descripcion: "",
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const montoNum = parseInt(formData.monto.replace(/\./g, "").replace(/,/g, ""));

            const insertData = {
                ...formData,
                monto: montoNum,
                estado: "pendiente"
            };

            const { error } = await supabase.from("facturas").insert([insertData]);

            if (error) throw error;

            // Also upsert client name
            await supabase.from("clientes").insert([{ nombre: formData.cliente, rut: formData.rut_cliente }]);

            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Error al crear la factura");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-display text-text">Nueva Factura</h3>
                    <button onClick={onClose} className="p-1 rounded-md text-muted hover:text-text hover:bg-surface2 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text mb-1">N° Documento</label>
                            <input
                                required
                                type="text"
                                placeholder="Ej. 1045"
                                value={formData.numero}
                                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                                className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text mb-1">Monto (Total)</label>
                            <input
                                required
                                type="number"
                                placeholder="Ej. 50000"
                                value={formData.monto}
                                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                                className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text mb-1">Cliente / Comunidad</label>
                        <input
                            required
                            type="text"
                            placeholder="Nombre del cliente"
                            value={formData.cliente}
                            onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                            className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text mb-1">RUT Cliente (Opcional)</label>
                        <input
                            type="text"
                            placeholder="Ej. 76.123.456-7"
                            value={formData.rut_cliente}
                            onChange={(e) => setFormData({ ...formData, rut_cliente: e.target.value })}
                            className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text mb-1">Fecha Emisión</label>
                        <input
                            required
                            type="date"
                            value={formData.fecha_emision}
                            onChange={(e) => setFormData({ ...formData, fecha_emision: e.target.value })}
                            className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-accent [color-scheme:dark]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text mb-1">Descripción</label>
                        <textarea
                            rows={2}
                            placeholder="Detalle de facturación..."
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-accent resize-none"
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
                            className="px-4 py-2 text-sm font-medium text-black bg-accent hover:bg-accent/90 rounded-md transition-colors disabled:opacity-50 flex items-center"
                        >
                            {loading ? (
                                <span className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full mr-2"></span>
                            ) : null}
                            Crear Factura
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
