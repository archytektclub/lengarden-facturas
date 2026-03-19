"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Cliente, Factura } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatCurrency, classNames } from "@/lib/utils";
import { Search, ChevronRight, User, Trash2, Sparkles } from "lucide-react";
import NuevoClienteModal from "@/components/NuevoClienteModal";
import ConfirmModal from "@/components/ConfirmModal";
import Link from "next/link";

interface ClienteWithStats extends Cliente {
    facturasCount: number;
    totalFacturado: number;
    totalCobrado: number;
    totalPendiente: number;
}

export default function ClientesPage() {
    const [clientes, setClientes] = useState<ClienteWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isNuevoClienteModalOpen, setIsNuevoClienteModalOpen] = useState(false);
    const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        isDanger: boolean;
        onConfirm: () => void;
    }>({ isOpen: false, title: "", message: "", isDanger: false, onConfirm: () => { } });

    const loadClientes = async () => {
        setLoading(true);

        // 1. Fetch all clients
        const { data: clientsData, error: clientsError } = await supabase
            .from("clientes")
            .select("*")
            .order("nombre");

        if (clientsError || !clientsData) {
            console.error(clientsError);
            setLoading(false);
            return;
        }

        // 2. Fetch all facturas to calculate stats
        // Note: In an optimized production app, this would be a SQL View or RPC
        const { data: facturasData, error: facturasError } = await supabase
            .from("facturas")
            .select("cliente, monto, estado");

        if (facturasError || !facturasData) {
            console.error(facturasError);
            setLoading(false);
            return;
        }

        // 3. Aggregate stats
        const statsMap = new Map<string, { count: number, facturado: number, cobrado: number, pendiente: number }>();

        facturasData.forEach(f => {
            // Group by normalized client name (uppercase, trimmed) to avoid dupes across slightly different spellings if any
            const normalizedName = f.cliente.trim().toUpperCase();
            const current = statsMap.get(normalizedName) || { count: 0, facturado: 0, cobrado: 0, pendiente: 0 };

            current.count += 1;
            current.facturado += f.monto;

            if (f.estado === "pagado") {
                current.cobrado += f.monto;
            } else {
                current.pendiente += f.monto;
            }

            statsMap.set(normalizedName, current);
        });

        const enrichedClients = clientsData.map(c => {
            const normalizedName = c.nombre.trim().toUpperCase();
            const stats = statsMap.get(normalizedName) || { count: 0, facturado: 0, cobrado: 0, pendiente: 0 };
            return {
                ...c,
                facturasCount: stats.count,
                totalFacturado: stats.facturado,
                totalCobrado: stats.cobrado,
                totalPendiente: stats.pendiente
            };
        });

        setClientes(enrichedClients);
        setLoading(false);
    };

    useEffect(() => {
        loadClientes();
    }, []);

    const handleDelete = (id: string, name: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Eliminar Cliente",
            message: `¿Estás seguro de que deseas eliminar a ${name}? Esto NO borrará sus facturas asociadas en el historial.`,
            isDanger: true,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                const { error } = await supabase.from("clientes").delete().eq("id", id);
                if (error) {
                    alert("Error al eliminar el cliente.");
                } else {
                    loadClientes();
                }
            }
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedClientes(filteredClientes.map(c => c.id));
        } else {
            setSelectedClientes([]);
        }
    };

    const handleSelectOne = (id: string) => {
        setSelectedClientes(prev =>
            prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
        );
    };

    const handleDeduplicate = async () => {
        setConfirmConfig({
            isOpen: true,
            title: "Limpiar Clientes Duplicados",
            message: "¿Deseas buscar y eliminar perfiles de clientes duplicados? El sistema dejará solo una versión de cada cliente (basado en el nombre) y eliminará las copias adicionales.",
            isDanger: true,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                setLoading(true);

                // 1. Fetch all clients
                const { data: allClients, error } = await supabase
                    .from("clientes")
                    .select("*")
                    .order("created_at", { ascending: true });

                if (error || !allClients) {
                    alert("Error al cargar clientes.");
                    setLoading(false);
                    return;
                }

                // 2. Group by normalized name
                const groups = new Map<string, Cliente[]>();
                allClients.forEach(c => {
                    const normalized = c.nombre.trim().toLowerCase();
                    if (!groups.has(normalized)) groups.set(normalized, []);
                    groups.get(normalized)?.push(c);
                });

                // 3. Find duplicates
                const toDelete: string[] = [];
                groups.forEach((group) => {
                    if (group.length > 1) {
                        // Keep the first (oldest), delete the rest
                        group.slice(1).forEach(c => toDelete.push(c.id));
                    }
                });

                if (toDelete.length === 0) {
                    alert("No se encontraron clientes duplicados.");
                    setLoading(false);
                    return;
                }

                // 4. Batch delete
                let hasError = false;
                await Promise.all(toDelete.map(async (id) => {
                    const { error } = await supabase.from("clientes").delete().eq("id", id);
                    if (error) hasError = true;
                }));

                if (hasError) {
                    alert("Hubo un error al eliminar algunos duplicados.");
                } else {
                    alert(`¡Éxito! Se eliminaron ${toDelete.length} perfiles duplicados.`);
                }

                loadClientes();
            }
        });
    };

    const handleBulkDelete = () => {
        setConfirmConfig({
            isOpen: true,
            title: "Eliminar Clientes",
            message: `¿Estás seguro de eliminar los ${selectedClientes.length} clientes seleccionados? Sus facturas en el historial no se verán afectadas.`,
            isDanger: true,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                let hasError = false;
                await Promise.all(selectedClientes.map(async (id) => {
                    const { error } = await supabase.from("clientes").delete().eq("id", id);
                    if (error) hasError = true;
                }));

                if (hasError) {
                    alert("Hubo un error al eliminar algunos clientes.");
                } else {
                    setSelectedClientes([]);
                    loadClientes();
                }
            }
        });
    };

    const filteredClientes = clientes.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.rut && c.rut.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-bg text-text pb-24 md:pb-8">
            <Header currentDate={new Date()} onExport={() => { }} isExporting={false} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-display text-accent mb-1">Directorio de Clientes</h2>
                        <p className="text-muted text-sm border-b border-border pb-4 w-full">
                            Gestiona la información y revisa el historial de cada cliente.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {selectedClientes.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center space-x-2 px-3 py-2 bg-surface hover:bg-danger/10 text-danger rounded-md border border-danger/30 transition-colors text-sm font-medium"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Eliminar ({selectedClientes.length})</span>
                            </button>
                        )}
                        <button
                            onClick={handleDeduplicate}
                            className="flex items-center space-x-2 px-3 py-2 bg-surface hover:bg-surface2 text-text rounded-md border border-border transition-colors text-sm font-medium"
                            title="Limpiar nombres duplicados"
                        >
                            <Sparkles className="w-4 h-4 text-accent" />
                            <span className="hidden sm:inline">Limpiar Duplicados</span>
                        </button>
                        <button
                            onClick={() => setIsNuevoClienteModalOpen(true)}
                            className="flex items-center space-x-2 px-3 py-2 bg-accent hover:bg-accent/90 text-black rounded-md transition-colors text-sm font-medium whitespace-nowrap"
                        >
                            <User className="w-4 h-4" />
                            <span>Nuevo Cliente</span>
                        </button>
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-border">
                        <div className="relative w-full sm:max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-muted" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por nombre o RUT..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-border rounded-md shadow-sm bg-surface2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent w-full"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-12 flex justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-surface2">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left w-12 border-r border-border">
                                            <input
                                                type="checkbox"
                                                className="rounded border-border bg-surface text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                                                checked={filteredClientes.length > 0 && selectedClientes.length === filteredClientes.length}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Nombre & Contacto</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">RUT</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Facturas</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Facturado (Histórico)</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Deuda Actual</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-muted uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-surface divide-y divide-border">
                                    {filteredClientes.length > 0 ? (
                                        filteredClientes.map((cliente) => (
                                            <tr key={cliente.id} className="hover:bg-surface2/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap border-r border-border" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-border bg-surface text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                                                        checked={selectedClientes.includes(cliente.id)}
                                                        onChange={() => handleSelectOne(cliente.id)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-text min-w-[200px]">{cliente.nombre}</div>
                                                    <div className="text-xs text-muted">{cliente.email || "Sin email"}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted hidden md:table-cell">
                                                    {cliente.rut || "-"}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-text font-mono">
                                                    {cliente.facturasCount}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-text font-mono">
                                                    {formatCurrency(cliente.totalFacturado)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                                    <span className={classNames(
                                                        "font-mono px-2 py-0.5 rounded text-xs",
                                                        cliente.totalPendiente > 0 ? "bg-pendiente/10 text-pendiente" : "text-muted"
                                                    )}>
                                                        {formatCurrency(cliente.totalPendiente)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-3">
                                                    <Link
                                                        href={`/facturas?cliente=${encodeURIComponent(cliente.nombre)}`}
                                                        className="text-accent hover:text-accent/80 transition-colors inline-flex items-center"
                                                    >
                                                        Ver ficha <ChevronRight className="w-4 h-4 ml-1" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(cliente.id, cliente.nombre)}
                                                        className="text-muted hover:text-danger p-1 rounded-md transition-colors inline-block align-middle"
                                                        title="Eliminar cliente"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted bg-surface/50">
                                                No se encontraron clientes.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <NuevoClienteModal
                    isOpen={isNuevoClienteModalOpen}
                    onClose={() => setIsNuevoClienteModalOpen(false)}
                    onSuccess={loadClientes}
                />

                <ConfirmModal
                    {...confirmConfig}
                    onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                />
            </main>
        </div>
    );
}
