"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Cliente } from "@/types";
import { X, AlertTriangle } from "lucide-react";

interface NuevoClienteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    clienteToEdit?: Cliente | null;
}

export default function NuevoClienteModal({ isOpen, onClose, onSuccess, clienteToEdit }: NuevoClienteModalProps) {
    const [loading, setLoading] = useState(false);
    const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        nombre: "",
        rut: "",
        email: "",
        telefono: "",
        direccion: "",
    });

    const isEditing = !!clienteToEdit;

    // Populate form when editing
    useEffect(() => {
        if (clienteToEdit) {
            setFormData({
                nombre: clienteToEdit.nombre || "",
                rut: clienteToEdit.rut || "",
                email: clienteToEdit.email || "",
                telefono: clienteToEdit.telefono || "",
                direccion: clienteToEdit.direccion || "",
            });
        } else {
            setFormData({ nombre: "", rut: "", email: "", telefono: "", direccion: "" });
        }
        setDuplicateWarning(null);
    }, [clienteToEdit, isOpen]);

    if (!isOpen) return null;

    // Check for duplicates when name or RUT changes
    const checkDuplicates = async (nombre: string, rut: string) => {
        if (!nombre.trim() && !rut.trim()) {
            setDuplicateWarning(null);
            return;
        }

        const conditions: string[] = [];
        let query = supabase.from("clientes").select("id, nombre, rut");

        // Build an OR filter for name or RUT match
        const orFilters: string[] = [];
        if (nombre.trim()) {
            orFilters.push(`nombre.ilike.%${nombre.trim()}%`);
        }
        if (rut.trim()) {
            orFilters.push(`rut.ilike.%${rut.trim()}%`);
        }

        if (orFilters.length === 0) {
            setDuplicateWarning(null);
            return;
        }

        const { data } = await query.or(orFilters.join(","));

        if (data && data.length > 0) {
            // If editing, exclude the current client from duplicates
            const duplicates = isEditing
                ? data.filter((c) => c.id !== clienteToEdit!.id)
                : data;

            if (duplicates.length > 0) {
                const names = duplicates.map((c) => `"${c.nombre}"${c.rut ? ` (${c.rut})` : ""}`).join(", ");
                setDuplicateWarning(`Posible duplicado: ${names}`);
            } else {
                setDuplicateWarning(null);
            }
        } else {
            setDuplicateWarning(null);
        }
    };

    const handleNameChange = (value: string) => {
        setFormData((prev) => ({ ...prev, nombre: value }));
        // Debounce check
        clearTimeout((window as any).__dupTimeout);
        (window as any).__dupTimeout = setTimeout(() => checkDuplicates(value, formData.rut), 400);
    };

    const handleRutChange = (value: string) => {
        setFormData((prev) => ({ ...prev, rut: value }));
        clearTimeout((window as any).__dupTimeout);
        (window as any).__dupTimeout = setTimeout(() => checkDuplicates(formData.nombre, value), 400);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                nombre: formData.nombre.trim(),
                rut: formData.rut.trim() || null,
                email: formData.email.trim() || null,
                telefono: formData.telefono.trim() || null,
                direccion: formData.direccion.trim() || null,
            };

            if (isEditing) {
                // Update existing client
                const { error } = await supabase
                    .from("clientes")
                    .update(payload)
                    .eq("id", clienteToEdit!.id);

                if (error) throw error;
            } else {
                // Check strict duplicate before inserting
                const normalizedName = formData.nombre.trim().toLowerCase();
                const { data: existing } = await supabase
                    .from("clientes")
                    .select("id, nombre")
                    .ilike("nombre", normalizedName);

                if (existing && existing.length > 0) {
                    const confirmed = window.confirm(
                        `Ya existe un cliente con nombre similar: "${existing[0].nombre}". ¿Deseas crearlo de todas formas?`
                    );
                    if (!confirmed) {
                        setLoading(false);
                        return;
                    }
                }

                const { error } = await supabase.from("clientes").insert([payload]);
                if (error) throw error;
            }

            setFormData({ nombre: "", rut: "", email: "", telefono: "", direccion: "" });
            setDuplicateWarning(null);
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            alert(isEditing ? "Error al actualizar el cliente" : "Error al crear el cliente");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-display text-text">
                        {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-md text-muted hover:text-text hover:bg-surface2 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Duplicate warning */}
                    {duplicateWarning && (
                        <div className="flex items-start gap-2 p-3 bg-pendiente/10 border border-pendiente/30 rounded-lg text-xs text-pendiente">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{duplicateWarning}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text mb-1">Nombre o Razón Social</label>
                        <input
                            required
                            type="text"
                            placeholder="Ej. Inmobiliaria XYZ"
                            value={formData.nombre}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text mb-1">RUT</label>
                        <input
                            type="text"
                            placeholder="Ej. 76.123.456-7"
                            value={formData.rut}
                            onChange={(e) => handleRutChange(e.target.value)}
                            className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text mb-1">Email de Contacto</label>
                        <input
                            type="email"
                            placeholder="contacto@empresa.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text mb-1">Teléfono</label>
                        <input
                            type="tel"
                            placeholder="+56 9 1234 5678"
                            value={formData.telefono}
                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                            className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text mb-1">Dirección</label>
                        <input
                            type="text"
                            placeholder="Av. Principal 123, Santiago"
                            value={formData.direccion}
                            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
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
                            {isEditing ? "Guardar Cambios" : "Crear Cliente"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
