import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader, Upload, X, Scan, AlertTriangle, TrendingDown, TrendingUp, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function ReceiptForm({ receipt, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    order_id: "",
    supplier_name: "",
    supplier_id: "",
    supplier_email: "",
    received_date: new Date().toISOString().split('T')[0],
    receipt_images: [],
    verified_items: [],
    price_changes_summary: [],
    has_price_changes: false,
    notes: "",
    status: "pending",
    ...receipt
  });

  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierItems, setSupplierItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const { t, language } = useLanguage();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [allOrders, allSuppliers] = await Promise.all([
      base44.entities.Order.list("-created_date"),
      base44.entities.Supplier.list("-created_date")
    ]);
    setOrders(allOrders);
    setSuppliers(allSuppliers);
  };

  const handleSupplierSelect = async (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      const items = await base44.entities.Item.filter({ supplier_id: supplierId });
      setSupplierItems(items);
      setFormData({
        ...formData,
        supplier_id: supplierId,
        supplier_name: supplier.name,
        supplier_email: supplier.email || "",
        order_id: "",
        order_number: language === 'he' ? 'קבלה ידנית' : 'Manual Receipt',
        verified_items: []
      });
    }
  };

  const addManualItem = (itemId) => {
    const item = supplierItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Check if already added
    if (formData.verified_items.some(vi => vi.item_id === itemId)) return;

    const newItem = {
      item_id: item.id,
      item_name: item.name,
      ordered_quantity: 0,
      certificate_quantity: 0,
      received_quantity: 0,
      unit: item.unit,
      catalog_price: item.price || 0,
      catalog_discount: item.discount || 0,
      actual_price: item.price || 0,
      actual_discount: item.discount || 0,
      price_changed: false,
      discount_changed: false,
      has_issue: false,
      issue_note: ""
    };

    setFormData({
      ...formData,
      verified_items: [...formData.verified_items, newItem]
    });
  };

  const removeManualItem = (index) => {
    const updated = formData.verified_items.filter((_, i) => i !== index);
    setFormData({ ...formData, verified_items: updated });
  };

  const handleOrderSelect = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      // Get catalog items to compare prices
      const catalogItems = await base44.entities.Item.filter({ supplier_id: order.supplier_id });
      
      const itemsWithPriceInfo = order.items.map(item => {
        const catalogItem = catalogItems.find(ci => ci.id === item.item_id);
        return {
          item_id: item.item_id,
          item_name: item.item_name,
          ordered_quantity: item.quantity,
          certificate_quantity: item.quantity,
          received_quantity: item.quantity,
          unit: item.unit,
          catalog_price: catalogItem?.price || 0,
          catalog_discount: catalogItem?.discount || 0,
          actual_price: catalogItem?.price || 0,
          actual_discount: catalogItem?.discount || 0,
          price_changed: false,
          discount_changed: false,
          has_issue: false,
          issue_note: ""
        };
      });

      setFormData({
        ...formData,
        order_id: orderId,
        order_number: order.order_number,
        supplier_name: order.supplier_name,
        supplier_id: order.supplier_id,
        supplier_email: order.supplier_email || "",
        verified_items: itemsWithPriceInfo
      });
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      setUploading(true);
      const uploadedUrls = [];

      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }

      setFormData({
        ...formData,
        receipt_images: [...formData.receipt_images, ...uploadedUrls]
      });
    } catch (error) {
      console.error("Error uploading images:", error);
      alert(t('error_uploading_images'));
    } finally {
      setUploading(false);
    }
  };

  const handleAutoScan = async () => {
    if (formData.receipt_images.length === 0) {
      alert(t('click_to_upload_images'));
      return;
    }

    try {
      setScanning(true);
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Scan this Hebrew receipt/invoice and extract:
        1. Invoice number (מספר חשבונית)
        2. Invoice date (תאריך)
        3. Invoice total amount (סכום סופי)
        4. For EACH item extract:
           - Item name (שם המוצר)
           - Quantity (כמות)
           - Unit price (מחיר יחידה)
           - Discount percentage if shown (הנחה %)
           - Total per item (סה"כ)
        
        Return JSON:
        {
          "invoice_number": "string",
          "invoice_date": "YYYY-MM-DD",
          "invoice_total": number,
          "items": [
            {
              "name": "string",
              "quantity": number,
              "price": number,
              "discount": number,
              "total": number
            }
          ]
        }`,
        file_urls: formData.receipt_images,
        response_json_schema: {
          type: "object",
          properties: {
            invoice_number: { type: "string" },
            invoice_date: { type: "string" },
            invoice_total: { type: "number" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  quantity: { type: "number" },
                  price: { type: "number" },
                  discount: { type: "number" },
                  total: { type: "number" }
                }
              }
            }
          }
        }
      });

      // Update verified items with scanned data and detect changes
      const updatedItems = formData.verified_items.map(verifiedItem => {
        const scannedItem = response.items?.find(
          si => si.name.toLowerCase().includes(verifiedItem.item_name.toLowerCase()) ||
                verifiedItem.item_name.toLowerCase().includes(si.name.toLowerCase())
        );

        if (scannedItem) {
          const priceChanged = Math.abs(verifiedItem.catalog_price - scannedItem.price) > 0.01;
          const discountChanged = Math.abs(verifiedItem.catalog_discount - scannedItem.discount) > 0.01;

          return {
            ...verifiedItem,
            received_quantity: scannedItem.quantity,
            actual_price: scannedItem.price,
            actual_discount: scannedItem.discount,
            price_changed: priceChanged,
            discount_changed: discountChanged
          };
        }
        return verifiedItem;
      });

      // Build price changes summary
      const priceChanges = updatedItems
        .filter(item => item.price_changed || item.discount_changed)
        .map(item => {
          const priceChangePercent = item.catalog_price > 0 
            ? ((item.actual_price - item.catalog_price) / item.catalog_price * 100)
            : 0;
          
          let changeType = "";
          if (item.price_changed && item.discount_changed) changeType = "both_changed";
          else if (item.actual_price > item.catalog_price) changeType = "price_increase";
          else if (item.actual_price < item.catalog_price) changeType = "price_decrease";
          else if (item.actual_discount > item.catalog_discount) changeType = "discount_increase";
          else if (item.actual_discount < item.catalog_discount) changeType = "discount_decrease";

          return {
            item_name: item.item_name,
            old_price: item.catalog_price,
            new_price: item.actual_price,
            price_change_percent: priceChangePercent,
            old_discount: item.catalog_discount,
            new_discount: item.actual_discount,
            change_type: changeType
          };
        });

      const calculatedTotal = updatedItems.reduce((sum, item) => {
        const itemPrice = item.actual_price * (1 - item.actual_discount / 100);
        return sum + (itemPrice * item.received_quantity);
      }, 0);

      setFormData({
        ...formData,
        invoice_number: response.invoice_number || "",
        invoice_date: response.invoice_date || formData.received_date,
        invoice_total: response.invoice_total || 0,
        calculated_total: calculatedTotal,
        totals_match: Math.abs((response.invoice_total || 0) - calculatedTotal) < 1,
        verified_items: updatedItems,
        price_changes_summary: priceChanges,
        has_price_changes: priceChanges.length > 0
      });

    } catch (error) {
      console.error("Error scanning invoice:", error);
      alert(t('error_processing_data'));
    } finally {
      setScanning(false);
    }
  };

  const updateVerifiedItem = (index, field, value) => {
    const updated = [...formData.verified_items];
    updated[index] = { ...updated[index], [field]: value };
    
    // Check if price or discount changed
    if (field === 'actual_price') {
      updated[index].price_changed = Math.abs(updated[index].catalog_price - value) > 0.01;
    }
    if (field === 'actual_discount') {
      updated[index].discount_changed = Math.abs(updated[index].catalog_discount - value) > 0.01;
    }

    // Rebuild price changes summary
    const priceChanges = updated
      .filter(item => item.price_changed || item.discount_changed)
      .map(item => ({
        item_name: item.item_name,
        old_price: item.catalog_price,
        new_price: item.actual_price,
        price_change_percent: item.catalog_price > 0 
          ? ((item.actual_price - item.catalog_price) / item.catalog_price * 100)
          : 0,
        old_discount: item.catalog_discount,
        new_discount: item.actual_discount,
        change_type: item.actual_price > item.catalog_price ? "price_increase" : 
                     item.actual_price < item.catalog_price ? "price_decrease" :
                     item.actual_discount > item.catalog_discount ? "discount_increase" : "discount_decrease"
      }));

    setFormData({
      ...formData,
      verified_items: updated,
      price_changes_summary: priceChanges,
      has_price_changes: priceChanges.length > 0
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const hasIssues = formData.verified_items.some(item => item.has_issue);
    const status = hasIssues ? "has_issues" : "verified";

    onSubmit({
      ...formData,
      status
    });
  };

  const getPriceChangeIcon = (changeType) => {
    if (changeType.includes('increase')) {
      return <TrendingUp className="w-4 h-4 text-red-600" />;
    }
    if (changeType.includes('decrease')) {
      return <TrendingDown className="w-4 h-4 text-green-600" />;
    }
    return <AlertTriangle className="w-4 h-4 text-orange-600" />;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{receipt ? t('edit_receipt') : t('create_new_receipt')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={!manualMode ? "default" : "outline"}
              onClick={() => setManualMode(false)}
              className={!manualMode ? "bg-gray-900" : ""}
            >
              {language === 'he' ? 'מהזמנה קיימת' : 'From Order'}
            </Button>
            <Button
              type="button"
              variant={manualMode ? "default" : "outline"}
              onClick={() => setManualMode(true)}
              className={manualMode ? "bg-gray-900" : ""}
            >
              {language === 'he' ? 'קבלה ידנית (ללא הזמנה)' : 'Manual Receipt (No Order)'}
            </Button>
          </div>

          {!manualMode ? (
            <div className="space-y-2">
              <Label htmlFor="order">{t('select_order')}</Label>
              <Select
                value={formData.order_id}
                onValueChange={handleOrderSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('select_order')} />
                </SelectTrigger>
                <SelectContent>
                  {orders.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <p>{t('no_confirmed_orders')}</p>
                      <p className="text-xs mt-2">{t('no_confirmed_orders_description')}</p>
                    </div>
                  ) : (
                    orders.map(order => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_number} - {order.supplier_name} ({new Date(order.created_date).toLocaleDateString()})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{language === 'he' ? 'בחר ספק' : 'Select Supplier'}</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={handleSupplierSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'he' ? 'בחר ספק' : 'Select Supplier'} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.supplier_id && supplierItems.length > 0 && (
                <div className="space-y-2">
                  <Label>{language === 'he' ? 'הוסף פריטים' : 'Add Items'}</Label>
                  <Select onValueChange={addManualItem}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'he' ? 'בחר פריט להוספה' : 'Select item to add'} />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierItems
                        .filter(item => !formData.verified_items.some(vi => vi.item_id === item.id))
                        .map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} - ₪{item.price}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="received_date">{t('received_date')}</Label>
            <Input
              id="received_date"
              type="date"
              value={formData.received_date}
              onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{t('receipt_images')}</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="receipt-upload"
                disabled={uploading}
              />
              <label htmlFor="receipt-upload" className="cursor-pointer flex flex-col items-center gap-2">
                {uploading ? (
                  <Loader className="w-8 h-8 text-gray-400 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-gray-400" />
                )}
                <span className="text-sm text-gray-600">{t('click_to_upload_images')}</span>
                <span className="text-xs text-gray-500">{t('supports_multiple_images')}</span>
              </label>
            </div>

            {formData.receipt_images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {formData.receipt_images.map((url, index) => (
                  <div key={index} className="relative">
                    <img src={url} alt={`Receipt ${index + 1}`} className="w-full h-24 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = formData.receipt_images.filter((_, i) => i !== index);
                        setFormData({ ...formData, receipt_images: newImages });
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {formData.receipt_images.length > 0 && (
              <Button
                type="button"
                onClick={handleAutoScan}
                disabled={scanning}
                className="w-full mt-2 bg-purple-600 hover:bg-purple-700"
              >
                {scanning ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {t('scanning_invoice')}
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4 mr-2" />
                    {t('auto_scan')}
                  </>
                )}
              </Button>
            )}
          </div>

          {formData.invoice_number && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">{t('invoice_number')}</p>
                <p className="font-medium">{formData.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('invoice_date')}</p>
                <p className="font-medium">{new Date(formData.invoice_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('invoice_total')}</p>
                <p className="font-medium">{formData.invoice_total.toFixed(2)} {t('currency')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('calculated_total')}</p>
                <p className="font-medium">{formData.calculated_total.toFixed(2)} {t('currency')}</p>
              </div>
              {formData.invoice_total > 0 && (
                <div className="col-span-2">
                  <Badge variant={formData.totals_match ? "default" : "destructive"}>
                    {formData.totals_match ? t('totals_match') : t('totals_mismatch')}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {formData.has_price_changes && (
            <Alert className="border-orange-300 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                <p className="font-semibold text-orange-800 mb-2">
                  {t('price_changes_detected') || 'זוהו שינויי מחיר!'} ({formData.price_changes_summary.length} {t('items')})
                </p>
                <div className="space-y-2">
                  {formData.price_changes_summary.map((change, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded">
                      <div className="flex items-center gap-2">
                        {getPriceChangeIcon(change.change_type)}
                        <span className="font-medium">{change.item_name}</span>
                      </div>
                      <div className="flex gap-4 text-xs">
                        {change.old_price !== change.new_price && (
                          <div>
                            <span className="text-gray-600">{t('price')}: </span>
                            <span className="line-through text-gray-500">{change.old_price.toFixed(2)}</span>
                            <span className="mx-1">→</span>
                            <span className={change.new_price > change.old_price ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                              {change.new_price.toFixed(2)}
                            </span>
                            <span className={change.new_price > change.old_price ? "text-red-600 ml-1" : "text-green-600 ml-1"}>
                              ({change.price_change_percent > 0 ? '+' : ''}{change.price_change_percent.toFixed(1)}%)
                            </span>
                          </div>
                        )}
                        {change.old_discount !== change.new_discount && (
                          <div>
                            <span className="text-gray-600">{t('discount')}: </span>
                            <span className="line-through text-gray-500">{change.old_discount}%</span>
                            <span className="mx-1">→</span>
                            <span className={change.new_discount < change.old_discount ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                              {change.new_discount}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {formData.verified_items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('verify_items')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.verified_items.map((item, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border-2 ${
                    item.price_changed || item.discount_changed 
                      ? 'border-orange-300 bg-orange-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-lg">{item.item_name}</h4>
                    <div className="flex items-center gap-2">
                      {(item.price_changed || item.discount_changed) && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {t('price_changed') || 'מחיר השתנה'}
                        </Badge>
                      )}
                      {manualMode && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeManualItem(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <Label className="text-xs">{t('ordered')}</Label>
                      <Input
                        type="number"
                        value={item.ordered_quantity}
                        disabled
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t('certificate_quantity')}</Label>
                      <Input
                        type="number"
                        value={item.certificate_quantity}
                        onChange={(e) => updateVerifiedItem(index, 'certificate_quantity', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t('received')}</Label>
                      <Input
                        type="number"
                        step="any"
                        value={item.received_quantity}
                        onChange={(e) => updateVerifiedItem(index, 'received_quantity', parseFloat(e.target.value))}
                        className="mt-1"
                        placeholder={language === 'he' ? 'ניתן להזין מינוס' : 'Can be negative'}
                      />
                      {item.received_quantity < 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                          {language === 'he' ? 'כמות שלילית (זיכוי/החזרה)' : 'Negative qty (credit/return)'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">{t('unit')}</Label>
                      <Input
                        value={item.unit}
                        disabled
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <Label className="text-xs flex items-center gap-2">
                        {t('price')}
                        {item.price_changed && <AlertTriangle className="w-3 h-3 text-orange-600" />}
                      </Label>
                      <div className="flex gap-2 items-center mt-1">
                        {item.catalog_price > 0 && (
                          <span className="text-xs text-gray-500 line-through">
                            {item.catalog_price.toFixed(2)}
                          </span>
                        )}
                        <Input
                          type="number"
                          step="0.01"
                          value={item.actual_price}
                          onChange={(e) => updateVerifiedItem(index, 'actual_price', parseFloat(e.target.value) || 0)}
                          className={item.price_changed ? 'border-orange-500 bg-orange-50' : ''}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-2">
                        {t('discount')} %
                        {item.discount_changed && <AlertTriangle className="w-3 h-3 text-orange-600" />}
                      </Label>
                      <div className="flex gap-2 items-center mt-1">
                        {item.catalog_discount > 0 && (
                          <span className="text-xs text-gray-500 line-through">
                            {item.catalog_discount}%
                          </span>
                        )}
                        <Input
                          type="number"
                          step="0.01"
                          value={item.actual_discount}
                          onChange={(e) => updateVerifiedItem(index, 'actual_discount', parseFloat(e.target.value) || 0)}
                          className={item.discount_changed ? 'border-orange-500 bg-orange-50' : ''}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={item.has_issue}
                      onChange={(e) => updateVerifiedItem(index, 'has_issue', e.target.checked)}
                      id={`issue-${index}`}
                      className="rounded"
                    />
                    <Label htmlFor={`issue-${index}`} className="text-sm cursor-pointer">
                      {t('issue')}
                    </Label>
                  </div>

                  {item.has_issue && (
                    <Textarea
                      value={item.issue_note}
                      onChange={(e) => updateVerifiedItem(index, 'issue_note', e.target.value)}
                      placeholder={t('issue_note')}
                      rows={2}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="notes">{t('notes')}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
          {receipt ? t('update_receipt') : t('save_receipt')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}