"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, History, Users, Map } from "lucide-react";
import { classNames } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Facturas", href: "/facturas", icon: FileText },
    { name: "Mapa", href: "/mapa", icon: Map },
    { name: "Historial", href: "/historial", icon: History },
    { name: "Clientes", href: "/clientes", icon: Users },
];

export default function Navigation() {
    const pathname = usePathname();

    // Ocultar en login
    if (pathname === "/login") return null;

    return (
        <>
            {/* Sidebar para Desktop/Tablet */}
            <div className="hidden md:flex md:w-64 md:flex-col md:inset-y-0 fixed bg-surface border-r border-border">
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center h-16 flex-shrink-0 px-6 bg-surface">
                        {/* Logo se maneja en el Header por defecto, pero podemos ponerlo aquí también */}
                        <span className="text-2xl font-display font-bold text-accent tracking-tighter">
                            LENGARDEN
                        </span>
                    </div>
                    <div className="flex-1 flex flex-col overflow-y-auto">
                        <nav className="flex-1 px-4 py-6 space-y-2">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={classNames(
                                            isActive
                                                ? "bg-surface2 text-accent"
                                                : "text-muted hover:bg-surface2/50 hover:text-text",
                                            "group flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors"
                                        )}
                                    >
                                        <item.icon
                                            className={classNames(
                                                isActive ? "text-accent" : "text-muted group-hover:text-text",
                                                "mr-4 flex-shrink-0 h-5 w-5 transition-colors"
                                            )}
                                            aria-hidden="true"
                                        />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </div>

            {/* Tabs inferiores para Móvil */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border pb-safe">
                <div className="flex justify-around">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={classNames(
                                    isActive ? "text-accent" : "text-muted",
                                    "flex flex-col items-center justify-center w-full py-3 hover:bg-surface2/50 transition-colors"
                                )}
                            >
                                <item.icon className="h-6 w-6 mb-1" aria-hidden="true" />
                                <span className="text-[10px] font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
