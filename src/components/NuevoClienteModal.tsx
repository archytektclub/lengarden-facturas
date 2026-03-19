"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X } from "lucide-react";

interface NuevoClienteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function NuevoClienteModal({ isOpen, onClose, onSuccess }: NuevoClienteModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre: "",
        rut: "",
        email: "",
        telefono: "",
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.from("clientes").insert([{
                nombre: formData.nombre.trim(),
                rut: formData.rut.trim() || null,
                email: formData.email.trim() || null,
                telefono: formData.telefono.trim() || null
            }]);

            if (error) throw error;

            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Error al crear el cliente");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-display text-text">Nuevo Cliente</h3>
                    <button onClick={onClose} className="p-1 rounded-md text-muted hover:text-text hover:bg-surface2 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text mb-1">Nombre o Razón Social</label>
                        <input
                            required
                            type="text"
                            placeholder="Ej. Inmobiliaria XYZ"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text mb-1">RUT (Opcional)</label>
                        <input
                            type="text"
                            placeholder="Ej. 76.123.456-7"
                            value={formData.rut}
                            onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                            className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text mb-1">Email de Contacto (Opcional)</label>
                        <input
                            type="email"
                            placeholder="contacto@empresa.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text mb-1">Teléfono (Opcional)</label>
                        <input
                            type="tel"
                            placeholder="+56 9 1234 5678"
                            value={formData.telefono}
                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                            className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-accent"
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
                            Crear Cliente
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
