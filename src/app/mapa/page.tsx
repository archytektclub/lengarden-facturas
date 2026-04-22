"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Header from "@/components/Header";
import { Factura, Cliente } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate, classNames } from "@/lib/utils";
import { startOfMonth, endOfMonth, subMonths, addMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Search,
    ChevronDown,
    ChevronUp,
    FileText,
    CheckCircle2,
    Clock,
    AlertCircle,
    ArrowUpDown,
    X,
    TrendingUp,
    Users,
    Receipt,
} from "lucide-react";
import Link from "next/link";

interface ClienteConFacturas {
    id: string;
    nombre: string;
    rut: string | null;
    email: string | null;
    facturas: Factura[];
    totalFacturado: number;
    totalCobrado: number;
    totalPendiente: number;
    countPagadas: number;
    countPendientes: number;
    countParcial: number;
}

type SortKey = "nombre" | "totalFacturado" | "countTotal" | "totalPendiente";
type SortDir = "asc" | "desc";

// Tooltip component for individual invoice dots
function InvoiceTooltip({
    factura,
    position,
    onClose,
}: {
    factura: Factura;
    position: { x: number; y: number };
    onClose: () => void;
}) {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [adjustedPos, setAdjustedPos] = useState(position);

    useEffect(() => {
        if (tooltipRef.current) {
            const rect = tooltipRef.current.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            let newX = position.x;
            let newY = position.y;

            if (rect.right > vw - 16) newX = vw - rect.width - 16;
            if (rect.bottom > vh - 16) newY = position.y - rect.height - 12;
            if (newX < 16) newX = 16;
            if (newY < 16) newY = 16;

            setAdjustedPos({ x: newX, y: newY });
        }
    }, [position]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [onClose]);

    const estadoConfig = {
        pagado: { label: "Pagada", color: "text-cobrado", bg: "bg-cobrado/10", icon: CheckCircle2 },
        pendiente: { label: "Pendiente", color: "text-pendiente", bg: "bg-pendiente/10", icon: Clock },
        parcial: { label: "Parcial", color: "text-blue-400", bg: "bg-blue-500/10", icon: AlertCircle },
    };

    const config = estadoConfig[factura.estado];
    const Icon = config.icon;

    return (
        <div
            ref={tooltipRef}
            style={{ left: adjustedPos.x, top: adjustedPos.y }}
            className="fixed z-[100] bg-surface border border-border rounded-xl shadow-2xl shadow-black/40 p-4 min-w-[260px] max-w-[320px] animate-fade-in"
        >
            <button
                onClick={onClose}
                className="absolute top-2 right-2 p-1 text-muted hover:text-text transition-colors rounded-md hover:bg-surface2"
            >
                <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-start gap-3 mb-3">
                <div className={classNames("p-2 rounded-lg", config.bg)}>
                    <Icon className={classNames("w-4 h-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted">#{factura.numero}</span>
                        <span className={classNames("text-[10px] font-medium px-1.5 py-0.5 rounded-full", config.bg, config.color)}>
                            {config.label}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-text mt-0.5 truncate">{factura.cliente}</p>
                </div>
            </div>

            <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1.5 border-t border-border/50">
                    <span className="text-muted">Monto</span>
                    <span className="font-mono font-medium text-text">{formatCurrency(factura.monto)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted">Emisión</span>
                    <span className="text-text">{formatDate(factura.fecha_emision)}</span>
                </div>
                {factura.fecha_pago && (
                    <div className="flex justify-between items-center">
                        <span className="text-muted">Fecha Pago</span>
                        <span className="text-cobrado">{formatDate(factura.fecha_pago)}</span>
                    </div>
                )}
                {factura.descripcion && (
                    <div className="pt-2 border-t border-border/50">
                        <span className="text-muted block mb-1">Descripción</span>
                        <p className="text-text leading-relaxed">{factura.descripcion}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Single invoice dot
function InvoiceDot({ factura, onShowTooltip }: { factura: Factura; onShowTooltip: (f: Factura, e: React.MouseEvent) => void }) {
    const colorMap = {
        pagado: "bg-cobrado hover:bg-cobrado/80 shadow-cobrado/20",
        pendiente: "bg-pendiente hover:bg-pendiente/80 shadow-pendiente/20",
        parcial: "bg-blue-400 hover:bg-blue-400/80 shadow-blue-400/20",
    };

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onShowTooltip(factura, e);
            }}
            className={classNames(
                "w-3.5 h-3.5 rounded-full transition-all duration-200 shadow-sm hover:scale-150 hover:shadow-md cursor-pointer",
                colorMap[factura.estado]
            )}
            title={`#${factura.numero} - ${formatCurrency(factura.monto)}`}
        />
    );
}

// Client row component
function ClienteRow({
    cliente,
    isExpanded,
    onToggle,
    onShowTooltip,
}: {
    cliente: ClienteConFacturas;
    isExpanded: boolean;
    onToggle: () => void;
    onShowTooltip: (f: Factura, e: React.MouseEvent) => void;
}) {
    const countTotal = cliente.facturas.length;
    const pctPagadas = countTotal > 0 ? (cliente.countPagadas / countTotal) * 100 : 0;

    // Group facturas by description for the expanded detail view
    const facturasByDesc = cliente.facturas.reduce((acc, f) => {
        const key = f.descripcion || "Sin descripción";
        if (!acc[key]) acc[key] = [];
        acc[key].push(f);
        return acc;
    }, {} as Record<string, Factura[]>);

    return (
        <div className="group">
            <div
                onClick={onToggle}
                className={classNames(
                    "flex items-center gap-4 px-4 sm:px-6 py-5 cursor-pointer transition-all duration-200",
                    isExpanded ? "bg-surface2/70" : "hover:bg-surface2/40"
                )}
            >
                {/* Left: Client info */}
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-accent font-display text-base sm:text-lg font-bold">
                        {cliente.nombre.charAt(0).toUpperCase()}
                    </span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base sm:text-lg font-semibold text-text truncate">{cliente.nombre}</h3>
                        {cliente.rut && (
                            <span className="text-xs text-muted font-mono hidden sm:inline">{cliente.rut}</span>
                        )}
                    </div>

                    {/* Invoice dots row */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {cliente.facturas.slice(0, 30).map((f) => (
                            <InvoiceDot key={f.id} factura={f} onShowTooltip={onShowTooltip} />
                        ))}
                        {cliente.facturas.length > 30 && (
                            <span className="text-xs text-muted ml-1">+{cliente.facturas.length - 30} más</span>
                        )}
                    </div>
                </div>

                {/* Right: Stats summary */}
                <div className="flex-shrink-0 flex items-center gap-3 sm:gap-6">
                    {/* Mini progress bar */}
                    <div className="hidden sm:flex flex-col items-end gap-1.5 min-w-[120px]">
                        <div className="flex items-center gap-2 text-xs text-muted">
                            <span className="text-cobrado font-medium">{cliente.countPagadas} pagadas</span>
                            <span>·</span>
                            <span className="text-pendiente font-medium">{cliente.countPendientes} pend.</span>
                        </div>
                        <div className="w-full h-2 bg-surface2 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-cobrado to-cobrado/70 rounded-full transition-all duration-500"
                                style={{ width: `${pctPagadas}%` }}
                            />
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right min-w-[90px] sm:min-w-[110px]">
                        <p className="text-sm sm:text-base font-mono font-medium text-text">{formatCurrency(cliente.totalFacturado)}</p>
                        {cliente.totalPendiente > 0 && (
                            <p className="text-xs sm:text-sm font-mono text-pendiente">
                                −{formatCurrency(cliente.totalPendiente)}
                            </p>
                        )}
                    </div>

                    {/* Expand icon */}
                    <div className="text-muted">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
                <div className="bg-surface2/30 border-t border-border/50 px-4 sm:px-6 py-4 animate-fade-in">
                    <div className="flex flex-wrap gap-3 mb-4">
                        <div className="flex items-center gap-1.5 text-xs">
                            <div className="w-2.5 h-2.5 rounded-full bg-cobrado" />
                            <span className="text-muted">Pagadas:</span>
                            <span className="font-mono text-text">{cliente.countPagadas}</span>
                            <span className="text-cobrado font-mono">({formatCurrency(cliente.totalCobrado)})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <div className="w-2.5 h-2.5 rounded-full bg-pendiente" />
                            <span className="text-muted">Pendientes:</span>
                            <span className="font-mono text-text">{cliente.countPendientes}</span>
                            <span className="text-pendiente font-mono">({formatCurrency(cliente.totalPendiente)})</span>
                        </div>
                        {cliente.countParcial > 0 && (
                            <div className="flex items-center gap-1.5 text-xs">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                                <span className="text-muted">Parcial:</span>
                                <span className="font-mono text-text">{cliente.countParcial}</span>
                            </div>
                        )}
                    </div>

                    {/* Facturas grouped by description */}
                    <div className="space-y-3">
                        {Object.entries(facturasByDesc).map(([desc, facturas]) => (
                            <div key={desc} className="bg-surface/60 rounded-lg border border-border/40 p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                                    <span className="text-xs font-medium text-text truncate">{desc}</span>
                                    <span className="text-[10px] text-muted bg-surface2 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                        {facturas.length} {facturas.length === 1 ? "factura" : "facturas"}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {facturas.map((f) => {
                                        const estadoConfig = {
                                            pagado: { bg: "border-cobrado/30 bg-cobrado/5", text: "text-cobrado", label: "Pagada" },
                                            pendiente: { bg: "border-pendiente/30 bg-pendiente/5", text: "text-pendiente", label: "Pendiente" },
                                            parcial: { bg: "border-blue-400/30 bg-blue-500/5", text: "text-blue-400", label: "Parcial" },
                                        };
                                        const cfg = estadoConfig[f.estado];
                                        return (
                                            <div
                                                key={f.id}
                                                className={classNames(
                                                    "flex items-center justify-between px-3 py-2 rounded-md border transition-colors",
                                                    cfg.bg
                                                )}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-[10px] font-mono text-muted">#{f.numero}</span>
                                                    <span className={classNames("text-[10px] font-medium", cfg.text)}>{cfg.label}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-muted">{formatDate(f.fecha_emision)}</span>
                                                    <span className="text-xs font-mono text-text">{formatCurrency(f.monto)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 flex justify-end">
                        <Link
                            href={`/facturas?cliente=${encodeURIComponent(cliente.nombre)}`}
                            className="text-xs text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
                        >
                            Ver todas las facturas de este cliente →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MapaPage() {
    const [clientesConFacturas, setClientesConFacturas] = useState<ClienteConFacturas[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("totalPendiente");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [expandedClienteId, setExpandedClienteId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<"todos" | "con_pendientes" | "al_dia">("todos");

    // Month navigation
    const [currentDate, setCurrentDate] = useState(new Date());
    const handlePrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));

    // Tooltip state
    const [tooltipFactura, setTooltipFactura] = useState<Factura | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    const handleShowTooltip = useCallback((f: Factura, e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
        setTooltipFactura(f);
    }, []);

    const handleCloseTooltip = useCallback(() => {
        setTooltipFactura(null);
    }, []);

    const loadData = async () => {
        setLoading(true);

        // Fetch all clients
        const { data: clientsData, error: clientsError } = await supabase
            .from("clientes")
            .select("*")
            .order("nombre");

        if (clientsError || !clientsData) {
            console.error(clientsError);
            setLoading(false);
            return;
        }

        // Fetch facturas filtered by selected month
        const monthStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
        const monthEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");

        const { data: facturasData, error: facturasError } = await supabase
            .from("facturas")
            .select("*")
            .gte("fecha_emision", monthStart)
            .lte("fecha_emision", monthEnd)
            .order("fecha_emision", { ascending: false });

        if (facturasError || !facturasData) {
            console.error(facturasError);
            setLoading(false);
            return;
        }

        // Group facturas per client name (normalized)
        const facturasByClient = new Map<string, Factura[]>();
        facturasData.forEach((f) => {
            const key = f.cliente.trim().toUpperCase();
            if (!facturasByClient.has(key)) facturasByClient.set(key, []);
            facturasByClient.get(key)!.push(f);
        });

        // Build enriched clients
        const enriched: ClienteConFacturas[] = clientsData.map((c) => {
            const key = c.nombre.trim().toUpperCase();
            const facturas = facturasByClient.get(key) || [];
            const pagadas = facturas.filter((f) => f.estado === "pagado");
            const pendientes = facturas.filter((f) => f.estado === "pendiente");
            const parciales = facturas.filter((f) => f.estado === "parcial");

            return {
                id: c.id,
                nombre: c.nombre,
                rut: c.rut,
                email: c.email,
                facturas,
                totalFacturado: facturas.reduce((s, f) => s + f.monto, 0),
                totalCobrado: pagadas.reduce((s, f) => s + f.monto, 0),
                totalPendiente: [...pendientes, ...parciales].reduce((s, f) => s + f.monto, 0),
                countPagadas: pagadas.length,
                countPendientes: pendientes.length,
                countParcial: parciales.length,
            };
        });

        // Only include clients that have at least 1 factura in this month
        setClientesConFacturas(enriched.filter((c) => c.facturas.length > 0));
        setLoading(false);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDate]);

    // Filter and sort
    const filtered = clientesConFacturas
        .filter((c) => {
            const matchesSearch =
                c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.rut && c.rut.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesFilter =
                filterStatus === "todos" ||
                (filterStatus === "con_pendientes" && c.countPendientes + c.countParcial > 0) ||
                (filterStatus === "al_dia" && c.countPendientes + c.countParcial === 0);

            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            let valA: number | string, valB: number | string;
            switch (sortKey) {
                case "nombre":
                    valA = a.nombre.toLowerCase();
                    valB = b.nombre.toLowerCase();
                    break;
                case "totalFacturado":
                    valA = a.totalFacturado;
                    valB = b.totalFacturado;
                    break;
                case "countTotal":
                    valA = a.facturas.length;
                    valB = b.facturas.length;
                    break;
                case "totalPendiente":
                    valA = a.totalPendiente;
                    valB = b.totalPendiente;
                    break;
                default:
                    return 0;
            }
            if (valA < valB) return sortDir === "asc" ? -1 : 1;
            if (valA > valB) return sortDir === "asc" ? 1 : -1;
            return 0;
        });

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    // Global KPIs
    const totalClientes = filtered.length;
    const totalFacturas = filtered.reduce((s, c) => s + c.facturas.length, 0);
    const totalPendientes = filtered.reduce((s, c) => s + c.countPendientes + c.countParcial, 0);
    const totalMontoPendiente = filtered.reduce((s, c) => s + c.totalPendiente, 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg text-text pb-24 md:pb-8">
            <Header
                currentDate={currentDate}
                onExport={() => {}}
                isExporting={false}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
                {/* Page Title */}
                <div className="mb-6">
                    <h2 className="text-2xl font-display text-accent mb-1">Mapa de Facturación</h2>
                    <p className="text-muted text-sm">
                        Clientes y facturas de <span className="text-text font-medium capitalize">{format(currentDate, "MMMM yyyy", { locale: es })}</span>. Cada punto representa una factura.
                    </p>
                </div>

                {/* KPI Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10">
                            <Users className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-muted uppercase tracking-wider">Clientes</p>
                            <p className="text-xl sm:text-2xl font-mono text-text">{totalClientes}</p>
                        </div>
                    </div>
                    <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-cobrado/10">
                            <Receipt className="w-5 h-5 text-cobrado" />
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-muted uppercase tracking-wider">Facturas</p>
                            <p className="text-xl sm:text-2xl font-mono text-text">{totalFacturas}</p>
                        </div>
                    </div>
                    <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-pendiente/10">
                            <Clock className="w-5 h-5 text-pendiente" />
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-muted uppercase tracking-wider">Pendientes</p>
                            <p className="text-xl sm:text-2xl font-mono text-text">{totalPendientes}</p>
                        </div>
                    </div>
                    <div className="bg-surface border border-border rounded-xl p-4 relative overflow-hidden flex items-center gap-3">
                        <div className="absolute top-0 right-0 w-1 h-full bg-pendiente" />
                        <div className="p-2 rounded-lg bg-pendiente/10">
                            <TrendingUp className="w-5 h-5 text-pendiente" />
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-muted uppercase tracking-wider">Deuda Total</p>
                            <p className="text-xl sm:text-2xl font-mono text-text">{formatCurrency(totalMontoPendiente)}</p>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mb-4 px-1">
                    <span className="text-xs text-muted">Leyenda:</span>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-cobrado" />
                        <span className="text-xs text-muted">Pagada</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-pendiente" />
                        <span className="text-xs text-muted">Pendiente</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-blue-400" />
                        <span className="text-xs text-muted">Parcial</span>
                    </div>
                    <span className="text-[10px] text-muted/60 ml-2 hidden sm:inline">
                        Haz clic en cualquier punto para ver los detalles de la factura
                    </span>
                </div>

                {/* Controls: Search, Filter, Sort */}
                <div className="bg-surface border border-border rounded-xl shadow-sm mb-1">
                    <div className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        {/* Search */}
                        <div className="relative w-full sm:max-w-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-muted" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-border rounded-md shadow-sm bg-surface2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent w-full"
                            />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Filter pills */}
                            {(["todos", "con_pendientes", "al_dia"] as const).map((f) => {
                                const labels = {
                                    todos: "Todos",
                                    con_pendientes: "Con Deuda",
                                    al_dia: "Al Día",
                                };
                                return (
                                    <button
                                        key={f}
                                        onClick={() => setFilterStatus(f)}
                                        className={classNames(
                                            filterStatus === f
                                                ? "bg-accent text-black border-accent"
                                                : "bg-surface2 text-muted border-transparent hover:text-text",
                                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                                        )}
                                    >
                                        {labels[f]}
                                    </button>
                                );
                            })}

                            {/* Sort buttons */}
                            <div className="h-5 w-px bg-border mx-1 hidden sm:block" />
                            {([
                                { key: "nombre" as SortKey, label: "Nombre" },
                                { key: "totalFacturado" as SortKey, label: "Total" },
                                { key: "countTotal" as SortKey, label: "N° Fact." },
                                { key: "totalPendiente" as SortKey, label: "Deuda" },
                            ]).map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => toggleSort(key)}
                                    className={classNames(
                                        sortKey === key ? "text-accent" : "text-muted hover:text-text",
                                        "flex items-center gap-1 text-[10px] sm:text-xs transition-colors"
                                    )}
                                >
                                    <ArrowUpDown className="w-3 h-3" />
                                    <span className="hidden sm:inline">{label}</span>
                                    {sortKey === key && (
                                        <span className="text-accent text-[9px]">{sortDir === "asc" ? "↑" : "↓"}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Client list */}
                    <div className="divide-y divide-border/50">
                        {filtered.length > 0 ? (
                            filtered.map((cliente) => (
                                <ClienteRow
                                    key={cliente.id}
                                    cliente={cliente}
                                    isExpanded={expandedClienteId === cliente.id}
                                    onToggle={() =>
                                        setExpandedClienteId((prev) => (prev === cliente.id ? null : cliente.id))
                                    }
                                    onShowTooltip={handleShowTooltip}
                                />
                            ))
                        ) : (
                            <div className="px-6 py-16 text-center">
                                <Receipt className="w-10 h-10 text-muted/30 mx-auto mb-3" />
                                <p className="text-sm text-muted">
                                    No se encontraron facturas para <span className="capitalize">{format(currentDate, "MMMM yyyy", { locale: es })}</span>.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Global tooltip portal */}
            {tooltipFactura && (
                <InvoiceTooltip factura={tooltipFactura} position={tooltipPosition} onClose={handleCloseTooltip} />
            )}
        </div>
    );
}
