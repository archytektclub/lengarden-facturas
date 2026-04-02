"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import KPICards from "@/components/KPICards";
import ProgressBar from "@/components/ProgressBar";
import BarChart from "@/components/BarChart";
import RecentInvoices from "@/components/RecentInvoices";
import PaymentModal from "@/components/PaymentModal";
import { Factura } from "@/types";
import { supabase } from "@/lib/supabase";
import { startOfMonth, endOfMonth, subMonths, addMonths, format, parseISO, parse } from "date-fns";
import { es } from "date-fns/locale";

export default function Dashboard() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadData = async () => {
    setLoading(true);

    // Fetch current month invoices
    const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
    const end = format(endOfMonth(currentDate), "yyyy-MM-dd");

    const { data: currentMonthData, error: currentError } = await supabase
      .from("facturas")
      .select("*")
      .gte("fecha_emision", start)
      .lte("fecha_emision", end)
      .order("fecha_emision", { ascending: false });

    if (currentError) {
      console.error("Error fetching current month data", currentError);
    } else {
      setFacturas(currentMonthData || []);
    }

    // Fetch 12 months data for chart
    const yearAgo = format(startOfMonth(subMonths(currentDate, 11)), "yyyy-MM-dd");
    const { data: yearData, error: yearError } = await supabase
      .from("facturas")
      .select("monto, estado, fecha_emision")
      .gte("fecha_emision", yearAgo);

    if (yearError) {
      console.error("Error fetching yearly data", yearError);
    } else if (yearData) {
      // Process data for chart
      const monthsMap = new Map();

      // Initialize last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(currentDate, i);
        const name = format(d, "MMM yy", { locale: es });
        monthsMap.set(name, { name, Facturado: 0, Cobrado: 0 });
      }

      yearData.forEach((f) => {
        const d = parseISO(f.fecha_emision);
        const name = format(d, "MMM yy", { locale: es });
        if (monthsMap.has(name)) {
          const entry = monthsMap.get(name);
          entry.Facturado += f.monto;
          if (f.estado === "pagado") {
            entry.Cobrado += f.monto;
          } else if (f.estado === "parcial") {
            // If we had partial payments tracked exactly this could be improved
            // For now we add a portion or just 0, sticking to the prompt: Cobrado = pagadas
          }
        }
      });

      setChartData(Array.from(monthsMap.values()));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  const handleBarClick = (monthStr: string) => {
    // monthStr comes as "Ene 25" e.g
    try {
      const parsedDate = parse(monthStr, "MMM yy", new Date(), { locale: es });
      if (!isNaN(parsedDate.getTime())) {
        setCurrentDate(parsedDate);
      }
    } catch (e) { console.error("Error parsing string from chart", e) }
  };

  const handleExport = () => {
    // To be implemented as an Excel export
    alert("Exportación a Excel en desarrollo...");
  };

  const handlePayClick = (factura: Factura) => {
    setSelectedFactura(factura);
    setIsModalOpen(true);
  };

  const currentMonthFacturado = facturas.reduce((sum, f) => sum + f.monto, 0);
  const currentMonthCobrado = facturas
    .filter((f) => f.estado === "pagado")
    .reduce((sum, f) => sum + f.monto, 0);
  const currentMonthPendiente = facturas
    .filter((f) => f.estado !== "pagado")
    .reduce((sum, f) => sum + f.monto, 0);
  const porcentajeCobrado = currentMonthFacturado > 0 ? (currentMonthCobrado / currentMonthFacturado) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text pb-24 md:pb-8">
      <Header
        currentDate={currentDate}
        onExport={handleExport}
        isExporting={false}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in fade-in">
        <KPICards
          totalFacturado={currentMonthFacturado}
          totalCobrado={currentMonthCobrado}
          totalPendiente={currentMonthPendiente}
          cantidadFacturas={facturas.length}
        />

        <ProgressBar porcentaje={porcentajeCobrado} />

        <BarChart
          data={chartData}
          onBarClick={handleBarClick}
        />

        <RecentInvoices
          facturas={facturas}
          onPayClick={handlePayClick}
        />

        <PaymentModal
          factura={selectedFactura}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadData}
        />
      </main>
    </div>
  );
}
