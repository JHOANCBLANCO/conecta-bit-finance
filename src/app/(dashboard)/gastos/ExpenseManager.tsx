"use client";

import React, { useTransition, useState } from 'react';
import { Plus, Trash2, Pencil, X, Upload, Eye, FileUp, Download } from 'lucide-react';
import { addExpense, deleteExpense, updateExpense, uploadExpenseReceipt, deleteExpenseReceipt } from '@/app/actions';

export default function ExpenseManager({ initialExpenses, role }: { initialExpenses: any[], role: string }) {
    const [isPending, startTransition] = useTransition();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<any>(null);
    const [isUploadingForExpenseId, setIsUploadingForExpenseId] = useState<number | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // States for ADD Modal
    const [expenseAmountAdd, setExpenseAmountAdd] = useState<number | ''>('');
    const [hasIvaAdd, setHasIvaAdd] = useState(false);

    // States for EDIT Modal
    const [expenseAmountEdit, setExpenseAmountEdit] = useState<number | ''>('');
    const [hasIvaEdit, setHasIvaEdit] = useState(false);

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
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-4">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Gastos Operativos</h3>
                        <p className="text-sm text-slate-500">Gestiona los gastos mensuales y recurrentes de la empresa</p>
                    </div>
                    <button onClick={() => {
                        setIsAddModalOpen(true);
                        setExpenseAmountAdd('');
                        setHasIvaAdd(false);
                    }} className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center justify-center transition-colors shadow-sm whitespace-nowrap">
                        <Plus size={20} className="mr-2" /> Registrar Gasto
                    </button>
                    <form action={(formData) => {
                        if (!isUploadingForExpenseId) return;
                        handleAction(
                            () => uploadExpenseReceipt(isUploadingForExpenseId, formData),
                            () => { setIsUploadingForExpenseId(null); if(fileInputRef.current) fileInputRef.current.value = ''; alert('Recibo subido con éxito'); }
                        );
                    }}>
                        <input type="file" name="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={(e) => {
                            if (e.target.files?.[0]) e.target.form?.requestSubmit();
                        }}/>
                    </form>
                </div>

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
                            {initialExpenses.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">No hay gastos registrados.</td></tr>
                            ) : initialExpenses.map((expense: any) => (
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
                                                    }} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors" title="Eliminar Recibo">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => {
                                                    setIsUploadingForExpenseId(expense.id);
                                                    setTimeout(() => fileInputRef.current?.click(), 0);
                                                }} className="text-slate-500 hover:text-blue-600 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors mr-1" title="Subir Recibo">
                                                    <FileUp size={18} />
                                                </button>
                                            )}
                                            <button onClick={() => {
                                                setSelectedExpense(expense);
                                                setExpenseAmountEdit(expense.amount);
                                                setHasIvaEdit(expense.hasIva || false);
                                                setIsEditModalOpen(true);
                                            }} className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Editar">
                                                <Pencil size={18} />
                                            </button>
                                            <button onClick={() => {
                                                if(confirm('¿ELIMINAR este gasto? Esta acción no se puede deshacer.')) {
                                                    handleAction(() => deleteExpense(expense.id));
                                                }
                                            }} className="text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors" title="Eliminar">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
                                    ivaAmount: tIvaEdit
                                }),
                                () => { setIsEditModalOpen(false); setSelectedExpense(null); }
                            );
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Concepto</label>
                                <input required type="text" name="expenseName" defaultValue={selectedExpense.name} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
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
                                <input required type="number" name="amount" value={expenseAmountEdit} onChange={(e) => setExpenseAmountEdit(e.target.value ? Number(e.target.value) : '')} min="0" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
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
                                    name: form.expenseName.value,
                                    provider: form.provider.value || undefined,
                                    description: form.description.value || undefined,
                                    amount: Number(expenseAmountAdd),
                                    hasIva: hasIvaAdd,
                                    baseAmount: tBaseAdd,
                                    ivaAmount: tIvaAdd
                                }),
                                () => setIsAddModalOpen(false)
                            );
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Concepto</label>
                                <input required type="text" name="expenseName" placeholder="Ej. Luz, Internet..." className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Proveedor (Opcional)</label>
                                <input type="text" name="provider" placeholder="Nombre de la empresa o proveedor" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                                <input type="text" name="description" placeholder="Anotaciones extra" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monto Total Pagado ($)</label>
                                <input required type="number" name="amount" value={expenseAmountAdd} onChange={(e) => setExpenseAmountAdd(e.target.value ? Number(e.target.value) : '')} min="0" placeholder="0.00" className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" disabled={isPending} />
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
        </div>
    );
}
