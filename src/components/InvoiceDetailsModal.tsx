"use client";

import React from 'react';
import { X, CheckCircle2 } from 'lucide-react';

// Utility to parse structured items from notes JSON prefix
export function parseInvoiceItems(notes: string | null | undefined): { code: string | null; name: string; price: number; details: string | null; observations: string | null }[] | null {
    if (!notes) return null;
    const match = notes.match(/^<!--ITEMS:(.*?):ITEMS-->/);
    if (!match) return null;
    try {
        return JSON.parse(match[1]);
    } catch {
        return null;
    }
}

// Get human-readable notes without the JSON prefix
export function getCleanNotes(notes: string | null | undefined): string {
    if (!notes) return '';
    return notes.replace(/^<!--ITEMS:.*?:ITEMS-->/, '').trim();
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
};

interface InvoiceDetailsModalProps {
    invoice: any;
    onClose: () => void;
}

export default function InvoiceDetailsModal({ invoice, onClose }: InvoiceDetailsModalProps) {
    if (!invoice) return null;

    const items = parseInvoiceItems(invoice.notes);
    const cleanNotes = getCleanNotes(invoice.notes);

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[80]">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Detalles de Factura</h3>
                        <p className="text-sm text-slate-500 font-medium">#{invoice.invoiceNumber || 'S/N'}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1">Cliente</p>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{invoice.client?.name || invoice.clientName}</p>
                            <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                                <p>{invoice.client?.phone && <span className="font-medium">Tel:</span>} {invoice.client?.phone}</p>
                                <p>{invoice.client?.nit && <span className="font-medium">NIT/CC:</span>} {invoice.client?.nit}</p>
                                <p>{invoice.client?.contact && <span className="font-medium">Contacto:</span>} {invoice.client?.contact}</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1">Información</p>
                            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 mt-2">
                                <div className="flex justify-between"><span className="font-medium">Fecha Emisión:</span> <span>{new Date(invoice.date).toLocaleDateString()}</span></div>
                                {invoice.paymentDeadline && <div className="flex justify-between"><span className="font-medium">Vencimiento:</span> <span>{new Date(invoice.paymentDeadline).toLocaleDateString()}</span></div>}
                                {invoice.cycleStartDate && <div className="flex justify-between"><span className="font-medium">Inicio Ciclo:</span> <span>{new Date(invoice.cycleStartDate).toLocaleDateString()}</span></div>}
                                {invoice.cycleEndDate && <div className="flex justify-between"><span className="font-medium">Fin Ciclo:</span> <span>{new Date(invoice.cycleEndDate).toLocaleDateString()}</span></div>}
                                <div className="flex justify-between"><span className="font-medium">Estado:</span> 
                                    <span className={`font-bold ${invoice.salePrice - invoice.amountPaid <= 0 ? 'text-emerald-600' : invoice.amountPaid > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                                        {invoice.salePrice - invoice.amountPaid <= 0 ? 'Pagado' : invoice.amountPaid > 0 ? 'Abono Parcial' : 'Pendiente'}
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
                            {/* Item-by-item display if structured data available */}
                            {items && items.length > 0 ? (
                                <div className="space-y-3 mb-4">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                            <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {item.code && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">{item.code}</span>
                                                    )}
                                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                        {item.quantity && item.quantity > 1 ? <span className="text-indigo-600 dark:text-indigo-400 mr-1">{item.quantity}x</span> : ''}
                                                        {item.name}
                                                    </span>
                                                </div>
                                                {item.details && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Detalle: {item.details}</p>}
                                                {item.observations && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 italic">Obs: {item.observations}</p>}
                                            </div>
                                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 shrink-0">{formatCurrency(item.price)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">{invoice.serviceName || invoice.service?.name}</p>
                            )}

                            {cleanNotes && (
                                <div className="mb-4 text-xs text-slate-500 italic bg-amber-50 dark:bg-amber-900/10 p-2.5 rounded border border-amber-100 dark:border-amber-800">
                                    <strong>Nota:</strong> {cleanNotes}
                                </div>
                            )}
                            
                            {(() => {
                                let tIva = 0;
                                let tReteIva = 0;
                                let tBase = invoice.salePrice;
                                
                                if (invoice.hasIva && invoice.hasReteIva) {
                                    tBase = invoice.salePrice / 1.1615;
                                    tIva = tBase * 0.19;
                                    tReteIva = tIva * 0.15;
                                } else if (invoice.hasIva) {
                                    tBase = invoice.salePrice / 1.19;
                                    tIva = tBase * 0.19;
                                }

                                return (
                                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                                        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                            <span>Subtotal (Base)</span>
                                            <span>{formatCurrency(tBase)}</span>
                                        </div>
                                        {invoice.hasIva && (
                                            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                                <span>IVA (19%)</span>
                                                <span>{formatCurrency(tIva)}</span>
                                            </div>
                                        )}
                                        {invoice.hasReteIva && (
                                            <div className="flex justify-between text-sm text-rose-600 dark:text-rose-400">
                                                <span>ReteIVA (15%)</span>
                                                <span>-{formatCurrency(tReteIva)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                                            <span>Total Factura</span>
                                            <span>{formatCurrency(invoice.salePrice)}</span>
                                        </div>
                                        {invoice.amountPaid > 0 && (
                                            <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                                <span>Total Pagado</span>
                                                <span>{formatCurrency(invoice.amountPaid)}</span>
                                            </div>
                                        )}
                                        {invoice.salePrice - invoice.amountPaid > 0 && (
                                            <div className="flex justify-between font-bold text-rose-600 dark:text-rose-400 mt-1">
                                                <span>Saldo Pendiente</span>
                                                <span>{formatCurrency(invoice.salePrice - invoice.amountPaid)}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg font-medium transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
