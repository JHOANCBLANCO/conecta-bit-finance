"use client";

import React, { useTransition, useState } from 'react';
import { Plus, Trash2, Pencil, X, Upload, Eye, FileUp, Download, Calendar, History, Search, Building2, Copy, AlertCircle, TrendingUp } from 'lucide-react';
import { 
    addExpense, 
    deleteExpense, 
    updateExpense, 
    uploadExpenseReceipt, 
    deleteExpenseReceipt,
    addProvider,
    updateProvider,
    deleteProvider,
    addProviderService,
    updateProviderService,
    deleteProviderService,
    copyExpensesFromPreviousMonth
} from '@/app/actions';

export default function ExpenseManager({ 
    initialExpenses, 
    initialProviders = [], 
    role 
}: { 
    initialExpenses: any[], 
    initialProviders: any[], 
    role: string 
}) {
    const [isPending, startTransition] = useTransition();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<any>(null);
    const [isUploadingForExpenseId, setIsUploadingForExpenseId] = useState<number | null>(null);
    const uploadExpenseIdRef = React.useRef<number | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // States for ADD Modal
    const [expenseAmountAdd, setExpenseAmountAdd] = useState<number | ''>('');
    const [hasIvaAdd, setHasIvaAdd] = useState(false);
    const [expenseNameAdd, setExpenseNameAdd] = useState('');
    const [providerNameAdd, setProviderNameAdd] = useState('');
    const [descriptionAdd, setDescriptionAdd] = useState('');
    const [expenseDateAdd, setExpenseDateAdd] = useState(new Date().toISOString().split('T')[0]);

    // States for EDIT Modal
    const [expenseAmountEdit, setExpenseAmountEdit] = useState<number | ''>('');
    const [hasIvaEdit, setHasIvaEdit] = useState(false);
    const [expenseDateEdit, setExpenseDateEdit] = useState('');

    // States for Provider Management
    const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<any>(null);
    const [providerName, setProviderName] = useState('');
    const [providerNit, setProviderNit] = useState('');

    // States for Provider Service Management
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedProviderForService, setSelectedProviderForService] = useState<any>(null);
    const [serviceName, setServiceName] = useState('');
    const [serviceAmount, setServiceAmount] = useState<number | ''>('');
    const [serviceDescription, setServiceDescription] = useState('');
    const [serviceHasIva, setServiceHasIva] = useState(false);

    // States for pre-filling in Gasto Modal
    const [selectedProviderIdAdd, setSelectedProviderIdAdd] = useState<number | ''>('');
    const [selectedServiceIdAdd, setSelectedServiceIdAdd] = useState<number | ''>('');

    // States for Filtering
    const [activeTab, setActiveTab] = useState<'MONTH' | 'HISTORY' | 'PROVIDERS' | 'REPORTS'>('MONTH');
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Sub-tab states for each provider card
    const [providerSubTabs, setProviderSubTabs] = useState<{ [providerId: number]: 'SERVICES' | 'SPENDING' }>({});

    // States for Expense Detail Modal
    const [detailModal, setDetailModal] = useState<{ open: boolean; providerName: string; monthLabel: string; expenses: any[] }>({ open: false, providerName: '', monthLabel: '', expenses: [] });

    const getExpensesDetailForProviderInMonth = (providerName: string, year: number, month: number) => {
        return initialExpenses.filter(e => {
            if (!e.provider) return false;
            const eDate = new Date(e.date);
            return e.provider.trim().toUpperCase() === providerName.trim().toUpperCase()
                && eDate.getFullYear() === year
                && eDate.getMonth() === month;
        });
    };


    const filteredExpenses = initialExpenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        
        let start: Date;
        let end: Date;
        let passDateFilter = true;

        if (activeTab === 'MONTH') {
            const now = new Date();
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            passDateFilter = expenseDate >= start && expenseDate <= end;
        } else {
            if (startDate || endDate) {
                start = startDate ? new Date(startDate + 'T00:00:00') : new Date(0);
                end = endDate ? new Date(endDate + 'T23:59:59') : new Date('2100-01-01');
                passDateFilter = expenseDate >= start && expenseDate <= end;
            } else {
                passDateFilter = true;
            }
        }

        if (!passDateFilter) return false;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const conceptMatch = (expense.name || '').toLowerCase().includes(term);
            const providerMatch = (expense.provider || '').toLowerCase().includes(term);
            const descriptionMatch = (expense.description || '').toLowerCase().includes(term);
            if (!conceptMatch && !providerMatch && !descriptionMatch) return false;
        }

        return true;
    });

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
        const hasDecimals = amount % 1 !== 0;
        return new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: 'COP', 
            minimumFractionDigits: hasDecimals ? 2 : 0, 
            maximumFractionDigits: hasDecimals ? 2 : 0 
        }).format(amount);
    };

    const getMonthlyExpensesForProvider = (providerName: string) => {
        const matched = initialExpenses.filter(e => 
            e.provider && e.provider.trim().toUpperCase() === providerName.trim().toUpperCase()
        );
        const groups: { [key: string]: number } = {};
        matched.forEach(e => {
            const d = new Date(e.date);
            const year = d.getFullYear();
            const month = d.getMonth();
            const key = `${year}-${String(month + 1).padStart(2, '0')}`;
            groups[key] = (groups[key] || 0) + e.amount;
        });
        return Object.entries(groups)
            .map(([key, amount]) => {
                const [year, month] = key.split('-');
                const dateObj = new Date(Number(year), Number(month) - 1, 1);
                const monthName = dateObj.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
                return {
                    key,
                    monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                    amount
                };
            })
            .sort((a, b) => b.key.localeCompare(a.key));
    };

    const getExpensesByMonthAndProvider = () => {
        const dataMap: { [monthKey: string]: { [provider: string]: number } } = {};
        
        initialExpenses.forEach(expense => {
            const dateObj = new Date(expense.date);
            const year = dateObj.getFullYear();
            const month = dateObj.getMonth();
            const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
            
            const providerName = (expense.provider || 'Sin Proveedor').trim().toUpperCase();
            
            if (!dataMap[monthKey]) {
                dataMap[monthKey] = {};
            }
            
            dataMap[monthKey][providerName] = (dataMap[monthKey][providerName] || 0) + expense.amount;
        });

        const sortedMonths = Object.keys(dataMap).sort((a, b) => b.localeCompare(a));
        
        return sortedMonths.map(monthKey => {
            const [year, month] = monthKey.split('-');
            const dateObj = new Date(Number(year), Number(month) - 1, 1);
            const monthLabel = dateObj.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
            const capitalizedLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
            
            let providers = Object.entries(dataMap[monthKey]).map(([name, total]) => ({
                name,
                total
            })).sort((a, b) => b.total - a.total);

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                providers = providers.filter(p => p.name.toLowerCase().includes(term));
            }
            
            const monthTotal = providers.reduce((sum, p) => sum + p.total, 0);

            return {
                monthKey,
                monthLabel: capitalizedLabel,
                providers,
                monthTotal
            };
        }).filter(m => m.providers.length > 0);
    };

    const handleCopyFromPreviousMonth = () => {
        handleAction(
            async () => {
                const res = await copyExpensesFromPreviousMonth();
                if (!res.success) {
                    throw new Error(res.error);
                }
                return res;
            },
            () => alert("Gastos del mes anterior copiados con éxito.")
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-4">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Gastos Operativos</h3>
                        <p className="text-sm text-slate-500">Gestiona los gastos mensuales y recurrentes de la empresa</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {activeTab === 'PROVIDERS' ? (
                            <button onClick={() => {
                                setSelectedProvider(null);
                                setProviderName('');
                                setProviderNit('');
                                setIsProviderModalOpen(true);
                            }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center justify-center transition-colors shadow-sm whitespace-nowrap cursor-pointer">
                                <Plus size={20} className="mr-2" /> Crear Proveedor
                            </button>
                        ) : (
                            <>
                                <button onClick={() => {
                                    if (confirm("¿Seguro que deseas copiar los gastos recurrentes del mes anterior?")) {
                                        handleCopyFromPreviousMonth();
                                    }
                                }} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 px-5 py-2.5 rounded-lg font-medium flex items-center justify-center transition-colors shadow-sm whitespace-nowrap border border-slate-200 dark:border-slate-700 cursor-pointer">
                                    <Copy size={18} className="mr-2" /> Copiar Mes Anterior
                                </button>
                                <button onClick={() => {
                                    setExpenseNameAdd('');
                                    setProviderNameAdd('');
                                    setDescriptionAdd('');
                                    setExpenseAmountAdd('');
                                    setHasIvaAdd(false);
                                    setSelectedProviderIdAdd('');
                                    setSelectedServiceIdAdd('');
                                    setExpenseDateAdd(new Date().toISOString().split('T')[0]);
                                    setIsAddModalOpen(true);
                                }} className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center justify-center transition-colors shadow-sm whitespace-nowrap cursor-pointer">
                                    <Plus size={20} className="mr-2" /> Registrar Gasto
                                </button>
                            </>
                        )}
                    </div>
                    <form action={(formData) => {
                        const targetId = uploadExpenseIdRef.current;
                        if (!targetId) return;
                        handleAction(
                            () => uploadExpenseReceipt(targetId, formData),
                            () => { setIsUploadingForExpenseId(null); uploadExpenseIdRef.current = null; if(fileInputRef.current) fileInputRef.current.value = ''; alert('Recibo subido con éxito'); }
                        );
                    }}>
                        <input type="file" name="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={(e) => {
                            if (e.target.files?.[0]) e.target.form?.requestSubmit();
                        }}/>
                    </form>
                </div>

                {/* CONTROLES DE FILTRADO */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => setActiveTab('MONTH')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all cursor-pointer ${activeTab === 'MONTH' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-450 shadow-sm border border-slate-200/50 dark:border-slate-600/50' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/30'}`}
                            >
                                <Calendar className="w-4 h-4 mr-2" /> Mes Actual
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('HISTORY')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all cursor-pointer ${activeTab === 'HISTORY' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-455 shadow-sm border border-slate-200/50 dark:border-slate-600/50' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/30'}`}
                            >
                                <History className="w-4 h-4 mr-2" /> Histórico
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('PROVIDERS')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all cursor-pointer ${activeTab === 'PROVIDERS' ? 'bg-white dark:bg-slate-700 text-emerald-705 dark:text-emerald-450 shadow-sm border border-slate-200/50 dark:border-slate-600/50' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/30'}`}
                            >
                                <Building2 className="w-4 h-4 mr-2" /> Proveedores
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('REPORTS')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all cursor-pointer ${activeTab === 'REPORTS' ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-450 shadow-sm border border-slate-200/50 dark:border-slate-600/50' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/30'}`}
                            >
                                <TrendingUp className="w-4 h-4 mr-2" /> Resumen
                            </button>
                        </div>

                        {activeTab !== 'PROVIDERS' && (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar por concepto, proveedor o desc..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 w-64"
                                />
                            </div>
                        )}
                    </div>

                    {activeTab === 'HISTORY' && (
                        <div className="flex flex-wrap gap-4 items-center animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Desde</span>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border-slate-300 dark:border-slate-700 border p-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-150" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Hasta</span>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border-slate-300 dark:border-slate-700 border p-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-150" />
                            </div>
                        </div>
                    )}
                </div>

                {activeTab === 'PROVIDERS' ? (
                    <div className="p-6 animate-in fade-in duration-200">
                        {initialProviders.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                <Building2 size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                                <p className="text-lg font-medium">No hay proveedores registrados</p>
                                <p className="text-sm">Comienza creando uno para asociar sus servicios recurrentes.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {initialProviders.map((prov: any) => {
                                    const currentSubTab = providerSubTabs[prov.id] || 'SERVICES';
                                    const monthlySpending = getMonthlyExpensesForProvider(prov.name);
                                    
                                    return (
                                        <div key={prov.id} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                                                            <Building2 size={20} className="text-blue-500" />
                                                            {prov.name}
                                                        </h4>
                                                        {prov.nit && (
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">NIT: {prov.nit}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => {
                                                            setSelectedProvider(prov);
                                                            setProviderName(prov.name);
                                                            setProviderNit(prov.nit || '');
                                                            setIsProviderModalOpen(true);
                                                        }} className="text-slate-500 hover:text-blue-600 p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer" title="Editar Proveedor">
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button onClick={() => {
                                                            if (confirm(`¿ELIMINAR el proveedor "${prov.name}"? Se borrarán todos sus servicios asociados.`)) {
                                                                handleAction(() => deleteProvider(prov.id));
                                                            }
                                                        }} className="text-slate-500 hover:text-rose-600 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors cursor-pointer" title="Eliminar Proveedor">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Sub-tabs selector */}
                                                <div className="flex border-b border-slate-200 dark:border-slate-800 mb-4">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setProviderSubTabs(prev => ({ ...prev, [prov.id]: 'SERVICES' }))}
                                                        className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider text-center transition-colors cursor-pointer ${
                                                            currentSubTab === 'SERVICES' 
                                                                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-450 font-extrabold' 
                                                                : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
                                                        }`}
                                                    >
                                                        Servicios
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setProviderSubTabs(prev => ({ ...prev, [prov.id]: 'SPENDING' }))}
                                                        className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider text-center transition-colors cursor-pointer ${
                                                            currentSubTab === 'SPENDING' 
                                                                ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 font-extrabold' 
                                                                : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
                                                        }`}
                                                    >
                                                        Historial Gastos
                                                    </button>
                                                </div>

                                                {currentSubTab === 'SERVICES' ? (
                                                    <div className="space-y-2 mb-6 pt-1">
                                                        {prov.services.length === 0 ? (
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 italic">No hay servicios.</p>
                                                        ) : (
                                                            prov.services.map((svc: any) => (
                                                                <div key={svc.id} className="flex justify-between items-center bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 text-sm mb-2 shadow-sm">
                                                                    <div className="flex-1 min-w-0 pr-2">
                                                                        <p className="font-semibold text-slate-800 dark:text-slate-250 truncate">{svc.name}</p>
                                                                        {svc.description && (
                                                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{svc.description}</p>
                                                                        )}
                                                                        <div className="flex items-center gap-1.5 mt-1">
                                                                            <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(svc.amount)}</span>
                                                                            {svc.hasIva && (
                                                                                <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-900">IVA Inc.</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <button onClick={() => {
                                                                            setSelectedProviderForService(prov);
                                                                            setSelectedService(svc);
                                                                            setServiceName(svc.name);
                                                                            setServiceAmount(svc.amount);
                                                                            setServiceDescription(svc.description || '');
                                                                            setServiceHasIva(svc.hasIva);
                                                                            setIsServiceModalOpen(true);
                                                                        }} className="text-slate-450 hover:text-blue-600 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer">
                                                                            <Pencil size={14} />
                                                                        </button>
                                                                        <button onClick={() => {
                                                                            if (confirm(`¿Eliminar el servicio "${svc.name}" del proveedor "${prov.name}"?`)) {
                                                                                handleAction(() => deleteProviderService(svc.id));
                                                                            }
                                                                        }} className="text-slate-450 hover:text-rose-600 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer">
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2 mb-6 pt-1">
                                                        {monthlySpending.length === 0 ? (
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-4">No hay gastos registrados para este proveedor.</p>
                                                        ) : (
                                                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                                {monthlySpending.map((item) => {
                                                                    const [yearStr, monthStr] = item.key.split('-');
                                                                    const yearNum = parseInt(yearStr);
                                                                    const monthNum = parseInt(monthStr) - 1;
                                                                    return (
                                                                        <div
                                                                            key={item.key}
                                                                            onClick={() => {
                                                                                const details = getExpensesDetailForProviderInMonth(prov.name, yearNum, monthNum);
                                                                                setDetailModal({ open: true, providerName: prov.name, monthLabel: item.monthName, expenses: details });
                                                                            }}
                                                                            className="flex justify-between items-center bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 text-sm shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 cursor-pointer transition-all"
                                                                        >
                                                                            <span className="font-medium text-slate-700 dark:text-slate-350">{item.monthName}</span>
                                                                            <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(item.amount)}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {currentSubTab === 'SERVICES' && (
                                                <button onClick={() => {
                                                    setSelectedProviderForService(prov);
                                                    setSelectedService(null);
                                                    setServiceName('');
                                                    setServiceAmount('');
                                                    setServiceDescription('');
                                                    setServiceHasIva(false);
                                                    setIsServiceModalOpen(true);
                                                }} className="w-full text-center text-xs font-semibold py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-blue-600 hover:border-blue-500 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                                                    <Plus size={14} /> Agregar Servicio
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'REPORTS' ? (
                    <div className="p-6 animate-in fade-in duration-200 space-y-6">
                        {getExpensesByMonthAndProvider().length === 0 ? (
                            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                <TrendingUp size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                                <p className="text-lg font-medium">No se encontraron gastos en el resumen</p>
                                <p className="text-sm">Asegúrate de que haya gastos registrados con proveedores.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {getExpensesByMonthAndProvider().map((item) => (
                                    <div key={item.monthKey} className="bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                                                    <Calendar size={20} className="text-purple-500" />
                                                    {item.monthLabel}
                                                </h4>
                                                <span className="text-sm font-bold text-slate-900 dark:text-slate-205 bg-white dark:bg-slate-800 shadow-sm px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                                    {formatCurrency(item.monthTotal)}
                                                </span>
                                            </div>

                                            <div className="space-y-4">
                                                {item.providers.map((p) => {
                                                    const percentage = item.monthTotal > 0 ? (p.total / item.monthTotal) * 100 : 0;
                                                    return (
                                                        <div key={p.name} className="space-y-1">
                                                            <div className="flex justify-between text-sm">
                                                                <span className="font-semibold text-slate-750 dark:text-slate-250 flex items-center gap-1.5">
                                                                    <Building2 size={14} className="text-slate-400" />
                                                                    {p.name}
                                                                </span>
                                                                <span className="font-bold text-slate-900 dark:text-slate-105">
                                                                    {formatCurrency(p.total)}
                                                                    <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1.5">({percentage.toFixed(0)}%)</span>
                                                                </span>
                                                            </div>
                                                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="bg-purple-550 dark:bg-purple-500 h-full rounded-full transition-all duration-500"
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Fecha</th>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Concepto</th>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Proveedor</th>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Descripción</th>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Base</th>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">IVA</th>
                                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-400">Total Pagado</th>
                                    {role === 'ADMIN' && <th className="p-4 font-semibold text-slate-600 dark:text-slate-400 text-right">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody className={isPending ? 'opacity-50 pointer-events-none' : ''}>
                                {filteredExpenses.length === 0 ? (
                                    <tr><td colSpan={role === 'ADMIN' ? 8 : 7} className="p-8 text-center text-slate-500 dark:text-slate-400">No se encontraron gastos.</td></tr>
                                ) : filteredExpenses.map((expense: any) => (
                                    <tr key={expense.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 text-slate-500 dark:text-slate-400 text-sm">{new Date(expense.date).toLocaleDateString()}</td>
                                        <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{expense.name}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-400 text-sm">{expense.provider || '-'}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-400 text-sm">{expense.description || '-'}</td>
                                        <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">
                                            {formatCurrency(expense.hasIva ? (expense.baseAmount || (expense.amount / 1.19)) : expense.amount)}
                                        </td>
                                        <td className="p-4 text-slate-500 dark:text-slate-400 text-sm">
                                            {expense.hasIva ? formatCurrency(expense.ivaAmount || (expense.amount - (expense.amount / 1.19))) : '-'}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(expense.amount)}</div>
                                        </td>
                                        {role === 'ADMIN' && (
                                            <td className="p-4 text-right flex items-center justify-end gap-1">
                                                {expense.receiptUrl ? (
                                                    <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-2 mr-1">
                                                        <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors" title="Ver Recibo">
                                                            <Eye size={18} />
                                                        </a>
                                                        <button onClick={() => {
                                                            if(confirm('¿Seguro que deseas eliminar este recibo?')) {
                                                                handleAction(() => deleteExpenseReceipt(expense.id, expense.receiptUrl));
                                                            }
                                                        }} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors cursor-pointer" title="Eliminar Recibo">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => {
                                                        setIsUploadingForExpenseId(expense.id);
                                                        uploadExpenseIdRef.current = expense.id;
                                                        setTimeout(() => fileInputRef.current?.click(), 0);
                                                    }} className="text-slate-500 hover:text-blue-600 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors mr-1 cursor-pointer" title="Subir Recibo">
                                                        <FileUp size={18} />
                                                    </button>
                                                )}
                                                <button onClick={() => {
                                                    setSelectedExpense(expense);
                                                    setExpenseAmountEdit(expense.amount);
                                                    setHasIvaEdit(expense.hasIva || false);
                                                    setExpenseDateEdit(expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                                                    setIsEditModalOpen(true);
                                                }} className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer" title="Editar">
                                                    <Pencil size={18} />
                                                </button>
                                                <button onClick={() => {
                                                    if(confirm('¿ELIMINAR este gasto? Esta acción no se puede deshacer.')) {
                                                        handleAction(() => deleteExpense(expense.id));
                                                    }
                                                }} className="text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors cursor-pointer" title="Eliminar">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL EDICIÓN DE GASTO */}
            {isEditModalOpen && selectedExpense && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Editar Gasto</h3>
                            <button onClick={() => { setIsEditModalOpen(false); setSelectedExpense(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as any;
                            const tBaseEdit = hasIvaEdit ? (Number(expenseAmountEdit) / 1.19) : Number(expenseAmountEdit);
                            const tIvaEdit = hasIvaEdit ? (Number(expenseAmountEdit) - tBaseEdit) : 0;
                            
                            handleAction(
                                () => updateExpense(selectedExpense.id, {
                                    name: form.expenseName.value,
                                    provider: form.provider.value || undefined,
                                    description: form.description.value || undefined,
                                    amount: Number(expenseAmountEdit),
                                    hasIva: hasIvaEdit,
                                    baseAmount: tBaseEdit,
                                    ivaAmount: tIvaEdit,
                                    date: expenseDateEdit
                                }),
                                () => { setIsEditModalOpen(false); setSelectedExpense(null); }
                            );
                        }} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Concepto</label>
                                    <input required type="text" name="expenseName" defaultValue={selectedExpense.name} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha del Gasto</label>
                                    <input required type="date" name="expenseDate" value={expenseDateEdit} onChange={(e) => setExpenseDateEdit(e.target.value)} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none [color-scheme:light] dark:[color-scheme:dark]" disabled={isPending} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Proveedor (Opcional)</label>
                                <input type="text" name="provider" defaultValue={selectedExpense.provider} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                                <input type="text" name="description" defaultValue={selectedExpense.description} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monto Total Pagado ($)</label>
                                <input required type="number" name="amount" value={expenseAmountEdit} onChange={(e) => setExpenseAmountEdit(e.target.value ? Number(e.target.value) : '')} min="0" step="any" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">¿El monto cobrado incluye IVA?</label>
                                <button 
                                    type="button"
                                    onClick={() => setHasIvaEdit(!hasIvaEdit)}
                                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm ${hasIvaEdit ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 ring-1 ring-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    {hasIvaEdit ? 'Sí, incluye IVA (19%)' : 'No incluye IVA'}
                                </button>
                            </div>

                            {hasIvaEdit && expenseAmountEdit !== '' && Number(expenseAmountEdit) > 0 && (() => {
                                const m = Number(expenseAmountEdit);
                                const b = m / 1.19;
                                const i = m - b;
                                return (
                                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-3 rounded-lg text-sm flex justify-between items-center animate-in slide-in-from-top-2">
                                        <div>
                                            <p className="font-bold text-slate-700 dark:text-slate-300">Desglose Contable:</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-xs">Base calculada auto.</p>
                                        </div>
                                        <div className="text-right">
                                            <p><span className="text-slate-500">Base:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(b)}</span></p>
                                            <p><span className="text-slate-500">IVA (19%):</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(i)}</span></p>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => { setIsEditModalOpen(false); setSelectedExpense(null); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors" disabled={isPending}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center transition-colors disabled:opacity-50">
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CREAR GASTO */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Registrar Nuevo Gasto</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as any;
                            const tBaseAdd = hasIvaAdd ? (Number(expenseAmountAdd) / 1.19) : Number(expenseAmountAdd);
                            const tIvaAdd = hasIvaAdd ? (Number(expenseAmountAdd) - tBaseAdd) : 0;

                            handleAction(
                                () => addExpense({
                                    name: expenseNameAdd,
                                    provider: providerNameAdd || undefined,
                                    description: descriptionAdd || undefined,
                                    amount: Number(expenseAmountAdd),
                                    hasIva: hasIvaAdd,
                                    baseAmount: tBaseAdd,
                                    ivaAmount: tIvaAdd,
                                    date: expenseDateAdd
                                }),
                                () => setIsAddModalOpen(false)
                            );
                        }} className="space-y-4">
                            {initialProviders.length > 0 && (
                                <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-4 space-y-3">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pre-llenar con servicio recurrente</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-650 dark:text-slate-400 mb-1">Seleccionar Proveedor</label>
                                            <select 
                                                value={selectedProviderIdAdd}
                                                onChange={(e) => {
                                                    const provId = e.target.value ? Number(e.target.value) : '';
                                                    setSelectedProviderIdAdd(provId);
                                                    setSelectedServiceIdAdd('');
                                                }}
                                                className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">-- Seleccionar --</option>
                                                {initialProviders.map((p: any) => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-650 dark:text-slate-400 mb-1">Seleccionar Servicio</label>
                                            <select 
                                                value={selectedServiceIdAdd}
                                                disabled={!selectedProviderIdAdd}
                                                onChange={(e) => {
                                                    const svcId = e.target.value ? Number(e.target.value) : '';
                                                    setSelectedServiceIdAdd(svcId);
                                                    if (svcId) {
                                                        const prov = initialProviders.find((p: any) => p.id === selectedProviderIdAdd);
                                                        const svc = prov?.services.find((s: any) => s.id === svcId);
                                                        if (svc && prov) {
                                                            setExpenseNameAdd(svc.name);
                                                            setProviderNameAdd(prov.name);
                                                            setDescriptionAdd(svc.description || '');
                                                            setExpenseAmountAdd(svc.amount);
                                                            setHasIvaAdd(svc.hasIva);
                                                        }
                                                    }
                                                }}
                                                className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                            >
                                                <option value="">-- Seleccionar --</option>
                                                {selectedProviderIdAdd && initialProviders
                                                    .find((p: any) => p.id === selectedProviderIdAdd)
                                                    ?.services.map((s: any) => (
                                                        <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.amount)})</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Concepto</label>
                                    <input required type="text" name="expenseName" value={expenseNameAdd} onChange={(e) => setExpenseNameAdd(e.target.value)} placeholder="Ej. Luz, Internet..." className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha del Gasto</label>
                                    <input required type="date" name="expenseDate" value={expenseDateAdd} onChange={(e) => setExpenseDateAdd(e.target.value)} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none [color-scheme:light] dark:[color-scheme:dark]" disabled={isPending} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Proveedor (Opcional)</label>
                                <input type="text" name="provider" value={providerNameAdd} onChange={(e) => setProviderNameAdd(e.target.value)} placeholder="Nombre de la empresa o proveedor" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                                <input type="text" name="description" value={descriptionAdd} onChange={(e) => setDescriptionAdd(e.target.value)} placeholder="Anotaciones extra" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monto Total Pagado ($)</label>
                                <input required type="number" name="amount" value={expenseAmountAdd} onChange={(e) => setExpenseAmountAdd(e.target.value ? Number(e.target.value) : '')} min="0" placeholder="0.00" step="any" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">¿El monto cobrado incluye IVA?</label>
                                <button 
                                    type="button"
                                    onClick={() => setHasIvaAdd(!hasIvaAdd)}
                                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm ${hasIvaAdd ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 ring-1 ring-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    {hasIvaAdd ? 'Sí, incluye IVA (19%)' : 'No incluye IVA'}
                                </button>
                            </div>

                            {hasIvaAdd && expenseAmountAdd !== '' && Number(expenseAmountAdd) > 0 && (() => {
                                const m = Number(expenseAmountAdd);
                                const b = m / 1.19;
                                const i = m - b;
                                return (
                                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-3 rounded-lg text-sm flex justify-between items-center animate-in slide-in-from-top-2">
                                        <div>
                                            <p className="font-bold text-slate-700 dark:text-slate-300">Desglose Contable:</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-xs">Base calculada auto.</p>
                                        </div>
                                        <div className="text-right">
                                            <p><span className="text-slate-500">Base:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(b)}</span></p>
                                            <p><span className="text-slate-500">IVA (19%):</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(i)}</span></p>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors" disabled={isPending}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isPending} className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-lg font-medium flex items-center transition-colors disabled:opacity-50">
                                    Registrar Gasto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* MODAL CREAR / EDITAR PROVEEDOR */}
            {isProviderModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                {selectedProvider ? 'Editar Proveedor' : 'Crear Nuevo Proveedor'}
                            </h3>
                            <button onClick={() => setIsProviderModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (selectedProvider) {
                                handleAction(
                                    () => updateProvider(selectedProvider.id, { name: providerName, nit: providerNit }),
                                    () => setIsProviderModalOpen(false)
                                );
                            } else {
                                handleAction(
                                    () => addProvider({ name: providerName, nit: providerNit }),
                                    () => setIsProviderModalOpen(false)
                                );
                            }
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Proveedor</label>
                                <input required type="text" value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="Ej. Claro, EPM, AWS..." className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">NIT / Identificación (Opcional)</label>
                                <input type="text" value={providerNit} onChange={(e) => setProviderNit(e.target.value)} placeholder="Ej. 800123456-7" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsProviderModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors cursor-pointer" disabled={isPending}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center transition-colors disabled:opacity-50 cursor-pointer">
                                    {selectedProvider ? 'Guardar Cambios' : 'Crear Proveedor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CREAR / EDITAR SERVICIO DE PROVEEDOR */}
            {isServiceModalOpen && selectedProviderForService && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                    {selectedService ? 'Editar Servicio' : 'Agregar Servicio'}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Proveedor: {selectedProviderForService.name}</p>
                            </div>
                            <button onClick={() => setIsServiceModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (selectedService) {
                                handleAction(
                                    () => updateProviderService(selectedService.id, {
                                        name: serviceName,
                                        amount: Number(serviceAmount),
                                        description: serviceDescription,
                                        hasIva: serviceHasIva
                                    }),
                                    () => setIsServiceModalOpen(false)
                                );
                            } else {
                                handleAction(
                                    () => addProviderService({
                                        providerId: selectedProviderForService.id,
                                        name: serviceName,
                                        amount: Number(serviceAmount),
                                        description: serviceDescription,
                                        hasIva: serviceHasIva
                                    }),
                                    () => setIsServiceModalOpen(false)
                                );
                            }
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Servicio (Concepto)</label>
                                <input required type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Ej. Plan Internet 300MB, Arriendo..." className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monto de Gasto ($)</label>
                                <input required type="number" value={serviceAmount} onChange={(e) => setServiceAmount(e.target.value ? Number(e.target.value) : '')} placeholder="0.00" min="0" step="any" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción / Observaciones</label>
                                <input type="text" value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} placeholder="Anotaciones extra para el gasto" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">¿El monto del servicio incluye IVA?</label>
                                <button 
                                    type="button"
                                    onClick={() => setServiceHasIva(!serviceHasIva)}
                                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm ${serviceHasIva ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 ring-1 ring-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    {serviceHasIva ? 'Sí, incluye IVA (19%)' : 'No incluye IVA'}
                                </button>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsServiceModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors cursor-pointer" disabled={isPending}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center transition-colors disabled:opacity-50 cursor-pointer">
                                    {selectedService ? 'Guardar Cambios' : 'Agregar Servicio'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        
            {/* MODAL DETALLE DE GASTOS */}
            {detailModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                    Detalle de Gastos
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {detailModal.providerName} — {detailModal.monthLabel}
                                </p>
                            </div>
                            <button onClick={() => setDetailModal({ open: false, providerName: '', monthLabel: '', expenses: [] })} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-5 flex-1">
                            {detailModal.expenses.length === 0 ? (
                                <p className="text-center text-slate-500 dark:text-slate-400 py-8">No hay gastos detallados para este período.</p>
                            ) : (
                                <div className="space-y-3">
                                    {detailModal.expenses.map((exp: any) => (
                                        <div key={exp.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{exp.name}</p>
                                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    <span>{new Date(exp.date).toLocaleDateString()}</span>
                                                    {exp.description && <span className="truncate">— {exp.description}</span>}
                                                    {exp.hasIva && <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[10px] font-bold">IVA</span>}
                                                </div>
                                            </div>
                                            <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0 ml-4">{formatCurrency(exp.amount)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-200 dark:border-slate-800">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">Total</span>
                                        <span className="font-bold text-lg text-rose-600 dark:text-rose-400">
                                            {formatCurrency(detailModal.expenses.reduce((sum: number, e: any) => sum + e.amount, 0))}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
</div>
    );
}
