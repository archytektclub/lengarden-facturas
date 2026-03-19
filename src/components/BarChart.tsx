"use client";

import {
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface ChartData {
    name: string;
    Facturado: number;
    Cobrado: number;
}

interface BarChartProps {
    data: ChartData[];
    onBarClick?: (monthName: string) => void;
}

export default function BarChart({ data, onBarClick }: BarChartProps) {
    return (
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm mb-8">
            <h3 className="text-lg font-display text-text mb-4">Ingresos últimos 12 meses</h3>
            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                        data={data}
                        margin={{ top: 10, right: 10, left: 30, bottom: 20 }}
                        onClick={(state) => {
                            if (state && state.activeLabel && onBarClick) {
                                onBarClick(state.activeLabel as string);
                            }
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="var(--color-muted)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="var(--color-muted)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                        />
                        <Tooltip
                            cursor={{ fill: "var(--color-surface2)", opacity: 0.4 }}
                            contentStyle={{
                                backgroundColor: "var(--color-surface)",
                                borderColor: "var(--color-border)",
                                borderRadius: "8px",
                                color: "var(--color-text)",
                            }}
                            itemStyle={{ color: "var(--color-text)", fontWeight: 500 }}
                            formatter={(value: any) => [formatCurrency(Number(value)), ""]}
                        />
                        <Legend wrapperStyle={{ paddingTop: "20px" }} />
                        <Bar
                            dataKey="Facturado"
                            fill="var(--color-accent)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                        />
                        <Bar
                            dataKey="Cobrado"
                            fill="var(--color-cobrado)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                        />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
