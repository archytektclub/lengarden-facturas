"use client";

import { formatCurrency } from "@/lib/utils";

interface KPICardsProps {
    totalFacturado: number;
    totalCobrado: number;
    totalPendiente: number;
    cantidadFacturas: number;
}

export default function KPICards({
    totalFacturado,
    totalCobrado,
    totalPendiente,
    cantidadFacturas,
}: KPICardsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-medium text-muted mb-1">Total Facturado</h3>
                <p className="text-3xl font-mono text-text">{formatCurrency(totalFacturado)}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-cobrado"></div>
                <h3 className="text-sm font-medium text-muted mb-1">Cobrado</h3>
                <p className="text-3xl font-mono text-text">{formatCurrency(totalCobrado)}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-pendiente"></div>
                <h3 className="text-sm font-medium text-muted mb-1">Pendiente</h3>
                <p className="text-3xl font-mono text-text">{formatCurrency(totalPendiente)}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-medium text-muted mb-1">N° Facturas</h3>
                <p className="text-3xl font-mono text-text">{cantidadFacturas}</p>
            </div>
        </div>
    );
}
