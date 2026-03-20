"use client";

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { logoutUser } from '@/app/actions';

export default function DashboardLayout({ children, sessionData }: { children: React.ReactNode, sessionData: any }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            sessionStorage.clear();
        }
        startTransition(async () => {
            await logoutUser();
            router.push("/login");
            router.refresh();
        });
    };

    const toggleSidebar = () => {
        setSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="flex relative h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
            <Sidebar
                isOpen={isSidebarOpen}
                setOpen={setSidebarOpen}
                role={sessionData?.role || 'AGENT'}
                onLogout={handleLogout}
            />

            <div className={`flex-1 flex flex-col h-screen overflow-hidden w-full transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-[270px]' : 'lg:ml-[80px]'}`}>
                <Topbar
                    toggleSidebar={toggleSidebar}
                    userName={sessionData?.name || 'Usuario'}
                    role={sessionData?.role || 'AGENT'}
                    onLogout={handleLogout}
                />

                <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
