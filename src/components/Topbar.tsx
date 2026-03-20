"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
    Menu, LogOut, LayoutGrid, Users, Briefcase,
    BadgeDollarSign, Wallet, UserCog, Building2, BarChart3,
    PhoneCall, Activity, Droplets, CreditCard
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Topbar({
    toggleSidebar,
    userName,
    role,
    onLogout
}: {
    toggleSidebar: () => void,
    userName: string,
    role: string,
    onLogout: () => void
}) {
    const initials = userName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'US';
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    // Close logic when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const closeMenu = () => setDropdownOpen(false);

    const getNavClass = (path: string) => {
        const isActive = pathname === path;
        return isActive
            ? "flex items-center space-x-3 w-full px-3 py-2 text-[14px] bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold transition-colors"
            : "flex items-center space-x-3 w-full px-3 py-2 text-[14px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-medium";
    };

    const getPageTitle = (path: string) => {
        if (path === '/') return 'Resumen de Negocio';
        if (path.startsWith('/clientes')) return 'Gestión Clientes';
        if (path.startsWith('/servicios')) return 'Catálogo de Servicios';
        if (path.startsWith('/ventas')) return 'Cartera de Cobros';
        if (path.startsWith('/gastos')) return 'Gastos Operativos';
        if (path.startsWith('/usuarios')) return 'Usuarios';
        return '';
    };

    const sectionTitleClass = "text-[10px] font-extrabold text-[#8292a8] tracking-wider mb-1 mt-3 ml-3 uppercase";

    return (
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-6 transition-colors">
            <div className="flex items-center">
                <button
                    onClick={toggleSidebar}
                    className="lg:hidden p-2 -ml-2 mr-2 md:mr-4 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <Menu size={24} strokeWidth={2} />
                </button>
                <div className="hidden sm:block lg:hidden border-l border-slate-200 dark:border-slate-700 h-8 mr-4" />
                <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight truncate">
                    {getPageTitle(pathname)}
                </h1>
            </div>

            <div className="flex items-center space-x-1" ref={dropdownRef}>
                <div
                    className="flex items-center cursor-pointer select-none hidden sm:flex space-x-3 mr-1"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                    <div className="flex flex-col items-end justify-center">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{userName}</p>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full mt-0.5 tracking-wider uppercase">
                            {role === 'ADMIN' ? 'Admin' : 'Agente'}
                        </span>
                    </div>
                </div>

                <div className="relative z-50">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className={`h-10 w-10 flex items-center justify-center rounded-full font-bold text-white transition-all ${dropdownOpen ? 'ring-4 ring-blue-100 bg-blue-700' : 'bg-blue-600 hover:bg-blue-700 ring-4 ring-transparent hover:ring-blue-50'}`}
                    >
                        {initials}
                    </button>

                    {dropdownOpen && (
                        <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 animate-in slide-in-from-top-2 fade-in duration-200 z-[100] max-h-[85vh] overflow-y-auto scrollbar-hide">
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 sm:hidden">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{userName}</p>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 uppercase">{role}</p>
                            </div>

                            {/* Enlaces de Navegación integrados en el Dropdown de Topbar */}
                            <div className="py-1">
                                <Link href="/" className={getNavClass('/')} onClick={closeMenu}>
                                    <LayoutGrid size={16} strokeWidth={2} />
                                    <span>Ir a Inicio</span>
                                </Link>
                                <Link href="/clientes" className={getNavClass('/clientes')} onClick={closeMenu}>
                                    <Users size={16} strokeWidth={2} />
                                    <span>Gestión Clientes</span>
                                </Link>
                                <Link href="/servicios" className={getNavClass('/servicios')} onClick={closeMenu}>
                                    <Briefcase size={16} strokeWidth={2} />
                                    <span>Mis Servicios</span>
                                </Link>
                                <Link href="/ventas" className={getNavClass('/ventas')} onClick={closeMenu}>
                                    <BadgeDollarSign size={16} strokeWidth={2} />
                                    <span>Cartera de Cobros</span>
                                </Link>
                                <Link href="/gastos" className={getNavClass('/gastos')} onClick={closeMenu}>
                                    <Wallet size={16} strokeWidth={2} />
                                    <span>Gastos Operativos</span>
                                </Link>

                                {role === 'ADMIN' && (
                                    <>
                                        <div className={sectionTitleClass}>Módulos</div>
                                        <Link href="/usuarios" className={getNavClass('/usuarios')} onClick={closeMenu}>
                                            <UserCog size={16} strokeWidth={2} />
                                            <span>Usuarios</span>
                                        </Link>
                                    </>
                                )}
                            </div>

                            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>

                            <div className="px-2 py-1 relative z-[101]">
                                <button
                                    onClick={() => { setDropdownOpen(false); onLogout(); }}
                                    className="w-full flex items-center space-x-3 px-3 py-2 text-[14px] font-semibold text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors text-left"
                                >
                                    <LogOut size={16} strokeWidth={2} className="text-rose-600" />
                                    <span>Cerrar Sesión</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
