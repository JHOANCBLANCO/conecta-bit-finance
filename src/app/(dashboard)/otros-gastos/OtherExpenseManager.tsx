"use client";

import React, { useTransition, useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, X, Upload, Eye, FileUp, Download } from 'lucide-react';
import { addOtherExpense, deleteOtherExpense, updateOtherExpense, uploadOtherExpenseReceipt, deleteOtherExpenseReceipt } from '@/app/actions';

export default function OtherExpenseManager({ initialExpenses, role }: { initialExpenses: any[], role: string }) {
    const [isPending, startTransition] = useTransition();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<any>(null);

    // Add modal separate from table due to space constraints
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isUploadingForExpenseId, setIsUploadingForExpenseId] = useState<number | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

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

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Otros Gastos</h2>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold flex items-center transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                        disabled={isPending}
                    >
                        <Plus size={20} className="mr-2" /> Añadir Gasto
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file || !isUploadingForExpenseId) return;
                        
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        handleAction(
                            () => uploadOtherExpenseReceipt(isUploadingForExpenseId, formData),
                            () => { setIsUploadingForExpenseId(null); if(fileInputRef.current) fileInputRef.current.value = ''; alert('Recibo subido con éxito'); }
                        );
                    }}/>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Fecha</th>
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Producto o Servicio</th>
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-center">Cant.</th>
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Medio de Pago</th>
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Origen Dinero</th>
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">Proveedor</th>
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">Vr. Unitario</th>
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">Vr. Total</th>
                                {role === 'ADMIN' && <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider text-right">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className={isPending ? 'opacity-50 pointer-events-none' : ''}>
                            {initialExpenses.length === 0 ? (
                                <tr><td colSpan={9} className="p-8 text-center text-slate-500 dark:text-slate-400">No hay otros gastos registrados.</td></tr>
                            ) : initialExpenses.map((expense: any) => (
                                <tr key={expense.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 text-slate-500 dark:text-slate-400 text-sm">
                                        {new Date(expense.date).toISOString().split('T')[0]}
                                    </td>
                                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={expense.productOrService}>
                                        {expense.productOrService}
                                    </td>
                                    <td className="p-3 text-slate-600 dark:text-slate-400 text-sm text-center font-medium">
                                        {expense.quantity}
                                    </td>
                                    <td className="p-3 text-slate-600 dark:text-slate-400 text-sm">
                                        {expense.paymentMethod || '-'}
                                    </td>
                                    <td className="p-3 text-slate-600 dark:text-slate-400 text-sm">
                                        {expense.moneyOrigin || '-'}
                                    </td>
                                    <td className="p-3 text-slate-600 dark:text-slate-400 text-sm">
                                        {expense.provider || '-'}
                                    </td>
                                    <td className="p-3 text-slate-600 dark:text-slate-300 text-sm text-right">
                                        {formatCurrency(expense.unitValue)}
                                    </td>
                                    <td className="p-3 text-indigo-600 dark:text-indigo-400 font-bold text-right">
                                        {formatCurrency(expense.totalValue)}
                                    </td>
                                    {role === 'ADMIN' && (
                                        <td className="p-3 text-right flex items-center justify-end gap-1">
                                            {expense.receiptUrl ? (
                                                <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-2 mr-1">
                                                    <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors" title="Ver Recibo">
                                                        <Eye size={18} />
                                                    </a>
                                                    <button onClick={() => {
                                                        if(confirm('¿Seguro que deseas eliminar este recibo?')) {
                                                            handleAction(() => deleteOtherExpenseReceipt(expense.id, expense.receiptUrl));
                                                        }
                                                    }} className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors" title="Eliminar Recibo">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => {
                                                    setIsUploadingForExpenseId(expense.id);
                                                    setTimeout(() => fileInputRef.current?.click(), 0);
                                                }} className="text-slate-500 hover:text-blue-600 p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors mr-1" title="Subir Recibo">
                                                    <FileUp size={18} />
                                                </button>
                                            )}
                                            <button onClick={() => {
                                                setSelectedExpense(expense);
                                                setIsEditModalOpen(true);
                                            }} className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors mr-1" title="Editar">
                                                <Pencil size={18} />
                                            </button>
                                            <button onClick={() => {
                                                if (window.confirm("¿Estás seguro de eliminar este gasto?")) {
                                                    handleAction(() => deleteOtherExpense(expense.id));
                                                }
                                            }} className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors" title="Eliminar">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                        {initialExpenses.length > 0 && (
                            <tfoot>
                                <tr className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700">
                                    <td colSpan={7} className="p-3 text-right font-bold text-slate-700 dark:text-slate-300">TOTAL GASTOS:</td>
                                    <td className="p-3 text-right font-black text-indigo-700 dark:text-indigo-400 text-lg">
                                        {formatCurrency(initialExpenses.reduce((acc, curr) => acc + curr.totalValue, 0))}
                                    </td>
                                    {role === 'ADMIN' && <td></td>}
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {isAddModalOpen && (
                <ExpenseFormModal 
                    onClose={() => setIsAddModalOpen(false)}
                    onSubmit={(data: any) => handleAction(() => addOtherExpense(data), () => setIsAddModalOpen(false))}
                    isPending={isPending}
                />
            )}

            {isEditModalOpen && selectedExpense && (
                <ExpenseFormModal 
                    initialData={selectedExpense}
                    onClose={() => { setIsEditModalOpen(false); setSelectedExpense(null); }}
                    onSubmit={(data: any) => handleAction(() => updateOtherExpense(selectedExpense.id, data), () => { setIsEditModalOpen(false); setSelectedExpense(null); })}
                    isPending={isPending}
                    isEdit={true}
                />
            )}
        </div>
    );
}

// Subcomponente reutilizable para el formulario (Crear y Editar)
function ExpenseFormModal({ initialData, onClose, onSubmit, isPending, isEdit = false }: any) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
    };

    const [qty, setQty] = useState(initialData?.quantity || 1);
    const [unitVal, setUnitVal] = useState(initialData?.unitValue || 0);
    const totalVal = qty * unitVal;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as any;
        
        onSubmit({
            productOrService: form.productOrService.value,
            quantity: Number(form.quantity.value),
            date: form.date.value,
            paymentMethod: form.paymentMethod.value || undefined,
            moneyOrigin: form.moneyOrigin.value || undefined,
            provider: form.provider.value || undefined,
            unitValue: Number(form.unitValue.value),
            totalValue: totalVal
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {isEdit ? 'Editar Gasto' : 'Añadir Nuevo Gasto'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Producto o Servicio *</label>
                            <input required type="text" name="productOrService" defaultValue={initialData?.productOrService} className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" disabled={isPending} />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Fecha de Gasto *</label>
                            <input required type="date" name="date" defaultValue={initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow [color-scheme:light] dark:[color-scheme:dark]" disabled={isPending} />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Medio de Pago</label>
                            <input type="text" name="paymentMethod" defaultValue={initialData?.paymentMethod} placeholder="Efectivo, Tarjeta, Trf..." className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" disabled={isPending} />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Origen Dinero</label>
                            <input type="text" name="moneyOrigin" defaultValue={initialData?.moneyOrigin} placeholder="Caja chica, Banco..." className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" disabled={isPending} />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Proveedor</label>
                            <input type="text" name="provider" defaultValue={initialData?.provider} placeholder="Nombre proveedor..." className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" disabled={isPending} />
                        </div>

                        <div className="md:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Cantidad *</label>
                                <input required type="number" name="quantity" min="1" step="1" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-amber-50 dark:bg-amber-900/20 text-slate-900 dark:text-slate-100 border p-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-center" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Valor Unitario ($) *</label>
                                <input required type="number" name="unitValue" min="0" step="0.01" value={unitVal || ''} onChange={e => setUnitVal(Number(e.target.value))} className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-900/20 text-slate-900 dark:text-slate-100 border p-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-right" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-indigo-500 dark:text-indigo-400 mb-1 uppercase tracking-wider">Valor Total</label>
                                <div className="w-full rounded-xl border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border p-3 font-black text-right text-lg select-none">
                                    {formatCurrency(totalVal)}
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors" disabled={isPending}>
                                Cancelar
                            </button>
                            <button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center transition-all shadow-md hover:shadow-lg disabled:opacity-50">
                                {isEdit ? 'Actualizar Gasto' : 'Guardar Gasto'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
