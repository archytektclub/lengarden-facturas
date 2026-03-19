"use client";

import React, { useEffect, useState, useRef } from "react";
import Header from "@/components/Header";
import { Factura } from "@/types";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate, classNames } from "@/lib/utils";
import { Search, Filter, Upload, Plus, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import PaymentModal from "@/components/PaymentModal";
import NuevaFacturaModal from "@/components/NuevaFacturaModal";
import ConfirmModal from "@/components/ConfirmModal";
import { Trash2, RotateCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Suspense } from "react";

type FilterStatus = "todos" | "pendiente" | "pagado" | "parcial";

function FacturasPageContent() {
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [loading, setLoading] = useState(true);

    // Controls
    const searchParams = useSearchParams();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<FilterStatus>("todos");

    // Excel Import
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importMessage, setImportMessage] = useState<{ type: "success" | "error" | "info", text: string } | null>(null);

    // Modals
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isNuevaFacturaModalOpen, setIsNuevaFacturaModalOpen] = useState(false);
    const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        isDanger: boolean;
        onConfirm: () => void;
    }>({ isOpen: false, title: "", message: "", isDanger: false, onConfirm: () => { } });

    // Bulk Actions
    const [selectedFacturas, setSelectedFacturas] = useState<string[]>([]);

    // Expandable Rows for Mobile
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const loadFacturas = async () => {
        setLoading(true);
        // Simple fetch without date range (the user requested simple filters, searching client/num)
        // For pagination/optimization a month range should be used, but PDF says "Buscador: cliente, N° factura, RUT. Filtro: Todos / Pendiente..."
        // We fetch all for demo simplicity, in a real env it should be paginated
        const { data, error } = await supabase
            .from("facturas")
            .select("*")
            .order("fecha_emision", { ascending: false });

        if (!error && data) {
            setFacturas(data);

            // If routed from Clientes with ?cliente=X
            const queryClient = searchParams.get("cliente");
            if (queryClient) {
                setSearchTerm(queryClient);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        loadFacturas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    const filteredFacturas = facturas.filter((f) => {
        // 1. Filter by term
        const matchesSearch =
            f.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (f.rut_cliente && f.rut_cliente.toLowerCase().includes(searchTerm.toLowerCase()));

        // 2. Filter by status
        const matchesStatus = statusFilter === "todos" || f.estado === statusFilter;

        // 3. Filter by selected month
        // If there's an active search term from URL, ignore month check to show ALL history of client
        const urlClient = searchParams.get("cliente");
        let matchesMonth = true;

        if (!urlClient) {
            const facturaDate = new Date(f.fecha_emision);
            matchesMonth =
                facturaDate.getMonth() === currentDate.getMonth() &&
                facturaDate.getFullYear() === currentDate.getFullYear();
        }

        return matchesSearch && matchesStatus && matchesMonth;
    });


    const handleExportPDF = () => {
        const doc = new jsPDF();

        // 1. Add Header & Logo replacement / Title
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text("Reporte de Facturación", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generado: ${format(new Date(), "dd 'de' MMM, yyyy - HH:mm", { locale: es })}`, 14, 30);

        // Context Info (Active filters)
        let filterText = `Filtro de Estado: ${statusFilter !== 'todos' ? statusFilter.toUpperCase() : 'TODOS'}`;
        if (searchTerm) filterText += ` | Búsqueda: "${searchTerm}"`;
        doc.text(filterText, 14, 36);

        // 2. Prepare Table Data
        const tableColumn = ["N°", "Cliente", "Descripción", "Emisión", "Estado", "Monto"];
        const tableRows: any[] = [];

        let totalMonto = 0;
        let totalCobrado = 0;
        let totalPendiente = 0;

        filteredFacturas.forEach(f => {
            totalMonto += f.monto;
            if (f.estado === "pagado") totalCobrado += f.monto;
            else totalPendiente += f.monto;

            // Remove the shortDesc limitation to allow autoTable to handle line wrapping
            const desc = f.descripcion || "-";

            const rowData = [
                f.numero,
                f.cliente,
                desc,
                format(new Date(f.fecha_emision), "dd/MMM/yy", { locale: es }),
                f.estado.toUpperCase(),
                formatCurrency(f.monto)
            ];
            tableRows.push(rowData);
        });

        // 3. Render Table
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 3,
                overflow: 'linebreak'
            },
            headStyles: { fillColor: [44, 62, 80], textColor: 255, fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 20 },      // N°
                1: { cellWidth: 40 },      // Cliente
                2: { cellWidth: 'auto' },  // Descripción (Auto expand and wrap)
                3: { cellWidth: 25 },      // Emisión
                4: { cellWidth: 25, fontStyle: 'bold' }, // Estado
                5: { cellWidth: 30, halign: 'right' },   // Monto
            },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            didParseCell: function (data) {
                // Colorize Status
                if (data.section === 'body' && data.column.index === 4) {
                    if (data.cell.raw === 'PAGADO') data.cell.styles.textColor = [39, 174, 96]; // Green
                    if (data.cell.raw === 'PENDIENTE') data.cell.styles.textColor = [230, 126, 34]; // Orange
                }
            }
        });

        // 4. Add Summary Box at the bottom
        const finalY = (doc as any).lastAutoTable.finalY || 45;

        // Add a line separator
        doc.setDrawColor(200, 200, 200);
        doc.line(14, finalY + 10, 196, finalY + 10);

        // Summary content
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        doc.text("Resumen de esta vista:", 14, finalY + 18);

        doc.setFontSize(10);
        doc.text(`Total Facturas: ${filteredFacturas.length}`, 14, finalY + 26);
        doc.text(`Monto Total: ${formatCurrency(totalMonto)}`, 14, finalY + 32);

        doc.setTextColor(39, 174, 96); // Green
        doc.text(`Total Cobrado: ${formatCurrency(totalCobrado)}`, 80, finalY + 26);

        doc.setTextColor(230, 126, 34); // Orange
        doc.text(`Total Pendiente: ${formatCurrency(totalPendiente)}`, 80, finalY + 32);

        // 5. Save PDF
        doc.save(`Facturas_Lengarden_${format(new Date(), "yyyyMMdd")}.pdf`);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedFacturas(filteredFacturas.map(f => f.id));
        } else {
            setSelectedFacturas([]);
        }
    };

    const handleSelectOne = (id: string) => {
        setSelectedFacturas(prev =>
            prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        setConfirmConfig({
            isOpen: true,
            title: "Eliminar Facturas",
            message: `¿Estás seguro de eliminar las ${selectedFacturas.length} facturas seleccionadas? Esta acción no se puede deshacer.`,
            isDanger: true,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                let hasError = false;
                await Promise.all(selectedFacturas.map(async (id) => {
                    const { error } = await supabase.from("facturas").delete().eq("id", id);
                    if (error) hasError = true;
                }));

                if (hasError) {
                    showToast("error", "Hubo un error al eliminar algunas facturas.");
                } else {
                    showToast("success", `${selectedFacturas.length} facturas eliminadas.`);
                    setSelectedFacturas([]);
                    loadFacturas();
                }
            }
        });
    };

    const handleBulkPay = () => {
        setConfirmConfig({
            isOpen: true,
            title: "Marcar Pagadas",
            message: `¿Estás seguro de marcar como PAGADAS las ${selectedFacturas.length} facturas seleccionadas?`,
            isDanger: false,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                const today = new Date().toISOString().split("T")[0];

                let hasError = false;
                await Promise.all(selectedFacturas.map(async (id) => {
                    const { error } = await supabase.from("facturas").update({ estado: "pagado", fecha_pago: today }).eq("id", id);
                    if (error) hasError = true;
                }));

                if (hasError) {
                    showToast("error", "Hubo un error al actualizar algunas facturas.");
                } else {
                    showToast("success", `${selectedFacturas.length} facturas marcadas como pagadas.`);
                    setSelectedFacturas([]);
                    loadFacturas();
                }
            }
        });
    };

    const handleBulkPending = () => {
        setConfirmConfig({
            isOpen: true,
            title: "Deshacer Pago (Marcar Pendientes)",
            message: `¿Estás seguro de marcar como PENDIENTES las ${selectedFacturas.length} facturas seleccionadas? Su fecha de pago será removida.`,
            isDanger: true,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));

                let hasError = false;
                await Promise.all(selectedFacturas.map(async (id) => {
                    const { error } = await supabase.from("facturas").update({ estado: "pendiente", fecha_pago: null }).eq("id", id);
                    if (error) hasError = true;
                }));

                if (hasError) {
                    showToast("error", "Hubo un error al actualizar algunas facturas.");
                } else {
                    showToast("success", `${selectedFacturas.length} facturas marcadas como pendientes.`);
                    setSelectedFacturas([]);
                    loadFacturas();
                }
            }
        });
    };

    const handlePayClick = (factura: Factura) => {
        setSelectedFactura(factura);
        setIsPaymentModalOpen(true);
    };

    const showToast = (type: "success" | "error" | "info", text: string) => {
        setImportMessage({ type, text });
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setImportMessage(null), 5000);
    };

    const toggleRow = (id: string, e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        // Don't expand if hitting the checkbox or a button
        if (target.closest('input') || target.closest('button')) return;
        setExpandedRowId(prev => prev === id ? null : id);
    };

    const handleDelete = (id: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Eliminar Factura",
            message: "¿Estás seguro de que deseas eliminar esta factura? Esta acción no se puede deshacer.",
            isDanger: true,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                const { error } = await supabase.from("facturas").delete().eq("id", id);
                if (error) {
                    showToast("error", "Error al eliminar la factura.");
                } else {
                    showToast("success", "Factura eliminada correctamente.");
                    loadFacturas();
                }
            }
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportMessage({ type: "info", text: "Procesando Excel..." });

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

            // 1. Fetch existing clients to prevent duplicates
            const { data: existingClients } = await supabase.from("clientes").select("nombre");
            const existingClientNames = new Set((existingClients || []).map(c => c.nombre.trim().toLowerCase()));

            let count = 0;
            let totalAmount = 0;

            for (const row of jsonData) {
                // Parse columns more robustly handling different spaces and casing
                const num = row["N°"] || row["N"] || row["Numero"] || row["N° Factura"] || row["Nro"];
                const cliente = row["Cliente"] || row["Nombre Cliente"] || row["Comunidad"];
                const rut = row["RUT"] || row["Rut Cliente"] || row["Rut"];
                const montoraw = row["Monto"] || row["Total"] || row["Monto Neto"] || row["Total Factura"];
                const desc = row["Descripción"] || row["Detalle"] || row["Descripcion"] || Object.values(row).find(v => typeof v === 'string' && v.toLowerCase().includes('detalle') || typeof v === 'string' && v.toLowerCase().includes('mes')) || "";
                const fecha = row["Fecha"] || row["Fecha Emision"] || row["Fecha Emisión"] || row["Date"];

                if (!num || !cliente || montoraw === undefined) continue;

                // Clean monto (could be text '44.708' or number 44708)
                let montoNum = 0;
                if (typeof montoraw === "string") {
                    montoNum = parseInt(montoraw.replace(/\./g, "").replace(/,/g, "").replace(/\$/g, "").trim());
                } else if (typeof montoraw === "number") {
                    montoNum = montoraw;
                }

                // Prepare proper ISO date
                let fechaStr = new Date().toISOString().split("T")[0]; // default today
                if (fecha) {
                    if (typeof fecha === "number") {
                        const d = new Date(Math.round((fecha - 25569) * 86400 * 1000));
                        fechaStr = d.toISOString().split("T")[0];
                    } else if (typeof fecha === "string") {
                        const parts = fecha.includes("-") ? fecha.split("-") : fecha.split("/");
                        if (parts.length === 3) {
                            // Assumes DD/MM/YYYY or DD-MM-YYYY
                            fechaStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                        } else {
                            // If Date parse fails gracefully fallback to today
                            try {
                                const parsed = new Date(fecha);
                                if (!isNaN(parsed.getTime())) {
                                    fechaStr = parsed.toISOString().split("T")[0];
                                }
                            } catch (e) { }
                        }
                    }
                }

                const insertData = {
                    numero: String(num),
                    cliente: String(cliente).trim(),
                    rut_cliente: rut ? String(rut).trim() : null,
                    monto: montoNum,
                    fecha_emision: fechaStr,
                    descripcion: desc ? String(desc).trim() : null,
                    estado: "pendiente"
                };

                const { error } = await supabase.from("facturas").insert([insertData]);

                // Save to clients silently ignoring if exist
                if (cliente) {
                    const normalizedClientName = String(cliente).trim().toLowerCase();
                    if (!existingClientNames.has(normalizedClientName)) {
                        await supabase.from("clientes").insert([{ nombre: String(cliente).trim(), rut: rut ? String(rut).trim() : null }]);
                        existingClientNames.add(normalizedClientName); // Add to the set so we don't duplicate it in the same run
                    }
                }

                if (!error) {
                    count++;
                    totalAmount += montoNum;
                }
            }

            showToast("success", `Se importaron ${count} facturas · Total ${formatCurrency(totalAmount)}`);
            loadFacturas();
        } catch (err) {
            console.error(err);
            showToast("error", "Error al procesar el archivo Excel.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
            setIsImporting(false);
        }
    };

    const handleExportMes = () => {
        // Basic export functionality
        const ws = XLSX.utils.json_to_sheet(filteredFacturas.map(f => ({
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
        XLSX.utils.book_append_sheet(wb, ws, "Facturas");
        XLSX.writeFile(wb, `Facturas_${format(currentDate, "MM_yyyy")}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-bg text-text pb-24 md:pb-8">
            <Header currentDate={currentDate} onExport={handleExportMes} isExporting={false} />

            {importMessage && (
                <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50">
                    <div className={classNames(
                        "px-4 py-3 rounded-lg shadow-lg border text-sm font-medium animate-fade-in",
                        importMessage.type === "success" ? "bg-surface border-cobrado text-cobrado" :
                            importMessage.type === "error" ? "bg-surface border-danger text-danger" :
                                "bg-surface border-accent text-accent"
                    )}>
                        {importMessage.text}
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className="flex items-center space-x-4 bg-surface p-1 rounded-lg border border-border">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-surface2 rounded-md transition-colors">
                            <ChevronLeft className="w-5 h-5 text-muted" />
                        </button>
                        <span className="text-sm font-medium px-2 min-w-[120px] text-center capitalize">
                            {format(currentDate, "MMMM yyyy", { locale: es })}
                        </span>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-surface2 rounded-md transition-colors">
                            <ChevronRight className="w-5 h-5 text-muted" />
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {selectedFacturas.length > 0 && (
                            <div className="flex items-center space-x-2 mr-2 border-r border-border pr-3">
                                <span className="text-sm text-muted hidden sm:inline">{selectedFacturas.length} seleccionadas</span>
                                <button
                                    onClick={handleBulkDelete}
                                    className="p-2 text-muted hover:text-danger bg-surface2 hover:bg-danger/10 rounded-md transition-colors"
                                    title="Eliminar seleccionadas"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleBulkPending}
                                    className="p-2 text-muted hover:text-pendiente bg-surface2 hover:bg-pendiente/10 rounded-md transition-colors"
                                    title="Deshacer pago (Marcar PENDIENTE)"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleBulkPay}
                                    className="px-3 py-2 text-sm font-medium text-cobrado bg-cobrado/10 hover:bg-cobrado/20 rounded-md transition-colors"
                                >
                                    Marcar Pagadas
                                </button>
                            </div>
                        )}
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <button
                            className="flex items-center space-x-2 px-3 py-2 bg-surface2 hover:bg-border text-text rounded-md border border-border transition-colors text-sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                        >
                            <Upload className="w-4 h-4" />
                            <span className="hidden sm:inline">Importar Excel</span>
                        </button>
                        <button
                            className="flex items-center space-x-2 px-3 py-2 bg-surface hover:bg-surface2 text-text rounded-md border border-border transition-colors text-sm"
                            onClick={handleExportPDF}
                            disabled={filteredFacturas.length === 0}
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Descargar PDF</span>
                        </button>
                        <button
                            onClick={() => setIsNuevaFacturaModalOpen(true)}
                            className="flex items-center space-x-2 px-3 py-2 bg-accent hover:bg-accent/90 text-black rounded-md transition-colors text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Nueva factura</span>
                        </button>
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full sm:max-w-xs">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-muted" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar cliente, N°, RUT..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-border rounded-md shadow-sm bg-surface2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent w-full"
                            />
                        </div>

                        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                            <Filter className="w-4 h-4 text-muted shrink-0" />
                            {(["todos", "pendiente", "pagado", "parcial"] as FilterStatus[]).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={classNames(
                                        statusFilter === status
                                            ? "bg-accent text-black border-accent"
                                            : "bg-surface2 text-muted border-transparent hover:text-text",
                                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize shrink-0"
                                    )}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-12 flex justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-border table-fixed">
                                <thead className="bg-surface2">
                                    <tr>
                                        <th scope="col" className="px-2 sm:px-4 py-2 text-left w-8 sm:w-12">
                                            <input
                                                type="checkbox"
                                                className="rounded border-border text-accent focus:ring-accent"
                                                checked={filteredFacturas.length > 0 && selectedFacturas.length === filteredFacturas.length}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider w-16 sm:w-20">Estado</th>
                                        <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider w-16 sm:w-20">Factura</th>
                                        <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider">Cliente</th>
                                        <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell w-32">Descripción</th>
                                        <th scope="col" className="px-2 sm:px-4 py-2 text-right text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider w-16 sm:w-24">Monto</th>
                                        <th scope="col" className="px-2 sm:px-4 py-2 text-right text-[10px] sm:text-xs font-medium text-muted uppercase tracking-wider sticky right-0 bg-surface2 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] border-l border-border w-16 sm:w-24">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-surface divide-y divide-border">
                                    {filteredFacturas.length > 0 ? (
                                        filteredFacturas.map((factura) => (
                                            <React.Fragment key={factura.id}>
                                                <tr className="hover:bg-surface2/50 transition-colors cursor-pointer" onClick={(e) => toggleRow(factura.id, e)}>
                                                    <td className="px-2 sm:px-4 py-2 whitespace-nowrap w-8 sm:w-12">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-border text-accent focus:ring-accent"
                                                            checked={selectedFacturas.includes(factura.id)}
                                                            onChange={() => handleSelectOne(factura.id)}
                                                        />
                                                    </td>
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
                                                    <td className="px-2 sm:px-4 py-2 text-right text-xs font-medium space-x-1 sm:space-x-2 sticky right-0 bg-surface shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] border-l border-border whitespace-nowrap">
                                                        {factura.estado !== "pagado" && (
                                                            <button
                                                                onClick={() => handlePayClick(factura)}
                                                                className="text-black bg-accent hover:bg-accent/90 px-2 sm:px-3 py-1 rounded-md transition-colors text-[10px] sm:text-xs"
                                                            >
                                                                Pagar
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(factura.id)}
                                                            className="text-muted hover:text-danger p-1 rounded-md transition-colors inline-block align-middle"
                                                            title="Eliminar factura"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                                {expandedRowId === factura.id && (
                                                    <tr className="bg-surface2/30 border-b border-border md:hidden animate-fade-in fade-in">
                                                        <td colSpan={7} className="px-3 py-3">
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
                                            <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted bg-surface/50">
                                                No se encontraron facturas para {format(currentDate, "MMMM yyyy", { locale: es })}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <PaymentModal
                    factura={selectedFactura}
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onSuccess={loadFacturas}
                />

                <ConfirmModal
                    {...confirmConfig}
                    onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                />

                <NuevaFacturaModal
                    isOpen={isNuevaFacturaModalOpen}
                    onClose={() => setIsNuevaFacturaModalOpen(false)}
                    onSuccess={loadFacturas}
                />
            </main>
        </div>
    );
}

export default function FacturasPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div></div>}>
            <FacturasPageContent />
        </Suspense>
    );
}
