"use client";

import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Factura, Cliente } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate, classNames } from "@/lib/utils";
import { Search, Filter, Download } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type FilterStatus = "todos" | "pendiente" | "pagado" | "parcial";

export default function HistorialPage() {
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);

    // Advanced Search Filters
    const [selectedCliente, setSelectedCliente] = useState<string>("todos");
    const [desdeMes, setDesdeMes] = useState<string>(""); // format YYYY-MM-DD
    const [hastaMes, setHastaMes] = useState<string>(""); // format YYYY-MM-DD
    const [statusFilter, setStatusFilter] = useState<FilterStatus>("todos");

    const [hasSearched, setHasSearched] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);

    // Expandable Rows for Mobile
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    const toggleRow = (id: string, e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('a') || target.closest('button') || target.closest('input')) return;
        setExpandedRowId(prev => prev === id ? null : id);
    };

    useEffect(() => {
        // Load clients for the dropdown
        const fetchClientes = async () => {
            const { data } = await supabase.from("clientes").select("nombre").order("nombre");
            if (data) {
                setClientes(data as unknown as Cliente[]);
            }
            setLoading(false);
        };
        fetchClientes();
    }, []);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSearchLoading(true);

        let query = supabase.from("facturas").select("*").order("fecha_emision", { ascending: false });

        if (selectedCliente !== "todos") {
            query = query.ilike("cliente", "%" + selectedCliente + "%");
        }

        if (statusFilter !== "todos") {
            query = query.eq("estado", statusFilter);
        }

        if (desdeMes) {
            query = query.gte("fecha_emision", desdeMes);
        }

        if (hastaMes) {
            query = query.lte("fecha_emision", hastaMes);
        }

        const { data, error } = await query;
        if (!error && data) {
            setFacturas(data);
        }

        setSearchLoading(false);
        setHasSearched(true);
    };

    const clearFilters = () => {
        setSelectedCliente("todos");
        setDesdeMes("");
        setHastaMes("");
        setStatusFilter("todos");
        setHasSearched(false);
        setFacturas([]);
    };

    const handleExport = () => {
        if (facturas.length === 0) return;

        const ws = XLSX.utils.json_to_sheet(facturas.map(f => ({
            "N°": f.numero,
            "Cliente": f.cliente,
            "RUT": f.rut_cliente,
            "Monto": f.monto,
            "Fecha Emisión": f.fecha_emision,
            "Descripción": f.descripcion,
            "Estado": f.estado,
            "Fecha Pago": f.fecha_pago,
            "Notas": f.notas
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Historial");

        const timeStr = format(new Date(), "yyyyMMdd_HHmm");
        XLSX.writeFile(wb, "Historial_Facturas_" + timeStr + ".xlsx");
    };

    // Summaries
    const totalFacturado = facturas.reduce((sum, f) => sum + f.monto, 0);
    const totalCobrado = facturas.filter(f => f.estado === "pagado").reduce((sum, f) => sum + f.monto, 0);
    const totalPendiente = facturas.filter(f => f.estado !== "pagado").reduce((sum, f) => sum + f.monto, 0);

    return (
        <div className="min-h-screen bg-bg text-text pb-24 md:pb-8">
            <Header currentDate={new Date()} onExport={() => { }} isExporting={false} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in fade-in">
                <div className="mb-6">
                    <h2 className="text-2xl font-display text-accent mb-2">Búsqueda Avanzada</h2>
                    <p className="text-muted text-sm border-b border-border pb-4">
                        Consulta el historial completo de facturas aplicando diferentes filtros.
                    </p>
                </div>

                {/* Search Panel */}
                <div className="bg-surface border border-border rounded-xl shadow-sm p-5 mb-8">
                    <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                        <div>
                            <label className="block text-sm font-medium text-text mb-1">Cliente</label>
                            <select
                                value={selectedCliente}
                                onChange={(e) => setSelectedCliente(e.target.value)}
                                className="block w-full bg-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-text"
                            >
                                <option value="todos">Todos los clientes</option>
                                {clientes.map((c, i) => (
                                    <option key={i} value={c.nombre}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text mb-1">Desde</label>
                            <input
                                type="date"
                                value={desdeMes}
                                onChange={(e) => setDesdeMes(e.target.value)}
                                className="block w-full bg-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-text [color-scheme:dark]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text mb-1">Hasta</label>
                            <input
                                type="date"
                                value={hastaMes}
                                onChange={(e) => setHastaMes(e.target.value)}
                                className="block w-full bg-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-text [color-scheme:dark]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text mb-1">Estado</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                                className="block w-full bg-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-text"
                            >
                                <option value="todos">Todos</option>
                                <option value="pendiente">Pendiente</option>
                                <option value="pagado">Pagado</option>
                                <option value="parcial">Parcial</option>
                            </select>
                        </div>

                        <div className="lg:col-span-4 flex justify-end gap-3 mt-2">
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="px-4 py-2 border border-border shadow-sm text-sm font-medium rounded-md text-text bg-surface hover:bg-surface2 transition-colors"
                                disabled={searchLoading}
                            >
                                Limpiar filtros
                            </button>
                            <button
                                type="submit"
                                disabled={searchLoading}
                                className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-black bg-accent hover:bg-accent/90 transition-colors flex items-center justify-center disabled:opacity-50"
                            >
                                {searchLoading ? (
                                    <span className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full mr-2"></span>
                                ) : (
                                    <Search className="w-4 h-4 mr-2" />
                                )}
                                Buscar
                            </button>
                        </div>
                    </form>
                </div>

                {/* Results */}
                {hasSearched && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-surface border border-border rounded-xl shadow-sm p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="text-sm">
                                <span className="font-bold text-accent mr-2">{facturas.length} facturas</span>
                                <span className="text-muted mr-3 hidden sm:inline">·</span>
                                <span className="text-text mr-3 block sm:inline">Facturado: <span className="font-mono">{formatCurrency(totalFacturado)}</span></span>
                                <span className="text-muted mr-3 hidden sm:inline">·</span>
                                <span className="text-cobrado mr-3 block sm:inline">Cobrado: <span className="font-mono">{formatCurrency(totalCobrado)}</span></span>
                                <span className="text-muted mr-3 hidden sm:inline">·</span>
                                <span className="text-pendiente block sm:inline">Pendiente: <span className="font-mono">{formatCurrency(totalPendiente)}</span></span>
                            </div>

                            <button
                                onClick={handleExport}
                                disabled={facturas.length === 0}
                                className="flex items-center space-x-2 px-3 py-2 bg-surface2 hover:bg-border text-text rounded-md border border-border transition-colors text-sm disabled:opacity-50 shrink-0 w-full sm:w-auto justify-center"
                            >
                                <Download className="w-4 h-4" />
                                <span>Exportar esta selección</span>
                            </button>
                        </div>

                        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border table-fixed">
                                    <thead className="bg-surface2">
                                        <tr>
                                            <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider w-16 sm:w-20">Estado</th>
                                            <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider w-16 sm:w-20">Factura</th>
                                            <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider">Cliente</th>
                                            <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell w-32">Descripción</th>
                                            <th scope="col" className="px-2 sm:px-4 py-2 text-right text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider w-16 sm:w-24">Monto</th>
                                            <th scope="col" className="px-2 sm:px-4 py-2 text-right text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider sticky right-0 bg-surface2 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] border-l border-border w-16 sm:w-24">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-surface divide-y divide-border">
                                        {facturas.length > 0 ? (
                                            facturas.map((factura) => (
                                                <React.Fragment key={factura.id}>
                                                    <tr className="hover:bg-surface2/50 transition-colors cursor-pointer" onClick={(e) => toggleRow(factura.id, e)}>
                                                        <td className="px-2 sm:px-4 py-2 text-xs w-16 sm:w-20">
                                                            <span className={classNames(
                                                                "inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] sm:text-xs font-medium sm:rounded-full",
                                                                factura.estado === "pagado" ? "bg-cobrado/10 text-cobrado" :
                                                                    factura.estado === "parcial" ? "bg-blue-500/10 text-blue-400" :
                                                                        "bg-pendiente/10 text-pendiente"
                                                            )}>
                                                                {factura.estado.charAt(0).toUpperCase() + factura.estado.slice(1, 3) + (factura.estado.length > 3 ? "." : "")}
                                                                <span className="hidden sm:inline-block ml-0.5">{factura.estado.slice(3)}</span>
                                                            </span>
                                                        </td>
                                                        <td className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-mono text-text break-all w-16 sm:w-20">{factura.numero}</td>
                                                        <td className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-medium text-text whitespace-normal break-words">{factura.cliente}</td>
                                                        <td className="px-2 sm:px-4 py-2 text-xs text-text hidden md:table-cell truncate" title={factura.descripcion || ""}>{factura.descripcion || "-"}</td>
                                                        <td className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-mono text-right text-text whitespace-nowrap">{formatCurrency(factura.monto)}</td>
                                                        <td className="px-2 sm:px-4 py-2 text-right text-xs font-medium sticky right-0 bg-surface shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] border-l border-border whitespace-nowrap">
                                                            <Link href={"/facturas?cliente=" + encodeURIComponent(factura.cliente)} className="text-accent hover:underline text-[10px] sm:text-xs">Ver Facturas</Link>
                                                        </td>
                                                    </tr>
                                                    {expandedRowId === factura.id && (
                                                        <tr className="bg-surface2/30 border-b border-border md:hidden animate-fade-in fade-in">
                                                            <td colSpan={6} className="px-3 py-3">
                                                                <div className="flex flex-col space-y-2 text-[10px]">
                                                                    <div><span className="font-medium text-muted">Fecha Emisión:</span> <span className="text-text">{formatDate(factura.fecha_emision)}</span></div>
                                                                    <div><span className="font-medium text-muted">Descripción:</span> <span className="text-text">{factura.descripcion || "Sin descripción"}</span></div>
                                                                    <div><span className="font-medium text-muted">Estado Completo:</span> <span className="text-text capitalize">{factura.estado}</span></div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted bg-surface/50">
                                                    No hay resultados para los filtros seleccionados.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
