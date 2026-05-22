"use client";

import React, { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function CuentasPendientesManager({ dueSales, role }: { dueSales: any[], role: string }) {
    const [searchTerm, setSearchTerm] = useState('');

    const formatCurrency = (amount: number) => {
        const hasDecimals = amount % 1 !== 0;
        return new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: 'COP', 
            minimumFractionDigits: hasDecimals ? 2 : 0, 
            maximumFractionDigits: hasDecimals ? 2 : 0 
        }).format(amount);
    };

    const filteredSales = dueSales.filter(sale => {
        const clientName = sale.client?.name || sale.clientName || '';
        const invoiceNum = sale.invoiceNumber || '';
        const serviceName = sale.service?.name || sale.serviceName || '';
        const searchLower = searchTerm.toLowerCase();

        return clientName.toLowerCase().includes(searchLower) ||
               invoiceNum.toLowerCase().includes(searchLower) ||
               serviceName.toLowerCase().includes(searchLower);
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, servicio o factura..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900 outline-none transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm overflow-hidden mt-4">
                <div className="p-4 border-b border-amber-100 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 flex items-center">
                    <AlertCircle className="text-amber-500 mr-2" size={20} />
                    <h3 className="font-bold text-amber-800 dark:text-amber-400 text-lg">Cuentas de Cobro Pendientes ({filteredSales.length})</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Factura / Vence</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Cliente</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Servicio</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Total Venta</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Deuda</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-sm text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">No hay cuentas pendientes con ese filtro.</td></tr>
                            ) : filteredSales.map((sale: any) => {
                                const debt = sale.salePrice - sale.amountPaid;
                                const dateLabel = sale.paymentDeadline ? new Date(sale.paymentDeadline).toLocaleDateString() : 'Sin Fecha';
                                return (
                                    <tr key={sale.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <td className="p-4">
                                            {sale.invoiceNumber ? (
                                                <div className="font-bold text-indigo-600 dark:text-indigo-400 mb-1">{sale.invoiceNumber}</div>
                                            ) : (
                                                <div className="text-xs text-slate-400 mb-1">Sin Factura</div>
                                            )}
                                            <span className="text-[10px] bg-amber-200 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded shadow-sm font-bold uppercase">
                                                Vence: {dateLabel}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-medium text-slate-800 dark:text-slate-200">
                                                {sale.client?.name || sale.clientName}
                                            </p>
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-400 text-sm">
                                            {sale.service?.name || sale.serviceName}
                                        </td>
                                        <td className="p-4 font-medium text-slate-600 dark:text-slate-400">
                                            {formatCurrency(sale.salePrice)}
                                        </td>
                                        <td className="p-4 font-bold text-rose-600 dark:text-rose-400">
                                            {formatCurrency(debt)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <Link href={`/ventas`} className="inline-flex items-center text-sm bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-lg transition-colors font-medium border border-indigo-200 dark:border-indigo-800">
                                                Ir a Ventas
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
