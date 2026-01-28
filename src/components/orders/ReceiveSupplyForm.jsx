import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, Loader, Scan, FileText, PackageCheck, Trash2, Plus } from "lucide-react";
import { useLanguage } from "../LanguageProvider";

export default function ReceiveSupplyForm({ order, receipt, suppliers = [], onSubmit, onCancel, onDelete, noOrderMode = false }) {
  const { t, language } = useLanguage();

  const initial = useMemo(() => ({
    order_id: receipt?.order_id || "",
    order_number: receipt?.order_number || "",
    supplier_name: receipt?.supplier_name || "",
    supplier_id: receipt?.supplier_id || "",
    supplier_email: receipt?.supplier_email || "",
    received_date: receipt?.received_date || new Date().toISOString().split('T')[0],
    receipt_images: receipt?.receipt_images || [],
    verified_items: receipt?.verified_items || [],
    price_changes_summary: receipt?.price_changes_summary || [],
    has_price_changes: !!receipt?.has_price_changes,
    invoice_number: receipt?.invoice_number || "",
    invoice_date: receipt?.invoice_date || "",
    invoice_total: typeof receipt?.invoice_total === 'number' ? receipt.invoice_total : 0,
    calculated_total: typeof receipt?.calculated_total === 'number' ? receipt.calculated_total : 0,
    totals_match: !!receipt?.totals_match,
    notes: receipt?.notes || "",
    status: receipt?.status || "pending",
    is_refund: !!receipt?.is_refund,
    needs_review: !!receipt?.needs_review,
    review_note: receipt?.review_note || "",
    refund_received: !!receipt?.refund_received,
    reviewed: !!receipt?.reviewed,
    linked_receipt_id: receipt?.linked_receipt_id || "",
    manual_entry_mode: !!receipt
  }), [receipt]);

  const [formData, setFormData] = useState(initial);
  const [invoiceTotalInput, setInvoiceTotalInput] = useState(String(initial.invoice_total || 0));
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [matching, setMatching] = useState(false);
  const [duplicateExists, setDuplicateExists] = useState(false);
  const [linkableReceipts, setLinkableReceipts] = useState([]);

  useEffect(() => { setInvoiceTotalInput(String(formData.invoice_total || 0)); }, [formData.invoice_total]);

  // Load linkable receipts when refund + supplier chosen
  useEffect(() => {
    const loadLinkables = async () => {
      try {
        if (!formData.is_refund || !formData.supplier_id) { setLinkableReceipts([]); return; }
        const me = await base44.auth.me();
        const workingEmail = me.acting_as_store_email || me.email;
        const list = await base44.entities.SupplyReceipt.filter({ supplier_id: formData.supplier_id, created_by: workingEmail }, "-received_date");
        const candidates = (list || []).filter(r => !r.is_refund && (!receipt || r.id !== receipt.id));
        setLinkableReceipts(candidates);
      } catch (e) { /* ignore */ }
    };
    loadLinkables();
  }, [formData.is_refund, formData.supplier_id, receipt]);

  const setSupplierById = (supplierId) => {
    const s = suppliers.find(x => x.id === supplierId);
    if (!s) return;
    setFormData(prev => ({
      ...prev,
      supplier_id: s.id,
      supplier_name: s.name,
      supplier_email: s.email || "",
      order_number: prev.order_number || `MANUAL-${Date.now()}`,
      manual_entry_mode: true
    }));
  };

  const recalcTotals = (items, invoiceTotal) => {
    const calc = (items || []).reduce((sum, it) => {
      const p = parseFloat(it.actual_price || 0);
      const d = parseFloat(it.actual_discount || 0);
      const q = parseFloat(it.received_quantity || 0);
      return sum + (p * (1 - d/100)) * q;
    }, 0);
    const totalsMatch = Math.abs(calc - (parseFloat(invoiceTotal) || 0)) < 1;
    return { calculated_total: calc, totals_match: totalsMatch };
  };

  const checkDuplicateInvoice = async (invoiceNum, supplierId, excludeId) => {
    if (!invoiceNum || !supplierId) { setDuplicateExists(false); return; }
    try {
      const me = await base44.auth.me();
      const workingEmail = me.acting_as_store_email || me.email;
      const results = await base44.entities.SupplyReceipt.filter({ supplier_id: supplierId, invoice_number: String(invoiceNum).trim(), created_by: workingEmail });
      const dup = (results || []).some(r => !excludeId || r.id !== excludeId);
      setDuplicateExists(dup);
    } catch {}
  };

  const onFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(Array.from(files).map(async (file) => {
        try { const { file_url } = await base44.integrations.Core.UploadFile({ file }); return file_url; } catch { return null; }
      }));
      const urls = uploaded.filter(Boolean);
      if (urls.length) setFormData(prev => ({ ...prev, receipt_images: [...prev.receipt_images, ...urls] }));
    } finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (noOrderMode) {
      if (!formData.supplier_id) { alert(t('supplier_required') || 'Supplier is required'); return; }
      if (!formData.invoice_number || Number(formData.invoice_total) === 0) { alert(t('invoice_details_required') || 'Invoice number and total are required'); return; }
      if (!formData.receipt_images || formData.receipt_images.length === 0) { alert(t('receipt_images_required') || 'Please upload receipt images'); return; }
    } else {
      if (!formData.order_id) { alert(t('select_order') || 'Select order'); return; }
    }
    onSubmit(formData);
  };

  return (
    <Card className="mb-8 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl font-bold">{noOrderMode ? (t('supply_without_order') || 'Supply without order') : (t('receive') || 'Receive')}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {noOrderMode && (
            <>
              {/* Supplier */}
              <div className="space-y-2">
                <Label>{t('select_supplier') || 'Select supplier'} *</Label>
                <Select value={formData.supplier_id} onValueChange={setSupplierById}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('select_supplier') || 'Select supplier'} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.length === 0 ? (
                      <SelectItem value="none" disabled>{t('no_suppliers') || 'No suppliers'}</SelectItem>
                    ) : (
                      suppliers
                        .slice()
                        .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
                        .map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Upload */}
              {(formData.supplier_id || receipt) && (
                <div className="space-y-2">
                  <Label>{t('receipt_images') || 'Receipt images'} *</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                    onDrop={(e) => { e.preventDefault(); setDragActive(false); onFiles(e.dataTransfer?.files); }}
                  >
                    <input id="receipt-upload" type="file" accept="image/*,application/pdf" className="hidden" multiple onChange={(e) => onFiles(e.target.files)} />
                    <label htmlFor="receipt-upload" className="flex flex-col items-center gap-2 cursor-pointer">
                      {uploading ? (<Loader className="w-8 h-8 text-blue-600 animate-spin" />) : (<Upload className="w-8 h-8 text-gray-400" />)}
                      <span className="text-sm text-gray-600">{t('click_to_upload_images') || 'Click to upload files'}</span>
                      <span className="text-xs text-gray-500">{t('supports_images_pdf') || 'Supports images/PDF'}</span>
                    </label>
                  </div>

                  {formData.receipt_images?.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {formData.receipt_images.map((url, i) => (
                        <div key={i} className="relative">
                          <img src={url} alt="Receipt" className="w-full h-24 object-cover rounded" />
                          <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setFormData(prev => ({...prev, receipt_images: prev.receipt_images.filter((_, idx) => idx !== i)}))}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Invoice details */}
              {formData.receipt_images?.length > 0 && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                  <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <Scan className="w-5 h-5" />{t('invoice_details') || 'Invoice details'}
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600">{t('invoice_number') || 'Invoice number'} *</Label>
                      <Input
                        value={formData.invoice_number}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({ ...prev, invoice_number: val }));
                          if (formData.supplier_id) checkDuplicateInvoice(val, formData.supplier_id, receipt?.id);
                        }}
                        className="mt-1 font-semibold"
                        placeholder={t('enter_invoice_number') || 'Enter invoice number'}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">{t('invoice_date') || 'Invoice date'} *</nLabel>
                      <Input type="date" value={formData.invoice_date} onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))} className="mt-1 font-semibold" required />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">{t('invoice_total') || 'Invoice total'} ({t('including_vat') || 'incl. VAT'}) *</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={invoiceTotalInput}
                        onChange={(e) => {
                          const raw = e.target.value; setInvoiceTotalInput(raw);
                          const parsed = parseFloat(String(raw).replace(',', '.'));
                          if (!isNaN(parsed) && isFinite(parsed)) {
                            setFormData(prev => ({ ...prev, invoice_total: parsed, ...recalcTotals(prev.verified_items, parsed) }));
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseFloat(String(invoiceTotalInput || '').replace(',', '.'));
                          const finalVal = (!isNaN(parsed) && isFinite(parsed)) ? parsed : 0;
                          setInvoiceTotalInput(String(finalVal));
                          setFormData(prev => ({ ...prev, invoice_total: finalVal, ...recalcTotals(prev.verified_items, finalVal) }));
                        }}
                        className="mt-1 font-bold text-lg text-blue-700"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Flags + linking */}
              <div className="bg-white border rounded-lg p-3 mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" checked={!!formData.is_refund} onChange={(e) => setFormData(prev => ({...prev, is_refund: e.target.checked}))} />
                    <span>{language === 'he' ? 'חשבונית זיכוי' : 'Refund invoice'}</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" checked={!!formData.refund_received} onChange={(e) => setFormData(prev => ({...prev, refund_received: e.target.checked}))} />
                    <span>{language === 'he' ? 'זיכוי התקבל' : 'Credit received'}</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" checked={!!formData.needs_review} onChange={(e) => setFormData(prev => ({...prev, needs_review: e.target.checked}))} />
                    <span>{language === 'he' ? 'לבדיקה נוספת' : 'Needs review'}</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" checked={!!formData.reviewed} onChange={(e) => setFormData(prev => ({...prev, reviewed: e.target.checked}))} />
                    <span>{language === 'he' ? 'נבדק' : 'Reviewed'}</span>
                  </label>
                </div>

                {formData.is_refund && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600">{language === 'he' ? 'קישור לקבלה מקורית' : 'Link to original receipt'}</Label>
                      <Select value={formData.linked_receipt_id || ""} onValueChange={(v) => setFormData(prev => ({...prev, linked_receipt_id: v}))}>
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'he' ? 'בחר קבלה' : 'Select receipt'} />
                        </SelectTrigger>
                        <SelectContent>
                          {linkableReceipts.length === 0 ? (
                            <SelectItem value="none" disabled>{language === 'he' ? 'אין קבלות זמינות' : 'No receipts available'}</SelectItem>
                          ) : (
                            linkableReceipts.map(r => (
                              <SelectItem key={r.id} value={r.id}>
                                {(r.invoice_number || r.order_number || '-')} • {(r.received_date || '')} • {(r.supplier_name || '')}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {formData.needs_review && (
                  <div>
                    <Label className="text-xs text-gray-600">{language === 'he' ? 'סיבת בדיקה (אופציונלי)' : 'Review reason (optional)'}</Label>
                    <Input value={formData.review_note} onChange={(e) => setFormData(prev => ({...prev, review_note: e.target.value}))} placeholder={language === 'he' ? 'מה לבדוק?' : 'What to check?'} />
                  </div>
                )}
              </div>

              {/* Items (manual minimal) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">{formData.verified_items.length > 0 ? `${t('items') || 'Items'} (${formData.verified_items.length})` : (t('add_items') || 'Add items')}</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setFormData(prev => ({...prev, verified_items: [...prev.verified_items, { item_name: '', received_quantity: 0, actual_price: 0, actual_discount: 0, unit: 'unit' }] }))}>
                    <Plus className="w-4 h-4 ml-2" />{t('add_item') || 'Add item'}
                  </Button>
                </div>
                {formData.verified_items.length > 0 && (
                  <div className="space-y-3">
                    {formData.verified_items.map((item, index) => (
                      <Card key={index} className="border-blue-200 bg-blue-50">
                        <CardContent className="pt-4">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <Input value={item.item_name} onChange={(e) => {
                                const v = e.target.value; setFormData(prev => { const vi = [...prev.verified_items]; vi[index] = {...vi[index], item_name: v}; return {...prev, verified_items: vi}; });
                              }} placeholder={t('item_name') || 'Item name'} className="font-medium flex-1" />
                              <Button type="button" variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => setFormData(prev => ({...prev, verified_items: prev.verified_items.filter((_, i) => i !== index)}))}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs">{t('received') || 'Received'}</Label>
                                <Input type="number" step="0.01" value={item.received_quantity || 0} onChange={(e) => {
                                  const v = parseFloat(e.target.value) || 0; setFormData(prev => { const vi = [...prev.verified_items]; vi[index] = {...vi[index], received_quantity: v}; const r = recalcTotals(vi, prev.invoice_total); return {...prev, verified_items: vi, ...r}; });
                                }} />
                              </div>
                              <div>
                                <Label className="text-xs">{t('price') || 'Price'}</Label>
                                <Input type="number" step="0.01" value={item.actual_price || 0} onChange={(e) => {
                                  const v = parseFloat(e.target.value) || 0; setFormData(prev => { const vi = [...prev.verified_items]; vi[index] = {...vi[index], actual_price: v}; const r = recalcTotals(vi, prev.invoice_total); return {...prev, verified_items: vi, ...r}; });
                                }} />
                              </div>
                              <div>
                                <Label className="text-xs">{t('discount') || 'Discount'} %</Label>
                                <Input type="number" step="0.01" min="0" max="100" value={item.actual_discount || 0} onChange={(e) => {
                                  const v = parseFloat(e.target.value) || 0; setFormData(prev => { const vi = [...prev.verified_items]; vi[index] = {...vi[index], actual_discount: v}; const r = recalcTotals(vi, prev.invoice_total); return {...prev, verified_items: vi, ...r}; });
                                }} />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {duplicateExists && (
                <Alert variant="destructive" className="mt-2"><AlertDescription>{t('invoice_already_scanned') || 'This invoice number was already scanned for this supplier. You cannot save another copy.'}</AlertDescription></Alert>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700" disabled={!formData.invoice_number || Number(formData.invoice_total) === 0 || (formData.receipt_images?.length || 0) === 0 || duplicateExists}>
                  <PackageCheck className="w-4 h-4 ml-2" />{t('save_receipt') || 'Save receipt'}
                </Button>
                {receipt && onDelete && (
                  <Button type="button" variant="destructive" className="flex-1" onClick={() => onDelete(receipt)}>
                    <Trash2 className="w-4 h-4 ml-2" />{t('delete') || 'Delete'}
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={onCancel} className="flex-1">{t('cancel') || 'Cancel'}</Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}