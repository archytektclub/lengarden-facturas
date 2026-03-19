"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";

interface AuthContextType {
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    loading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const fetchSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            setSession(session);
            setLoading(false);
        };

        fetchSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!loading) {
            if (!session && pathname !== "/login") {
                router.push("/login");
            } else if (session && pathname === "/login") {
                router.push("/");
            }
        }
    }, [session, loading, pathname, router]);

    const signOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
            </div>
        );
    }

    // Si no está autenticado y no está en login, no renderizar hijos (prevenir flash)
    if (!session && pathname !== "/login") {
        return null;
    }

    return (
        <AuthContext.Provider value={{ session, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
