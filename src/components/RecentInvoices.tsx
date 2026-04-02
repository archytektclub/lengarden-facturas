"use client";

import React, { useState } from "react";
import { Factura } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, ChevronRight } from "lucide-react";
import Link from "next/link";

interface RecentInvoicesProps {
    facturas: Factura[];
    onPayClick: (factura: Factura) => void;
}

export default function RecentInvoices({ facturas, onPayClick }: RecentInvoicesProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    const toggleRow = (id: string, e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;
        setExpandedRowId(prev => prev === id ? null : id);
    };

    const filteredFacturas = facturas
        .filter((f) =>
            f.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (f.rut_cliente || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.monto.toString().includes(searchTerm)
        )
        .sort((a, b) => new Date(b.fecha_emision).getTime() - new Date(a.fecha_emision).getTime());

    return (
        <div className="bg-surface border border-border rounded-xl flex flex-col shadow-sm mb-8 overflow-hidden">
            <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-display text-text">Facturas del mes</h3>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-muted" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por cliente, RUT, N° o monto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-border rounded-md shadow-sm bg-surface2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent w-full sm:w-64"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border table-fixed">
                    <thead className="bg-surface2">
                        <tr>
                            <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider w-16 sm:w-20">
                                Estado
                            </th>
                            <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider w-16 sm:w-20">
                                Factura
                            </th>
                            <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider">
                                Cliente
                            </th>
                            <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell w-32">
                                Descripción
                            </th>
                            <th scope="col" className="px-2 sm:px-4 py-2 text-right text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider w-16 sm:w-24">
                                Monto
                            </th>
                            <th scope="col" className="px-2 sm:px-4 py-2 text-right text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider sticky right-0 bg-surface2 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] border-l border-border w-14 sm:w-20">
                                Acción
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border">
                        {filteredFacturas.length > 0 ? (
                            filteredFacturas.map((factura) => (
                                <React.Fragment key={factura.id}>
                                    <tr className="hover:bg-surface2/50 transition-colors cursor-pointer" onClick={(e) => toggleRow(factura.id, e)}>
                                        <td className="px-2 sm:px-4 py-2 text-xs">
                                            <span
                                                className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] sm:text-xs font-medium sm:rounded-full ${factura.estado === "pagado"
                                                    ? "bg-cobrado/10 text-cobrado"
                                                    : factura.estado === "parcial"
                                                        ? "bg-blue-500/10 text-blue-400"
                                                        : "bg-pendiente/10 text-pendiente"
                                                    }`}
                                            >
                                                {factura.estado.charAt(0).toUpperCase() + factura.estado.slice(1, 3) + (factura.estado.length > 3 ? "." : "")}
                                                <span className="hidden sm:inline-block ml-0.5">{factura.estado.slice(3)}</span>
                                            </span>
                                        </td>
                                        <td className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-mono text-muted break-all">
                                            {factura.numero}
                                        </td>
                                        <td className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-medium text-text whitespace-normal break-words">
                                            {factura.cliente}
                                        </td>
                                        <td className="px-2 sm:px-4 py-2 text-xs text-text hidden md:table-cell truncate" title={factura.descripcion || ""}>
                                            {factura.descripcion || "-"}
                                        </td>
                                        <td className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-mono text-right text-text whitespace-nowrap">
                                            {formatCurrency(factura.monto)}
                                        </td>
                                        <td className="px-2 sm:px-4 py-2 text-right text-xs font-medium sticky right-0 bg-surface shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] border-l border-border">
                                            {factura.estado !== "pagado" && (
                                                <button
                                                    onClick={() => onPayClick(factura)}
                                                    className="text-black bg-accent hover:bg-accent/90 px-2 sm:px-3 py-1 rounded-md transition-colors text-[10px] sm:text-xs inline-flex items-center"
                                                >
                                                    Pagar
                                                </button>
                                            )}
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
                                <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted">
                                    No se encontraron facturas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="p-3 bg-surface2 border-t border-border flex justify-end">
                <Link href="/facturas" className="text-sm text-accent hover:underline flex items-center">
                    Ver todas las facturas <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
            </div>
        </div>
    );
}
