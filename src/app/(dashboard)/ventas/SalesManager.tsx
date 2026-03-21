"use client";

import React, { useState, useTransition } from 'react';
import { Plus, CreditCard, AlertCircle, CheckCircle2, TrendingUp, X, Trash2, List, FileText, UploadCloud, FileDown, Calendar, History, Eye } from 'lucide-react';
import { addSale, addPayment, deleteSale, deletePayment, uploadInvoiceFile, deleteInvoiceFile, addPaymentMethod } from '@/app/actions';

export default function SalesManager({ initialSales, clients, services, paymentMethods: initialPaymentMethods, role, initialFilter }: { initialSales: any[], clients: any[], services: any[], paymentMethods: any[], role: string, initialFilter?: string }) {
    const [isPending, startTransition] = useTransition();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isPaymentsListModalOpen, setIsPaymentsListModalOpen] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState('');
    const [paymentMethods, setPaymentMethods] = useState(initialPaymentMethods || []);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [isCreatingPaymentMethod, setIsCreatingPaymentMethod] = useState(false);
    const [newPaymentMethodName, setNewPaymentMethodName] = useState('');
    
    // View Invoice Details State
    const [isInvoiceDetailsModalOpen, setIsInvoiceDetailsModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    const [activeTab, setActiveTab] = useState<'MONTH' | 'HISTORY'>(initialFilter ? 'HISTORY' : 'MONTH');
    const [activeFilter, setActiveFilter] = useState(initialFilter || '');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const handleAction = (actionFn: () => Promise<any>, onSuccess?: () => void) => {
        startTransition(async () => {
            try {
                await actionFn();
                if (onSuccess) onSuccess();
            } catch (e: any) {
                alert(e.message || "Error al realizar la acción");
            }
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
    };

    const getSaleStatus = (salePrice: number, amountPaid: number) => {
        if (amountPaid === 0) return { label: 'Pendiente', color: 'bg-rose-100 text-rose-700', icon: <AlertCircle size={16} className="mr-1" /> };
        if (amountPaid >= salePrice) return { label: 'Pagado', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={16} className="mr-1" /> };
        return { label: 'Abono Parcial', color: 'bg-amber-100 text-amber-700', icon: <TrendingUp size={16} className="mr-1" /> };
    };

    const filteredSales = initialSales.filter(sale => {
        const saleDate = new Date(sale.date);
        const paymentDates = sale.payments ? sale.payments.map((p: any) => new Date(p.date)) : [];
        
        let start: Date;
        let end: Date;
        let passDateFilter = true;

        if (activeTab === 'MONTH') {
            const now = new Date();
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            passDateFilter = saleDate >= start && saleDate <= end || paymentDates.some((pd: Date) => pd >= start && pd <= end);
        } else {
            if (startDate || endDate) {
                start = startDate ? new Date(startDate + 'T00:00:00') : new Date(0);
                end = endDate ? new Date(endDate + 'T23:59:59') : new Date('2100-01-01');
                passDateFilter = saleDate >= start && saleDate <= end || paymentDates.some((pd: Date) => pd >= start && pd <= end);
            } else {
                passDateFilter = true;
            }
        }
        
        if (!passDateFilter && !activeFilter) return false; // Bypass dates if allowed by filter ONLY if dates match, wait... NO, if filter matched, date MUST pass unless it's history without dates. So if !passDateFilter, return false directly!
        if (!passDateFilter) return false;
        
        if (activeFilter === 'paid' && sale.amountPaid < sale.salePrice) return false;
        if (activeFilter === 'debt' && sale.amountPaid >= sale.salePrice) return false;

        return true; 
    });

    const handleTabChange = (tab: 'MONTH' | 'HISTORY') => {
        setActiveTab(tab);
        setActiveFilter('');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-2 gap-4">
                <div className="inline-flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
                    <button
                        onClick={() => handleTabChange('MONTH')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all ${activeTab === 'MONTH' ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                        <Calendar className="w-4 h-4 mr-2" /> Mes Actual
                    </button>
                    <button
                        onClick={() => handleTabChange('HISTORY')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all ${activeTab === 'HISTORY' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                        <History className="w-4 h-4 mr-2" /> Histórico
                    </button>
                    {activeFilter && (
                        <div className="ml-2 flex items-center px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold shrink-0">
                            {activeFilter === 'paid' ? 'Filtrando: Cobrados' : 'Filtrando: Por Cobrar'}
                        </div>
                    )}
                </div>
            </div>

            {activeTab === 'HISTORY' && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end animate-in fade-in slide-in-from-top-2">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border-slate-300 border p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border-slate-300 border p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Fecha/Ciclo</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Cliente</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Servicio Vendido</th>
                                {role === 'ADMIN' && (
                                    <>
                                        <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Precio Venta</th>
                                        <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Abonado</th>
                                        <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Deuda</th>
                                    </>
                                )}
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Estado</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Fecha Pago</th>
                                <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-sm text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className={isPending ? 'opacity-50 pointer-events-none' : ''}>
                            {filteredSales.length === 0 ? (
                                <tr><td colSpan={9} className="p-8 text-center text-slate-500 dark:text-slate-400">No hay facturas o deudas registradas en este periodo.</td></tr>
                            ) : filteredSales.map((sale: any) => {
                                // Lógica de Respaldo Histórico (Snapshot)
                                const clientName = sale.client?.name || sale.clientName;
                                const isClientDeleted = !sale.client && sale.clientName;

                                const serviceName = sale.service?.name || sale.serviceName;
                                const isServiceDeleted = !sale.service && sale.serviceName;

                                const debt = sale.salePrice - sale.amountPaid;
                                const status = getSaleStatus(sale.salePrice, sale.amountPaid);
                                const isDebt = debt > 0;

                                return (
                                    <tr key={sale.id} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${!isDebt && 'bg-slate-50/50 dark:bg-slate-900/50 opacity-80'}`}>
                                        <td className="p-4">
                                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{new Date(sale.date).toLocaleDateString()}</p>
                                            <span className="text-[10px] font-bold mt-1 inline-block uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">Instancia</span>
                                            {sale.paymentDeadline && (
                                                <div className="mt-1 text-xs font-semibold text-rose-500 dark:text-rose-400">
                                                    Vence: {new Date(sale.paymentDeadline).toLocaleDateString()}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <p className={`font-medium ${isClientDeleted ? 'text-slate-500 dark:text-slate-400 italic' : 'text-slate-800 dark:text-slate-200'}`}>
                                                {clientName}
                                            </p>
                                            {isClientDeleted && <span className="text-[10px] text-rose-500 dark:text-rose-400 font-semibold">(Borrado)</span>}
                                        </td>
                                        <td className="p-4">
                                            <p className={`font-medium ${isServiceDeleted ? 'text-slate-500 dark:text-slate-400 italic' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {serviceName}
                                            </p>
                                            {isServiceDeleted && <span className="text-[10px] text-rose-500 font-semibold">(Borrado)</span>}
                                            {sale.notes && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 max-w-[150px] truncate" title={sale.notes}>{sale.notes}</p>}
                                        </td>
                                        {role === 'ADMIN' && (
                                            <>
                                                <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{formatCurrency(sale.salePrice)}</td>
                                                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(sale.amountPaid)}</td>
                                                <td className="p-4 text-rose-600 dark:text-rose-400 font-medium">{formatCurrency(debt)}</td>
                                            </>
                                        )}
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                {status.icon}
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                                            {sale.payments && sale.payments.length > 0 ? (
                                                <>
                                                    {new Date(Math.max(...sale.payments.map((p: any) => new Date(p.date).getTime()))).toLocaleDateString()}
                                                    <span className="block text-[10px] text-slate-400 mt-0.5">{sale.payments.length} {sale.payments.length === 1 ? 'abono' : 'abonos'}</span>
                                                </>
                                            ) : '-'}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {/* Botón de Abonar visible para AGENT y ADMIN */}
                                                {isDebt ? (
                                                    <button
                                                        onClick={() => { setSelectedSale(sale); setPaymentDate(new Date().toISOString().split('T')[0]); setIsPaymentModalOpen(true); }}
                                                        className="inline-flex items-center text-sm bg-slate-100 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg transition-colors font-medium border border-blue-200"
                                                        title="Hacer un abono"
                                                    >
                                                        <CreditCard size={14} className="mr-1.5" /> Abonar
                                                    </button>
                                                ) : <span className="text-xs text-slate-400 font-medium px-3 py-1.5">Cancelado</span>}

                                                {/* Botón de Ver Detalles */}
                                                <button
                                                    onClick={() => { setSelectedInvoice(sale); setIsInvoiceDetailsModalOpen(true); }}
                                                    className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800"
                                                    title="Ver Detalles"
                                                >
                                                    <Eye size={18} />
                                                </button>

                                                {/* Botón de Ver/Subir Documento (visible para ambos) */}
                                                <button
                                                    onClick={() => { setSelectedSale(sale); setIsInvoiceModalOpen(true); }}
                                                    className={`p-2 rounded-lg transition-colors ${sale.invoiceFileUrl ? 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}
                                                    title={sale.invoiceFileUrl ? "Ver Factura Subida" : "Subir Factura"}
                                                >
                                                    <FileText size={18} />
                                                </button>

                                                {role === 'ADMIN' && (
                                                    <>
                                                        {sale.payments && sale.payments.length > 0 && (
                                                            <button
                                                                onClick={() => { setSelectedSale(sale); setIsPaymentsListModalOpen(true); }}
                                                                className="text-amber-600 hover:text-amber-800 p-2 hover:bg-amber-50 rounded-lg transition-colors"
                                                                title="Ver/Eliminar Abonos"
                                                            >
                                                                <List size={18} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm("¿Seguro que deseas eliminar esta venta por completo? Esto eliminará también los abonos asociados.")) {
                                                                    handleAction(() => deleteSale(sale.id));
                                                                }
                                                            }}
                                                            className="text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Eliminar Venta Completa"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL REGISTRAR ABONO */}
            {isPaymentModalOpen && selectedSale && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Registrar Pago</h3>
                            <button onClick={() => { setIsPaymentModalOpen(false); setSelectedSale(null); setPaymentAmount(''); setPaymentDate(''); setPaymentMethod(''); setIsCreatingPaymentMethod(false); setNewPaymentMethodName(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-6 border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-500 dark:text-slate-400 text-sm">Cliente:</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{selectedSale.client?.name}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-500 dark:text-slate-400 text-sm">Total Venta:</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(selectedSale.salePrice)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 dark:text-slate-400 text-sm">Deuda Actual:</span>
                                <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(selectedSale.salePrice - selectedSale.amountPaid)}</span>
                            </div>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            handleAction(
                                () => addPayment(selectedSale.id, Number(paymentAmount), paymentDate ? new Date(paymentDate + 'T12:00:00') : undefined, paymentMethod),
                                () => { setIsPaymentModalOpen(false); setSelectedSale(null); setPaymentAmount(''); setPaymentDate(''); setPaymentMethod(''); setIsCreatingPaymentMethod(false); setNewPaymentMethodName(''); }
                            );
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Ingreso de Pago</label>
                                <input
                                    required
                                    type="date"
                                    value={paymentDate}
                                    defaultValue={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 border p-3 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 outline-none text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-800"
                                    disabled={isPending}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monto a Abonar</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-slate-500 dark:text-slate-400 font-medium">$</span>
                                    </div>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        max={selectedSale.salePrice - selectedSale.amountPaid}
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        className="w-full pl-8 rounded-lg border-slate-300 dark:border-slate-700 border p-3 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 outline-none font-medium text-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                                        placeholder="0"
                                        disabled={isPending}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">El abono no puede superar la deuda actual.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Medio de Pago</label>
                                <div className="flex gap-2">
                                    <select 
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="flex-1 rounded-lg border-slate-300 dark:border-slate-700 border p-3 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 outline-none text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-800"
                                        disabled={isPending}
                                    >
                                        <option value="">No especificado</option>
                                        {paymentMethods.map((pm: any) => (
                                            <option key={pm.id} value={pm.name}>{pm.name}</option>
                                        ))}
                                    </select>
                                    {role === 'ADMIN' && (
                                        <button type="button" onClick={() => setIsCreatingPaymentMethod(true)} className="px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors flex items-center shrink-0">
                                            <Plus size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* SMALL INLINE CREATION IF ADMIN WANTS */}
                            {isCreatingPaymentMethod && role === 'ADMIN' && (
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 p-3 rounded-xl flex gap-2 animate-in slide-in-from-top-2">
                                    <input 
                                        type="text" 
                                        placeholder="Ej. Nequi, Daviplata..." 
                                        value={newPaymentMethodName}
                                        onChange={(e) => setNewPaymentMethodName(e.target.value)}
                                        className="flex-1 text-sm rounded-lg border-indigo-200 dark:border-indigo-800 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                                        disabled={isPending}
                                    />
                                    <button 
                                        type="button" 
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                                        disabled={isPending || !newPaymentMethodName.trim()}
                                        onClick={() => {
                                            handleAction(() => addPaymentMethod(newPaymentMethodName.trim()).then(pm => {
                                                setPaymentMethods([...paymentMethods, pm]);
                                                setPaymentMethod(pm.name);
                                            }), () => {
                                                setIsCreatingPaymentMethod(false);
                                                setNewPaymentMethodName('');
                                            });
                                        }}
                                    >
                                        Guardar
                                    </button>
                                    <button 
                                        type="button" 
                                        className="text-slate-400 hover:text-rose-500 p-2 focus:outline-none"
                                        onClick={() => { setIsCreatingPaymentMethod(false); setNewPaymentMethodName(''); }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => { setIsPaymentModalOpen(false); setSelectedSale(null); setPaymentAmount(''); setPaymentDate(''); }} className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" disabled={isPending}>Cancelar</button>
                                <button type="submit" disabled={!paymentAmount || Number(paymentAmount) <= 0 || isPending} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 disabled:opacity-50">Confirmar Abono</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL LISTA DE ABONOS (SÓLO ADMIN) */}
            {isPaymentsListModalOpen && selectedSale && role === 'ADMIN' && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Historial de Abonos</h3>
                                <p className="text-sm text-slate-500">Venta de {selectedSale.service?.name || selectedSale.serviceName} a {selectedSale.client?.name || selectedSale.clientName}</p>
                            </div>
                            <button onClick={() => { setIsPaymentsListModalOpen(false); setSelectedSale(null); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-md mb-auto"><X size={24} /></button>
                        </div>

                        <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="p-3 font-semibold text-slate-600 text-sm">Fecha</th>
                                        <th className="p-3 font-semibold text-slate-600 text-sm">Monto Abonado</th>
                                        <th className="p-3 font-semibold text-slate-600 text-sm text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(!selectedSale.payments || selectedSale.payments.length === 0) ? (
                                        <tr><td colSpan={3} className="p-4 text-center text-slate-500">No hay abonos registrados para esta venta.</td></tr>
                                    ) : selectedSale.payments.map((payment: any) => (
                                        <tr key={payment.id} className="border-t border-slate-100">
                                            <td className="p-3 text-sm text-slate-600">{new Date(payment.date).toLocaleString()}</td>
                                            <td className="p-3 font-medium text-emerald-600">
                                                {formatCurrency(payment.amount)}
                                                {payment.method && <span className="block text-[10px] text-slate-400 font-normal uppercase mt-0.5">{payment.method}</span>}
                                            </td>
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm("¿Seguro que deseas eliminar este abono? La deuda volverá a incrementarse automáticamente.")) {
                                                            handleAction(
                                                                () => deletePayment(payment.id, selectedSale.id),
                                                                () => setIsPaymentsListModalOpen(false) // Cerrarlo para forzar update
                                                            );
                                                        }
                                                    }}
                                                    className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded transition-colors"
                                                    title="Eliminar Abono"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL GESTIÓN DE FACTURA (ARCHIVO) */}
            {isInvoiceModalOpen && selectedSale && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Documento de Factura</h3>
                            <button onClick={() => { setIsInvoiceModalOpen(false); setSelectedSale(null); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-md"><X size={24} /></button>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100">
                            <p className="text-sm font-medium text-slate-800">Venta de {selectedSale.service?.name || selectedSale.serviceName}</p>
                            <p className="text-xs text-slate-500 mt-1">Cliente: {selectedSale.client?.name || selectedSale.clientName}</p>
                            {selectedSale.invoiceNumber && <p className="text-xs font-bold text-indigo-600 mt-2">Nº Manual: {selectedSale.invoiceNumber}</p>}
                        </div>

                        {selectedSale.invoiceFileUrl ? (
                            <div className="space-y-4">
                                <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-emerald-600 mb-3 border border-emerald-100">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <h4 className="font-bold text-emerald-800 mb-1">¡Documento Guardado!</h4>
                                    <p className="text-xs text-emerald-600/80 mb-4">La factura se encuentra almacenada en el sistema.</p>
                                    
                                    <a href={selectedSale.invoiceFileUrl} target="_blank" rel="noopener noreferrer" className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center justify-center w-full transition-colors shadow-sm">
                                        <FileDown size={18} className="mr-2" /> Ver o Descargar Documento
                                    </a>
                                </div>
                                {role === 'ADMIN' && (
                                    <div className="pt-2 border-t border-slate-100">
                                        <button 
                                            onClick={() => {
                                                if(window.confirm("¿Seguro que deseas eliminar este archivo de factura? No se podrá recuperar.")) {
                                                    handleAction(
                                                        () => deleteInvoiceFile(selectedSale.id, selectedSale.invoiceFileUrl),
                                                        () => { setIsInvoiceModalOpen(false); setSelectedSale(null); }
                                                    );
                                                }
                                            }}
                                            disabled={isPending}
                                            className="w-full text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                                        >
                                            <Trash2 size={16} className="mr-2" /> Eliminar Archivo
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <form action={(formData) => {
                                handleAction(
                                    () => uploadInvoiceFile(selectedSale.id, formData),
                                    () => { setIsInvoiceModalOpen(false); setSelectedSale(null); }
                                );
                            }}>
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50 hover:bg-slate-100 transition-colors relative group">
                                    <UploadCloud size={32} className="mx-auto text-blue-500 mb-3" />
                                    <p className="text-sm font-medium text-slate-700 mb-1">Haz clic para buscar el archivo</p>
                                    <p className="text-xs text-slate-500">Puedes subir PDF, JPG, PNG.</p>
                                    <input 
                                        type="file" 
                                        name="file" 
                                        required 
                                        accept=".pdf,image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                        disabled={isPending}
                                    />
                                </div>
                                <div className="mt-6 flex gap-3">
                                    <button type="button" onClick={() => { setIsInvoiceModalOpen(false); setSelectedSale(null); }} className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors disabled:opacity-50" disabled={isPending}>Cancelar</button>
                                    <button type="submit" disabled={isPending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center justify-center transition-colors shadow-sm disabled:opacity-50">
                                        Subir Documento
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {isInvoiceDetailsModalOpen && selectedInvoice && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[80]">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Detalles de Factura</h3>
                                <p className="text-sm text-slate-500 font-medium">#{selectedInvoice.invoiceNumber || 'S/N'}</p>
                            </div>
                            <button onClick={() => { setIsInvoiceDetailsModalOpen(false); setSelectedInvoice(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1">Cliente</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedInvoice.client?.name || selectedInvoice.clientName}</p>
                                    <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                                        <p>{selectedInvoice.client?.phone && <span className="font-medium">Tel:</span>} {selectedInvoice.client?.phone}</p>
                                        <p>{selectedInvoice.client?.nit && <span className="font-medium">NIT/CC:</span>} {selectedInvoice.client?.nit}</p>
                                        <p>{selectedInvoice.client?.contact && <span className="font-medium">Contacto:</span>} {selectedInvoice.client?.contact}</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1">Información</p>
                                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 mt-2">
                                        <div className="flex justify-between"><span className="font-medium">Fecha Emisión:</span> <span>{new Date(selectedInvoice.date).toLocaleDateString()}</span></div>
                                        {selectedInvoice.paymentDeadline && <div className="flex justify-between"><span className="font-medium">Vencimiento:</span> <span>{new Date(selectedInvoice.paymentDeadline).toLocaleDateString()}</span></div>}
                                        {selectedInvoice.cycleStartDate && <div className="flex justify-between"><span className="font-medium">Inicio Ciclo:</span> <span>{new Date(selectedInvoice.cycleStartDate).toLocaleDateString()}</span></div>}
                                        {selectedInvoice.cycleEndDate && <div className="flex justify-between"><span className="font-medium">Fin Ciclo:</span> <span>{new Date(selectedInvoice.cycleEndDate).toLocaleDateString()}</span></div>}
                                        <div className="flex justify-between"><span className="font-medium">Estado:</span> 
                                            <span className={`font-bold ${selectedInvoice.salePrice - selectedInvoice.amountPaid <= 0 ? 'text-emerald-600' : selectedInvoice.amountPaid > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                {selectedInvoice.salePrice - selectedInvoice.amountPaid <= 0 ? 'Pagado' : selectedInvoice.amountPaid > 0 ? 'Abono Parcial' : 'Pendiente'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Conceptos Facturados</h4>
                                </div>
                                <div className="p-4 bg-white dark:bg-slate-900">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">{selectedInvoice.serviceName || selectedInvoice.service?.name}</p>
                                    {selectedInvoice.notes && (
                                        <div className="mb-4 text-xs text-slate-500 italic bg-amber-50 dark:bg-amber-900/10 p-2.5 rounded border border-amber-100 dark:border-amber-800">
                                            <strong>Nota:</strong> {selectedInvoice.notes}
                                        </div>
                                    )}
                                    
                                    {(() => {
                                        let tIva = 0;
                                        let tReteIva = 0;
                                        let tBase = selectedInvoice.salePrice;
                                        
                                        if (selectedInvoice.hasIva && selectedInvoice.hasReteIva) {
                                            tBase = selectedInvoice.salePrice / 1.1615;
                                            tIva = tBase * 0.19;
                                            tReteIva = tIva * 0.15;
                                        } else if (selectedInvoice.hasIva) {
                                            tBase = selectedInvoice.salePrice / 1.19;
                                            tIva = tBase * 0.19;
                                        }

                                        return (
                                            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                                                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                                    <span>Subtotal (Base)</span>
                                                    <span>{formatCurrency(tBase)}</span>
                                                </div>
                                                {selectedInvoice.hasIva && (
                                                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                                        <span>IVA (19%)</span>
                                                        <span>{formatCurrency(tIva)}</span>
                                                    </div>
                                                )}
                                                {selectedInvoice.hasReteIva && (
                                                    <div className="flex justify-between text-sm text-rose-600 dark:text-rose-400">
                                                        <span>ReteIVA (15%)</span>
                                                        <span>-{formatCurrency(tReteIva)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                                                    <span>Total Factura</span>
                                                    <span>{formatCurrency(selectedInvoice.salePrice)}</span>
                                                </div>
                                                {selectedInvoice.amountPaid > 0 && (
                                                    <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                                        <span>Total Pagado</span>
                                                        <span>{formatCurrency(selectedInvoice.amountPaid)}</span>
                                                    </div>
                                                )}
                                                {selectedInvoice.salePrice - selectedInvoice.amountPaid > 0 && (
                                                    <div className="flex justify-between font-bold text-rose-600 dark:text-rose-400 mt-1">
                                                        <span>Saldo Pendiente</span>
                                                        <span>{formatCurrency(selectedInvoice.salePrice - selectedInvoice.amountPaid)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button onClick={() => { setIsInvoiceDetailsModalOpen(false); setSelectedInvoice(null); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg font-medium transition-colors">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
