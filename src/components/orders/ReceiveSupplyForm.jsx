import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, Upload, X, Scan, AlertTriangle, TrendingUp, TrendingDown, Plus, RefreshCw, PackageCheck } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function ReceiveSupplyForm({ order, receipt, suppliers, onSubmit, onCancel, noOrderMode = false }) {
  const [items, setItems] = useState([]);
  const [catalogItems, setCatalogItems] = useState({});
  
  // Initialize form data from receipt (for editing) or empty (for new)
  const [formData, setFormData] = useState(() => {
    if (receipt) {
      // Editing existing receipt
      return {
        order_id: receipt.order_id || "",
        order_number: receipt.order_number || "",
        supplier_name: receipt.supplier_name || "",
        supplier_id: receipt.supplier_id || "",
        supplier_email: receipt.supplier_email || "",
        received_date: receipt.received_date || new Date().toISOString().split('T')[0],
        receipt_images: receipt.receipt_images || [],
        verified_items: receipt.verified_items || [],
        price_changes_summary: receipt.price_changes_summary || [],
        has_price_changes: receipt.has_price_changes || false,
        invoice_number: receipt.invoice_number || "",
        invoice_date: receipt.invoice_date || "",
        invoice_total: receipt.invoice_total || 0,
        calculated_total: receipt.calculated_total || 0,
        totals_match: receipt.totals_match || false,
        notes: receipt.notes || "",
        status: receipt.status || "pending",
        manual_entry_mode: true // Already has data, show edit mode
      };
    }
    // New receipt
    return {
      order_id: "",
      order_number: "",
      supplier_name: "",
      supplier_id: "",
      supplier_email: "",
      received_date: new Date().toISOString().split('T')[0],
      receipt_images: [],
      verified_items: [],
      price_changes_summary: [],
      has_price_changes: false,
      invoice_number: "",
      invoice_date: "",
      invoice_total: 0,
      calculated_total: 0,
      totals_match: false,
      notes: "",
      status: "pending",
      manual_entry_mode: false
    };
  });

  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const loadData = async () => {
      try {
        const allItems = await base44.entities.Item.list();
        setItems(allItems);
        
        const itemsMap = {};
        allItems.forEach(item => {
          itemsMap[item.id] = {
            price: item.price || 0,
            discount: item.discount || 0,
            name: item.name
          };
        });
        setCatalogItems(itemsMap);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const handleSupplierSelect = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setFormData(prev => ({
        ...prev,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        supplier_email: supplier.email || "",
        order_number: `MANUAL-${Date.now()}`
      }));
    }
  };



  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setFormData(prev => ({
        ...prev,
        receipt_images: [...prev.receipt_images, file_url]
      }));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(t('error_uploading_images'));
    } finally {
      setUploading(false);
    }
  };

  // Helper function to recalculate totals
  const recalculateTotals = (items, invoiceTotal) => {
    const calculatedTotal = items.reduce((sum, item) => {
      const actualPrice = parseFloat(item.actual_price) || 0;
      const actualDiscount = parseFloat(item.actual_discount) || 0;
      const receivedQuantity = parseFloat(item.received_quantity) || 0;

      const itemPricePerPackage = actualPrice * (1 - actualDiscount / 100);
      return sum + (itemPricePerPackage * receivedQuantity);
    }, 0);
    const totalsMatch = Math.abs(calculatedTotal - (parseFloat(invoiceTotal) || 0)) < 1;
    return { calculatedTotal, totalsMatch };
  };

  const handleAutoScan = async () => {
    if (!formData.receipt_images.length) {
      alert(t('click_to_upload_images'));
      return;
    }

    if (noOrderMode && !formData.supplier_id) {
      alert(t('supplier_required'));
      return;
    }

    try {
      setScanning(true);

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Scan this Hebrew invoice/receipt and extract ONLY the header information:

Extract ONLY these 3 fields:
1. Invoice number (מספר חשבונית or חשבונית מס')
2. Invoice date (תאריך or תאריך חשבונית) - return in YYYY-MM-DD format
3. Invoice total (סה"כ לתשלום or סה"כ כולל מע"ם)

DO NOT extract individual line items or products.

Return JSON:
{
  "invoice_number": "string",
  "invoice_date": "YYYY-MM-DD",
  "invoice_total": number
}`,
        file_urls: formData.receipt_images,
        response_json_schema: {
          type: "object",
          properties: {
            invoice_number: { type: "string" },
            invoice_date: { type: "string" },
            invoice_total: { type: "number" }
          }
        }
      });

      console.log('Scanned invoice header data:', response);

      if (noOrderMode) {
        setFormData(prev => ({
          ...prev,
          invoice_number: response.invoice_number || "",
          invoice_date: response.invoice_date || prev.received_date,
          invoice_total: response.invoice_total || 0,
          calculated_total: 0, // Reset calculated total as items are not scanned yet
          totals_match: false, // Reset totals match
          manual_entry_mode: true // Automatically switch to manual entry mode to allow editing/adding
        }));

        alert(t('scanning_complete') || 'סריקה הושלמה! הוסף פריטים ידנית.');

      } else {
        // Original flow for orders - only update invoice details from scan
        const invoiceTotal = response.invoice_total || 0;
        // Recalculate totals based on existing items and newly scanned invoice total
        const { calculatedTotal, totalsMatch } = recalculateTotals(formData.verified_items, invoiceTotal);

        setFormData(prev => ({
          ...prev,
          invoice_number: response.invoice_number || "",
          invoice_date: response.invoice_date || prev.received_date,
          invoice_total: invoiceTotal,
          calculated_total: calculatedTotal,
          totals_match: totalsMatch
        }));

        alert(t('scanning_complete') || 'סריקה הושלמה! בדוק את הפרטים.');
      }

    } catch (error) {
      console.error("Error scanning invoice:", error);
      alert(t('scanning_invoice') + ' - ' + (error.message || t('error_saving')));
    } finally {
      setScanning(false);
    }
  };

  const handleSkipScanAndEnterManually = () => {
    // When user clicks "Enter Manually", show the form with empty fields
    // This allows them to manually add items
    // The invoice details section will show because we set a flag
    setFormData(prev => ({
      ...prev,
      manual_entry_mode: true // Flag to show invoice details section
    }));
  };

  const updateVerifiedItem = (index, field, value) => {
    setFormData(prev => {
      const updatedVerifiedItems = [...prev.verified_items];
      updatedVerifiedItems[index] = { ...updatedVerifiedItems[index], [field]: value };
      
      // Update item-specific flags only if not in noOrderMode
      if (!noOrderMode && (field === 'actual_price' || field === 'actual_discount')) {
        const item = updatedVerifiedItems[index];
        item.price_changed = Math.abs(item.actual_price - item.catalog_price) > 0.01;
        item.discount_changed = Math.abs(item.actual_discount - item.catalog_discount) > 0.01;
      }

      // Re-calculate price changes summary for order-based flow
      let priceChangesSummary = prev.price_changes_summary;
      let hasPriceChanges = prev.has_price_changes;
      if (!noOrderMode) { // Only calculate for order-based mode where catalog prices exist
        let newHasPriceChanges = false;
        const newPriceChangesSummary = [];
        updatedVerifiedItems.forEach(item_ => {
          if (item_.price_changed || item_.discount_changed) {
            newHasPriceChanges = true;
            let changeType = "";
            if (item_.price_changed && item_.discount_changed) {
              changeType = "both_changed";
            } else if (item_.price_changed) {
              changeType = item_.actual_price > item_.catalog_price ? "price_increase" : "price_decrease";
            } else if (item_.discount_changed) {
              changeType = item_.actual_discount > item_.catalog_discount ? "discount_increase" : "discount_decrease";
            }
            const priceChangePercent = item_.catalog_price > 0 ? ((item_.actual_price - item_.catalog_price) / item_.catalog_price) * 100 : 0;
            newPriceChangesSummary.push({
              item_name: item_.item_name, old_price: item_.catalog_price, new_price: item_.actual_price,
              price_change_percent: priceChangePercent, old_discount: item_.catalog_discount,
              new_discount: item_.actual_discount, change_type: changeType
            });
          }
        });
        priceChangesSummary = newPriceChangesSummary;
        hasPriceChanges = newHasPriceChanges;
      }

      const { calculatedTotal, totalsMatch } = recalculateTotals(updatedVerifiedItems, prev.invoice_total);

      return {
        ...prev,
        verified_items: updatedVerifiedItems,
        price_changes_summary: priceChangesSummary,
        has_price_changes: hasPriceChanges,
        calculated_total: calculatedTotal,
        totals_match: totalsMatch
      };
    });
  };

  const addManualItem = () => {
    setFormData(prev => {
      const newItems = [...prev.verified_items, {
        item_id: "", // New items have no existing item_id
        item_name: "",
        ordered_quantity: 0,
        certificate_quantity: 0,
        received_quantity: 0,
        unit: "unit",
        catalog_price: 0,
        catalog_discount: 0,
        actual_price: 0,
        actual_discount: 0,
        price_changed: false,
        discount_changed: false,
        has_issue: false,
        issue_note: "",
        units_per_package: 1,
        price_after_discount: 0
      }];
      const { calculatedTotal, totalsMatch } = recalculateTotals(newItems, prev.invoice_total);
      return { ...prev, verified_items: newItems, calculated_total: calculatedTotal, totals_match: totalsMatch };
    });
  };

  const removeItem = (index) => {
    setFormData(prev => {
      const remainingItems = prev.verified_items.filter((_, i) => i !== index);
      const { calculatedTotal, totalsMatch } = recalculateTotals(remainingItems, prev.invoice_total);
      return { ...prev, verified_items: remainingItems, calculated_total: calculatedTotal, totals_match: totalsMatch };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (noOrderMode) {
      if (!formData.supplier_id) {
        alert(t('supplier_required'));
        return;
      }
      if (!formData.invoice_number || formData.invoice_total === 0) { // Check for 0 as well
        alert(t('invoice_details_required'));
        return;
      }
      if (formData.receipt_images.length === 0) {
        alert(t('receipt_images_required') || 'יש להעלות תמונות קבלה.');
        return;
      }
      // In noOrderMode, all items are new or manually added, no push report logic
    } else {
      if (!formData.order_id) {
        alert(t('select_order'));
        return;
      }
      
      const pushedItems = formData.verified_items.filter(item => 
        item.received_quantity > item.ordered_quantity
      );
      
      if (pushedItems.length > 0) {
        const pushData = pushedItems.map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          ordered_quantity: item.ordered_quantity,
          received_quantity: item.received_quantity,
          extra_quantity: item.received_quantity - item.ordered_quantity,
          unit: item.unit,
          price_per_unit: item.actual_price,
          extra_cost: (item.received_quantity - item.ordered_quantity) * item.actual_price
        }));
        
        const totalExtraCost = pushData.reduce((sum, item) => sum + item.extra_cost, 0);
        
        try {
          await base44.entities.SupplierPushReport.create({
            receipt_id: '',
            order_id: formData.order_id,
            supplier_id: formData.supplier_id,
            supplier_name: formData.supplier_name,
            receipt_date: formData.received_date,
            pushed_items: pushData,
            total_extra_items: pushedItems.length,
            total_extra_cost: totalExtraCost,
            notes: `Supplier provided more than ordered on ${pushedItems.length} items`
          });
          
          console.log('Supplier push report created');
        } catch (error) {
          console.error('Error creating supplier push report:', error);
        }
      }
    }

    onSubmit(formData);
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      receipt_images: prev.receipt_images.filter((_, i) => i !== index)
    }));
  };

  const getChangeIcon = (changeType) => {
    if (changeType?.includes('increase')) {
      return <TrendingUp className="w-4 h-4 text-red-600" />;
    }
    if (changeType?.includes('decrease')) {
      return <TrendingDown className="w-4 h-4 text-green-600" />;
    }
    return <AlertTriangle className="w-4 h-4 text-orange-600" />;
  };

  const getChangeBadgeColor = (changeType) => {
    if (changeType?.includes('increase')) return "bg-red-100 text-red-800";
    if (changeType?.includes('decrease')) return "bg-green-100 text-green-800";
    return "bg-orange-100 text-orange-800";
  };

  return (
    <Card className="mb-8 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl font-bold">
          {noOrderMode ? t('supply_without_order') : t('receive')}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {noOrderMode ? (
            <>
              <div className="space-y-2">
                <Label>{t('select_supplier')} *</Label>
                <Select onValueChange={handleSupplierSelect} value={formData.supplier_id}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('select_supplier')} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.length === 0 ? (
                      <SelectItem value="none" disabled>{t('no_suppliers')}</SelectItem>
                    ) : (
                      suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {(formData.supplier_id || receipt) && (
                <>
                  <div className="space-y-2">
                    <Label>{t('received_date')} *</Label>
                    <Input
                      type="date"
                      value={formData.received_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, received_date: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('receipt_images')} *</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="receipt-upload"
                        multiple
                      />
                      <label
                        htmlFor="receipt-upload"
                        className="flex flex-col items-center gap-2 cursor-pointer"
                      >
                        {uploading ? (
                          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                        ) : (
                          <Upload className="w-8 h-8 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-600">{t('click_to_upload_images')}</span>
                        <span className="text-xs text-gray-500">{t('supports_images_pdf')}</span>
                      </label>
                    </div>

                    {formData.receipt_images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {formData.receipt_images.map((url, index) => (
                          <div key={index} className="relative">
                            <img src={url} alt="Receipt" className="w-full h-24 object-cover rounded" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6"
                              onClick={() => removeImage(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {formData.receipt_images.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={handleAutoScan}
                          disabled={scanning}
                          className="flex-1 bg-purple-600 hover:bg-purple-700"
                        >
                          {scanning ? (
                            <>
                              <Loader className="w-4 h-4 ml-2 animate-spin" />
                              {t('scanning_invoice')}
                            </>
                          ) : (
                            <>
                              <Scan className="w-4 h-4 ml-2" />
                              {formData.manual_entry_mode ? (t('re_scan_header') || 'סרוק מחדש') : t('auto_scan')}
                            </>
                          )}
                        </Button>
                        
                        {!formData.manual_entry_mode && (
                          <Button
                            type="button"
                            onClick={handleSkipScanAndEnterManually}
                            variant="outline"
                            className="flex-1"
                          >
                            <Plus className="w-4 h-4 ml-2" />
                            {t('enter_manually') || 'הזן ידנית'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {(formData.receipt_images.length > 0) && (
                    <>
                      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                        <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                          <Scan className="w-5 h-5" />
                          {t('invoice_details') || 'פרטי חשבונית'}
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <Label className="text-xs text-gray-600">{t('invoice_number')} *</Label>
                            <Input
                              value={formData.invoice_number}
                              onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                              className="mt-1 font-semibold"
                              placeholder={t('enter_invoice_number') || 'הזן מספר חשבונית'}
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">{t('invoice_date')} *</Label>
                            <Input
                              type="date"
                              value={formData.invoice_date}
                              onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                              className="mt-1 font-semibold"
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">{t('invoice_total')} ({t('including_vat') || 'כולל מע"ם'}) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.invoice_total}
                              onChange={(e) => setFormData(prev => {
                                const newInvoiceTotal = parseFloat(e.target.value) || 0;
                                const { calculatedTotal, totalsMatch } = recalculateTotals(prev.verified_items, newInvoiceTotal);
                                return { ...prev, invoice_total: newInvoiceTotal, calculated_total: calculatedTotal, totals_match: totalsMatch };
                              })}
                              className="mt-1 font-bold text-lg text-blue-700"
                              placeholder="0.00"
                              required
                            />
                          </div>
                          {formData.verified_items.length > 0 && (
                            <div>
                              <Label className="text-xs text-gray-600">{t('calculated_total')}</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={formData.calculated_total}
                                disabled
                                className={`mt-1 font-bold text-lg ${formData.totals_match ? 'text-green-700' : 'text-red-700'}`}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold">
                            {formData.verified_items.length > 0 
                              ? (t('items') || 'פריטים') + ` (${formData.verified_items.length})`
                              : (t('add_items') || 'הוסף פריטים')
                            }
                          </Label>
                          <Button
                            type="button"
                            onClick={addManualItem}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="w-4 h-4 ml-2" />
                            {t('add_item') || 'הוסף פריט'}
                          </Button>
                        </div>
                        
                        {formData.verified_items.length > 0 && (
                          <div className="space-y-3">
                            {formData.verified_items.map((item, index) => (
                              <Card key={index} className="border-blue-200 bg-blue-50">
                                <CardContent className="pt-4">
                                  <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                      <Input
                                        value={item.item_name}
                                        onChange={(e) => updateVerifiedItem(index, 'item_name', e.target.value)}
                                        placeholder={t('item_name') || 'שם פריט'}
                                        className="font-medium flex-1"
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeItem(index)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <Label className="text-xs">{t('received')}</Label>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={item.received_quantity}
                                          onChange={(e) => updateVerifiedItem(index, 'received_quantity', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">{t('price')}</Label>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={item.actual_price}
                                          onChange={(e) => updateVerifiedItem(index, 'actual_price', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">{t('discount')} %</Label>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          max="100"
                                          value={item.actual_discount}
                                          onChange={(e) => updateVerifiedItem(index, 'actual_discount', parseFloat(e.target.value) || 0)}
                                        />
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={item.has_issue}
                                        onChange={(e) => updateVerifiedItem(index, 'has_issue', e.target.checked)}
                                        className="rounded"
                                      />
                                      <Label className="text-sm">{t('issue')}</Label>
                                    </div>

                                    {item.has_issue && (
                                      <Input
                                        placeholder={t('issue_note')}
                                        value={item.issue_note}
                                        onChange={(e) => updateVerifiedItem(index, 'issue_note', e.target.value)}
                                      />
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="submit" 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={!formData.invoice_number || formData.invoice_total === 0 || formData.receipt_images.length === 0}
                    >
                      <PackageCheck className="w-4 h-4 ml-2" />
                      {t('save_receipt')}
                    </Button>
                    <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                      {t('cancel')}
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}