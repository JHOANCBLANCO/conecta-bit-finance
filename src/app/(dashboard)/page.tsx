"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getDashboardMetrics, getUpcomingBillings, getExpiringPackagesAlert } from "@/app/actions";
import {
    DollarSign,
    Users,
    Wallet,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    Calendar,
    History
} from 'lucide-react';
import ExpiringAlertModal from "@/components/ExpiringAlertModal";

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<any>(null);
    const [dueSales, setDueSales] = useState<any[]>([]);
    const [upcomingPackages, setUpcomingPackages] = useState<any[]>([]);
    const [expiringAlerts, setExpiringAlerts] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'MONTH' | 'HISTORY'>('MONTH');
    
    // Historical dates
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            // 1. Ejecutar el motor de paquetes (esto podría también ir en un cron, pero aquí nos aseguramos que corra al menos al abrir el dashboard)
            const { processMonthlyPackages } = await import('@/app/actions');
            await processMonthlyPackages();

            // 2. Obtener datos para la vista y las alertas
            const [{ dueSales, upcomingPackages }, alerts] = await Promise.all([
                getUpcomingBillings(),
                getExpiringPackagesAlert()
            ]);
            
            setDueSales(dueSales);
            setUpcomingPackages(upcomingPackages);
            setExpiringAlerts(alerts);

            let fetchStart: Date | undefined;
            let fetchEnd: Date | undefined;

            if (activeTab === 'MONTH') {
                const now = new Date();
                fetchStart = new Date(now.getFullYear(), now.getMonth(), 1);
                fetchEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            } else if (activeTab === 'HISTORY' && startDate && endDate) {
                fetchStart = new Date(startDate);
                fetchStart.setHours(0, 0, 0, 0);
                
                fetchEnd = new Date(endDate);
                fetchEnd.setHours(23, 59, 59, 999);
            }

            const data = await getDashboardMetrics(fetchStart, fetchEnd);
            setMetrics(data);
        } catch (error) {
            console.error(error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [activeTab]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <ExpiringAlertModal expiringPackages={expiringAlerts} />
            
            {(dueSales.length > 0 || upcomingPackages.length > 0) && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm mb-6 animate-in slide-in-from-top-4 flex flex-col md:flex-row gap-6">
                    
                    {dueSales.length > 0 && (
                        <div className="flex-1">
                            <div className="flex items-start">
                                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                <div className="ml-3 w-full">
                                    <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">Cuentas de Cobro Pendientes ({dueSales.length})</h3>
                                    <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                                        <ul className="space-y-2">
                                            {dueSales.map((sale: any) => {
                                                const debt = sale.salePrice - sale.amountPaid;
                                                const dateLabel = sale.paymentDeadline ? new Date(sale.paymentDeadline).toLocaleDateString() : 'Sin Fecha';
                                                return (
                                                    <li key={sale.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-amber-200/50 dark:border-amber-700/50 gap-2">
                                                        <div className="font-medium text-slate-800 dark:text-slate-200">
                                                            {sale.client?.name || sale.clientName}
                                                            <span className="text-slate-500 dark:text-slate-400 text-xs ml-2 font-normal">({sale.service?.name || sale.serviceName})</span>
                                                        </div>
                                                        <div className="flex gap-3 items-center">
                                                            <span className="font-bold text-amber-700 dark:text-amber-400">Deuda: {formatCurrency(debt)}</span>
                                                            <span className="text-[10px] bg-amber-200 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-1 rounded shadow-sm font-bold uppercase whitespace-nowrap">
                                                                Vence: {dateLabel}
                                                            </span>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {upcomingPackages.length > 0 && (
                        <div className="flex-1">
                            <div className="flex items-start">
                                <Calendar className="h-5 w-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                                <div className="ml-3 w-full">
                                    <h3 className="text-sm font-bold text-indigo-800 dark:text-indigo-400">Próximos Paquetes a Generar ({upcomingPackages.length})</h3>
                                    <div className="mt-2 text-sm text-indigo-700 dark:text-indigo-300">
                                        <ul className="space-y-2">
                                            {upcomingPackages.map((pkg: any) => {
                                                const dateLabel = new Date(pkg.nextBillingDate).toLocaleDateString();
                                                return (
                                                    <li key={pkg.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-indigo-50/50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-indigo-200/50 dark:border-indigo-700/50 gap-2">
                                                        <div className="font-medium text-slate-800 dark:text-slate-200">
                                                            {pkg.client?.name}
                                                            <span className="text-indigo-500 dark:text-indigo-400 text-xs ml-2 font-bold">(Paquete Mensual)</span>
                                                        </div>
                                                        <div className="flex gap-3 items-center">
                                                            <span className="text-[10px] bg-indigo-200 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 px-2 py-1 rounded shadow-sm font-bold uppercase whitespace-nowrap">
                                                                Corte: {dateLabel}
                                                            </span>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-2 gap-4">
                <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('MONTH')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all ${activeTab === 'MONTH' ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
                    >
                        <Calendar className="w-4 h-4 mr-2" /> Mes Actual
                    </button>
                    <button
                        onClick={() => setActiveTab('HISTORY')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all ${activeTab === 'HISTORY' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
                    >
                        <History className="w-4 h-4 mr-2" /> Histórico
                    </button>
                </div>

                {metrics && (
                    <div className="text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full shadow-sm">
                        Rol activo: {metrics.role}
                    </div>
                )}
            </div>

            {activeTab === 'HISTORY' && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-end animate-in fade-in slide-in-from-top-2">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Desde</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 border p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hasta</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 border p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200" />
                    </div>
                    <button 
                        onClick={loadData}
                        disabled={!startDate || !endDate || isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        Filtrar Periodo
                    </button>
                </div>
            )}

            {isLoading ? (
                <div className="py-12 flex justify-center items-center opacity-50">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : metrics ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {metrics.role === 'ADMIN' && (
                            <>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                        <DollarSign size={64} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Facturado</p>
                                    <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(metrics.totalRevenue)}</h3>
                                    <div className="mt-4 flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                        <TrendingUp size={16} className="mr-1" />
                                        <span>En este periodo</span>
                                    </div>
                                </div>
                                
                                <Link href="/ventas?filter=paid">
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-500 hover:shadow-md transition-all h-full">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                            <Wallet size={64} className="text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Abonado</p>
                                        <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(metrics.totalCollected)}</h3>
                                        <div className="mt-4 flex items-center text-sm font-medium text-slate-600 dark:text-slate-400">
                                            <span>Recaudado en periodo &rarr; Ver detalles</span>
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/ventas?filter=debt">
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group cursor-pointer hover:border-rose-300 dark:hover:border-rose-500 hover:shadow-md transition-all h-full">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                            <TrendingDown size={64} className="text-rose-600 dark:text-rose-400" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Por Cobrar (Global)</p>
                                        <h3 className="text-3xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(metrics.totalPending)}</h3>
                                        <div className="mt-4 flex items-center text-sm font-medium text-slate-600 dark:text-slate-400">
                                            <span>Cartera activa total &rarr; Ver detalles</span>
                                        </div>
                                    </div>
                                </Link>
                            </>
                        )}

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <Users size={64} className="text-purple-600 dark:text-purple-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Clientes Activos</p>
                            <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{metrics.totalClients}</h3>
                            <div className="mt-4 flex items-center text-sm font-medium text-slate-600 dark:text-slate-400">
                                <span>En directorio global</span>
                            </div>
                        </div>
                    </div>

                    {metrics.role === 'ADMIN' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black p-6 rounded-xl border border-slate-700 dark:border-slate-800 shadow-lg text-white">
                                <p className="text-slate-400 font-medium mb-1">Ganancia Neta del Periodo</p>
                                <p className="text-xs text-slate-500 mb-4">(Abonos Periodo - Gastos Periodo)</p>
                                <h3 className="text-4xl font-bold text-emerald-400">{formatCurrency(metrics.netProfit)}</h3>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Gastos Operativos Periodo</p>
                                    <h3 className="text-3xl font-bold text-rose-500 dark:text-rose-400">{formatCurrency(metrics.totalExpenses)}</h3>
                                </div>
                                <div className="h-16 w-16 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center text-rose-500 dark:text-rose-400">
                                    <TrendingDown size={32} />
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
}
