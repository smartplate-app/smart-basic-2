import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, Upload, X, Scan, AlertTriangle, TrendingUp, TrendingDown, Plus, RefreshCw, PackageCheck, Trash2, FileText } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function ReceiveSupplyForm({ order, receipt, suppliers, onSubmit, onCancel, onDelete, noOrderMode = false }) {
  const [items, setItems] = useState([]);
  const [catalogItems, setCatalogItems] = useState({});
  const [availableSuppliers, setAvailableSuppliers] = useState(Array.isArray(suppliers) ? suppliers : []);
  
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
      is_refund: !!receipt.is_refund,
      needs_review: !!receipt.needs_review,
      review_note: receipt.review_note || "",
      refund_received: !!receipt.refund_received,
      reviewed: !!receipt.reviewed,
      linked_receipt_id: receipt.linked_receipt_id || "",
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
      is_refund: false,
      needs_review: false,
      review_note: "",
      refund_received: false,
      reviewed: false,
      linked_receipt_id: "",
      manual_entry_mode: false
    };
  });

  const [invoiceTotalInput, setInvoiceTotalInput] = useState(String((typeof formData.invoice_total === 'number' && !isNaN(formData.invoice_total)) ? formData.invoice_total : (formData.invoice_total || '')));
  useEffect(() => {
    setInvoiceTotalInput(String((typeof formData.invoice_total === 'number' && !isNaN(formData.invoice_total)) ? formData.invoice_total : (formData.invoice_total || '')));
  }, [formData.invoice_total]);

  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [matching, setMatching] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [duplicateExists, setDuplicateExists] = useState(false);
  const [duplicateReceipts, setDuplicateReceipts] = useState([]);
  const [previousReceipts, setPreviousReceipts] = useState([]);
  const { t, language } = useLanguage();
  const [scannedDocs, setScannedDocs] = useState([]);

  // Ensure no English keys show in Hebrew when translations are missing
  const safeT = (key, fallbackHe, fallbackEn) => {
    const v = t(key);
    if (language === 'he' && (v === key || !v)) return fallbackHe;
    if (v === key || !v) return fallbackEn ?? key;
    return v;
  };

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

  // Keep availableSuppliers in sync with parent prop
  useEffect(() => {
    if (Array.isArray(suppliers)) {
      setAvailableSuppliers(suppliers);
    }
  }, [suppliers]);

  // Fallback: if no suppliers provided, fetch from owner/head context so workers/managers can select
  useEffect(() => {
    const fetchFallbackSuppliers = async () => {
      try {
        if (availableSuppliers && availableSuppliers.length > 0) return;
        const u = await base44.auth.me();
        const workingEmail = u.acting_as_store_email || u.email;
        let ownerEmail = u.store_user_owner_email || null;
        if (!ownerEmail) {
          try {
            const recs = await base44.entities.StoreUser.filter({ user_email: workingEmail });
            if (Array.isArray(recs) && recs.length > 0) {
              const activeRec = recs.find(r => r.is_active !== false) || recs[0];
              ownerEmail = activeRec?.owner_email || null;
            }
          } catch {}
        }
        const emails = new Set([workingEmail]);
        if (ownerEmail) emails.add(ownerEmail);
        // Try to include chain head email (if exists)
        try {
          if (ownerEmail) {
            const stores = await base44.entities.ChainStore.filter({ user_email: ownerEmail });
            const effChainId = stores?.[0]?.chain_id || null;
            if (effChainId) {
              const chainRec = await base44.entities.Chain.filter({ id: effChainId });
              let headEmail = chainRec?.[0]?.head_store_user_email || null;
              if (!headEmail) {
                const storesInChain = await base44.entities.ChainStore.filter({ chain_id: effChainId });
                const headStore = storesInChain?.find(s => s.is_head_store);
                headEmail = headStore?.user_email || null;
              }
              if (headEmail) emails.add(headEmail);
            }
          }
        } catch {}

        const fetches = [];
        emails.forEach(e => {
          fetches.push(base44.entities.Supplier.filter({ created_by: e }, '-created_date'));
          fetches.push(base44.entities.Supplier.filter({ store_owner_email: e }, '-created_date'));
        });
        const lists = await Promise.all(fetches);
        const merged = lists.flat().filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
        setAvailableSuppliers(merged);
      } catch (e) {
        console.error('Fallback supplier load failed', e);
      }
    };
    fetchFallbackSuppliers();
  }, [availableSuppliers]);
  const handleSupplierSelect = (supplierId) => {
    const supplier = availableSuppliers.find(s => s.id === supplierId);
    if (supplier) {
      setFormData(prev => ({
        ...prev,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        supplier_email: supplier.email || "",
        order_number: `MANUAL-${Date.now()}`,
        manual_entry_mode: true // ensure form stays visible and no navigation occurs
      }));
    }
  };



  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      setUploading(true);
      const uploadedUrls = await Promise.all(files.map(async (file) => {
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return file_url;
        } catch (err) {
          console.error('Upload failed for file', file?.name, err);
          return null;
        }
      }));
      const urls = uploadedUrls.filter(Boolean);
      if (urls.length) {
        setFormData(prev => ({
          ...prev,
          receipt_images: [...prev.receipt_images, ...urls]
        }));
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      alert(t('error_uploading_images'));
    } finally {
      setUploading(false);
    }
  };

  // Drag & drop handlers (desktop)
  const onDropUpload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
    if (!files.length) return;
    const eventLike = { target: { files } };
    await handleImageUpload(eventLike);
  };
  const onDragOverUpload = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const onDragLeaveUpload = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };

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

  // Sanitize invoice number: avoid times and strip spaces/punctuation; keep common prefixes (e.g., I2600000777)
  const sanitizeInvoiceNumber = (raw) => {
    if (!raw) return '';
    const s = String(raw).trim();
    // HH:MM or HH.MM
    if (/^\d{1,2}[:.]\d{2}$/.test(s)) return '';
    // 4-digit time-like (e.g., 2325)
    if (/^\d{4}$/.test(s)) {
      const hh = parseInt(s.slice(0, 2), 10);
      const mm = parseInt(s.slice(2), 10);
      if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) return '';
    }
    // Remove spaces and non word chars except dash and slash
    return s.replace(/\s+/g, '').replace(/[^\w\-\/]/g, '');
  };

  const checkDuplicateInvoice = async (invoiceNum, supplierId, excludeId) => {
  if (!invoiceNum || !supplierId) { setDuplicateExists(false); setDuplicateReceipts([]); return false; }
  try {
    // Align duplicate check with what the list shows: only receipts created by the current working user
    const me = await base44.auth.me();
    const workingEmail = me.acting_as_store_email || me.email;
    const normalizedNumber = String(invoiceNum).trim();

    const results = await base44.entities.SupplyReceipt.filter({
      supplier_id: supplierId,
      invoice_number: normalizedNumber,
      created_by: workingEmail
    });

    const filtered = (results || []).filter(r => !excludeId || r.id !== excludeId);
    if (filtered.length > 0) {
      setDuplicateExists(true);
      setDuplicateReceipts(filtered);
      return true;
    } else {
      setDuplicateExists(false);
      setDuplicateReceipts([]);
      return false;
    }
  } catch (e) {
    console.error('Duplicate check failed:', e);
    return false;
  }
};

// Load previous non-refund receipts for linking when refund toggled and supplier selected
useEffect(() => {
  (async () => {
    try {
      if (!formData.is_refund || !(formData.supplier_id || receipt?.supplier_id)) { setPreviousReceipts([]); return; }
      const supplierId = formData.supplier_id || receipt?.supplier_id;
      const list = await base44.entities.SupplyReceipt.filter({ supplier_id: supplierId });
      const filtered = (list || []).filter(r => !r.is_refund && (!receipt || r.id !== receipt.id));
      setPreviousReceipts(filtered.slice(0, 200));
    } catch (e) { setPreviousReceipts([]); }
  })();
}, [formData.is_refund, formData.supplier_id]);

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

      if (formData.receipt_images.length > 1) {
        const supplierId = formData.supplier_id || (receipt?.supplier_id || '');
        const results = await Promise.all(
          formData.receipt_images.map(async (url) => {
            const resp = await base44.integrations.Core.InvokeLLM({
              prompt: `You are extracting header fields from a HEBREW supplier invoice image.

STRICT RULES:
- Only use HEBREW labels. Ignore any ENGLISH words like "invoice".
- For invoice_number: find the Hebrew term closest to the number: "מספר חשבונית", "חשבונית מס'", "מס' חשבונית", or the standalone word "חשבונית" followed immediately by a number/code. Capture the exact token right after it (may include letters like "I", digits, '/', or '-').
- Never use times or print times (e.g., "שעת הדפסה"). If you see a time like HH:MM (e.g., 23:25) or a 4-digit value that looks like a time (2325), DO NOT return it as invoice_number.
- For invoice_date: use "תאריך חשבונית" (or equivalent), not "תאריך הדפסה". Return YYYY-MM-DD.
- For invoice_total: use totals labeled in Hebrew such as "סה"כ לתשלום" or "סה"כ כולל מע"מ".
- DO NOT extract line items.

REFUND LOGIC:
- If the document contains "זיכוי" or "החזר" → is_refund=true and invoice_total must be NEGATIVE.
- Otherwise is_refund=false and invoice_total POSITIVE.

Return JSON strictly as:
{
  "invoice_number": "string",
  "invoice_date": "YYYY-MM-DD",
  "invoice_total": number,
  "is_refund": boolean
}`,
              file_urls: [url],
              response_json_schema: {
                type: "object",
                properties: {
                  invoice_number: { type: "string" },
                  invoice_date: { type: "string" },
                  invoice_total: { type: "number" },
                  is_refund: { type: "boolean" }
                }
              }
            });
            const isRefund = Boolean(resp.is_refund) || (typeof resp.invoice_total === 'number' && resp.invoice_total < 0);
            const total = typeof resp.invoice_total === 'number' ? (isRefund ? -Math.abs(resp.invoice_total) : Math.abs(resp.invoice_total)) : 0;
            const inv = sanitizeInvoiceNumber(resp.invoice_number || '');
            const dup = supplierId ? await checkDuplicateInvoice(inv, supplierId, receipt?.id) : false;
            return { file_url: url, invoice_number: inv, invoice_date: resp.invoice_date || formData.received_date, invoice_total: total, is_refund: isRefund, duplicate: dup };
          })
        );
        setScannedDocs(results);
        setFormData(prev => ({ ...prev, manual_entry_mode: true }));
        const missingCount = results.filter(d => !d.invoice_total || Number(d.invoice_total) === 0).length;
        if (missingCount > 0) {
          alert(language === 'he' ? `לא נמצא סכום ב-${missingCount} חשבוניות; הסכום נקבע ל-0. ניתן לערוך ידנית.` : `No total found on ${missingCount} invoice(s); amount set to 0. You can edit manually.`);
        } else {
          alert(t('scanning_complete') || 'סריקה הושלמה! בדוק את הפרטים לכל חשבונית.');
        }
        return;
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are extracting header fields from a HEBREW supplier invoice image.

STRICT RULES:
- Only use HEBREW labels. Ignore any ENGLISH words like "invoice".
- For invoice_number: find the Hebrew term closest to the number: "מספר חשבונית", "חשבונית מס'", "מס' חשבונית", or the standalone word "חשבונית" followed immediately by a number/code. Capture the exact token right after it (may include letters like "I", digits, '/', or '-').
- Never use times or print times (e.g., "שעת הדפסה"). If you see a time like HH:MM (e.g., 23:25) or a 4-digit value that looks like a time (2325), DO NOT return it as invoice_number.
- For invoice_date: use "תאריך חשבונית" (or equivalent), not "תאריך הדפסה". Return YYYY-MM-DD.
- For invoice_total: use totals labeled in Hebrew such as "סה"כ לתשלום" or "סה"כ כולל מע"מ".
- DO NOT extract line items.

REFUND LOGIC:
- If the document contains "זיכוי" or "החזר" → is_refund=true and invoice_total must be NEGATIVE.
- Otherwise is_refund=false and invoice_total POSITIVE.

Return JSON strictly as:
{
  "invoice_number": "string",
  "invoice_date": "YYYY-MM-DD",
  "invoice_total": number,
  "is_refund": boolean
}`,
        file_urls: formData.receipt_images,
        response_json_schema: {
          type: "object",
          properties: {
            invoice_number: { type: "string" },
            invoice_date: { type: "string" },
            invoice_total: { type: "number" },
            is_refund: { type: "boolean" }
          }
        }
      });

      console.log('Scanned invoice header data:', response);

      const responseIsRefund = Boolean(response.is_refund) || (typeof response.invoice_total === 'number' && response.invoice_total < 0);
      const adjustedInvoiceTotal = typeof response.invoice_total === 'number'
        ? (responseIsRefund ? -Math.abs(response.invoice_total) : Math.abs(response.invoice_total))
        : 0;

      const invoiceNum = sanitizeInvoiceNumber(response.invoice_number || '');

      setInvoiceTotalInput(String(adjustedInvoiceTotal));

      const noTotalFound = !(typeof response.invoice_total === 'number') || !isFinite(response.invoice_total) || Math.abs(response.invoice_total) === 0;

      if (noOrderMode) {
        setFormData(prev => ({
          ...prev,
          invoice_number: invoiceNum,
          invoice_date: response.invoice_date || prev.received_date,
          invoice_total: adjustedInvoiceTotal,
          is_refund: responseIsRefund,
          calculated_total: 0, // Reset calculated total as items are not scanned yet
          totals_match: false, // Reset totals match
          manual_entry_mode: true // Automatically switch to manual entry mode to allow editing/adding
        }));

        const supplierId = formData.supplier_id || (receipt?.supplier_id || '');
        const isDup = await checkDuplicateInvoice(invoiceNum, supplierId, receipt?.id);
        if (isDup) {
          alert(t('invoice_already_scanned') || 'This invoice number was already scanned for this supplier.');
        } else {
          if (noTotalFound) {
            alert(language === 'he' ? 'לא נמצא סכום בחשבונית; הסכום נקבע ל-0. ניתן לערוך ידנית.' : 'No total found on the invoice; amount set to 0. You can edit it manually.');
          } else {
            alert(t('scanning_complete') || 'סריקה הושלמה! הוסף פריטים ידנית.');
          }
        }

      } else {
        // Original flow for orders - only update invoice details from scan
        const invoiceTotal = adjustedInvoiceTotal;
        // Recalculate totals based on existing items and newly scanned invoice total
        const { calculatedTotal, totalsMatch } = recalculateTotals(formData.verified_items, invoiceTotal);

        setFormData(prev => ({
          ...prev,
          invoice_number: invoiceNum,
          invoice_date: response.invoice_date || prev.received_date,
          invoice_total: invoiceTotal,
          is_refund: responseIsRefund,
          calculated_total: calculatedTotal,
          totals_match: totalsMatch
        }));

        const supplierId = formData.supplier_id || (receipt?.supplier_id || '');
        const isDup = await checkDuplicateInvoice(invoiceNum, supplierId, receipt?.id);
        if (isDup) {
          alert(t('invoice_already_scanned') || 'This invoice number was already scanned for this supplier.');
        } else {
          if (noTotalFound) {
            alert(language === 'he' ? 'לא נמצא סכום בחשבונית; הסכום נקבע ל-0. ניתן לערוך ידנית.' : 'No total found on the invoice; amount set to 0. You can edit it manually.');
          } else {
            alert(t('scanning_complete') || 'סריקה הושלמה! בדוק את הפרטים.');
          }
        }
      }

    } catch (error) {
      console.error("Error scanning invoice:", error);
      alert(t('scanning_invoice') + ' - ' + (error.message || t('error_saving')));
    } finally {
      setScanning(false);
    }
  };

  const handleScanAndMatchItems = async () => {
      if (!formData.receipt_images.length) { alert(t('click_to_upload_images')); return; }
      if (noOrderMode && !formData.supplier_id) { alert(t('supplier_required')); return; }
      try {
        setMatching(true);
        const { data } = await base44.functions.invoke('scanAndMatchReceipt', {
          file_urls: formData.receipt_images,
          supplier_id: formData.supplier_id || null,
        });
        const rows = Array.isArray(data?.items) ? data.items : [];
        const mapped = rows.map(r => ({
          item_id: r.item_id || "",
          item_name: r.item_name || r.name_extracted || r.name || "",
          ordered_quantity: 0,
          certificate_quantity: 0,
          received_quantity: Number(r.quantity || 0),
          unit: r.unit || "unit",
          catalog_price: 0,
          catalog_discount: 0,
          actual_price: Number(r.price || 0),
          actual_discount: 0,
          price_changed: false,
          discount_changed: false,
          has_issue: !r.item_id || Number(r.match_confidence || 0) < 0.6,
          issue_note: (!r.item_id || Number(r.match_confidence || 0) < 0.6) ? 'Low confidence match' : '',
          units_per_package: 1,
          price_after_discount: 0,
        }));
        const { calculatedTotal, totalsMatch } = recalculateTotals(mapped, formData.invoice_total);
        setFormData(prev => ({
          ...prev,
          verified_items: mapped,
          calculated_total: calculatedTotal,
          totals_match: totalsMatch,
          manual_entry_mode: true,
        }));
      } catch (e) {
        alert((language === 'he' ? 'שגיאה בהתאמת פריטים' : 'Error matching items') + ': ' + (e?.message || e));
      } finally {
        setMatching(false);
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
      if (!formData.invoice_number) {
        alert(t('invoice_number_required') || 'יש לציין מספר חשבונית.');
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

    const dup = await checkDuplicateInvoice(formData.invoice_number, formData.supplier_id || (receipt?.supplier_id || ''), receipt?.id);
    if (dup) { alert(t('invoice_already_scanned') || 'This invoice number was already scanned for this supplier.'); return; }
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
                <Select onValueChange={(val) => { handleSupplierSelect(val); }} value={formData.supplier_id}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('select_supplier')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(!availableSuppliers || availableSuppliers.length === 0) ? (
                      <SelectItem value="none" disabled>{t('no_suppliers')}</SelectItem>
                    ) : (
                    [...availableSuppliers]
                      .slice()
                      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
                      .map(supplier => (
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
                    <Label>{t('receipt_images')} *</Label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-4 ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
                      onDragOver={onDragOverUpload}
                      onDragLeave={onDragLeaveUpload}
                      onDrop={onDropUpload}
                    >
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
                        <span className="text-sm text-gray-600">{safeT('click_to_upload_images', '\u05dc\u05d7\u05e6\u05d5 \u05dc\u05d4\u05e2\u05dc\u05d0\u05ea \u05ea\u05de\u05d5\u05e0\u05d5\u05ea', 'Click to upload images')}</span>
                        <span className="text-xs text-gray-500">{safeT('supports_images_pdf', 'תמיכה: תמונות/PDF', 'Supports: images/PDF')}</span>
                        <span className="text-xs text-gray-500">
                          {language === 'he' ? 'או גררו ושחררו כאן קבצים (תמונות/PDF)' : 'or drag & drop files here (images/PDF)'}
                        </span>
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
                        
                        <Button
                            type="button"
                            onClick={handleScanAndMatchItems}
                            disabled={matching}
                            variant="outline"
                            className="flex-1"
                          >
                            <FileText className="w-4 h-4 ml-2" />
                            {language === 'he' ? 'התאם פריטים' : 'Match items'}
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

                  {scannedDocs.length > 1 ? (
                    <>
                      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                        <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                          <Scan className="w-5 h-5" />
                          {t('invoice_details') || 'פרטי חשבונית'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {scannedDocs.map((doc, idx) => (
                            <Card key={doc.file_url || idx} className="overflow-hidden">
                              <CardContent className="pt-4 space-y-3">
                                <div className="aspect-video bg-white/40 rounded border">
                                  <img src={doc.file_url} alt={`Invoice ${idx+1}`} className="w-full h-full object-contain" />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-600">{t('invoice_number')} *</Label>
                                  <Input
                                    value={doc.invoice_number}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setScannedDocs(prev => {
                                        const copy = [...prev];
                                        copy[idx] = { ...copy[idx], invoice_number: val };
                                        return copy;
                                      });
                                      const supplierId = (formData.supplier_id || (receipt?.supplier_id));
                                      if (supplierId) {
                                        checkDuplicateInvoice(val, supplierId, receipt?.id).then(dup => {
                                          setScannedDocs(prev => {
                                            const copy = [...prev];
                                            copy[idx] = { ...copy[idx], duplicate: dup };
                                            return copy;
                                          });
                                        });
                                      }
                                    }}
                                    className="mt-1 font-semibold"
                                    required
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-600">{t('invoice_date')} *</Label>
                                  <Input
                                     type="date"
                                     value={doc.invoice_date}
                                     onChange={(e) => setScannedDocs(prev => {
                                       const copy = [...prev];
                                       copy[idx] = { ...copy[idx], invoice_date: e.target.value };
                                       return copy;
                                     })}
                                     lang={language === 'he' ? 'he-IL' : undefined}
                                     className="mt-1 font-semibold"
                                     required
                                   />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-600">{t('invoice_total')} ({t('including_vat') || 'כולל מע"ם'}) *</Label>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={String(doc.invoice_total ?? '')}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const normalized = raw.replace(',', '.');
                                      const parsed = parseFloat(normalized);
                                      setScannedDocs(prev => {
                                        const copy = [...prev];
                                        copy[idx] = { ...copy[idx], invoice_total: (!isNaN(parsed) && isFinite(parsed)) ? parsed : 0 };
                                        return copy;
                                      });
                                    }}
                                    className="mt-1 font-bold text-lg text-blue-700"
                                    placeholder="0.00"
                                    required
                                  />
                                </div>
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={!!doc.is_refund}
                                    onChange={(e) => setScannedDocs(prev => {
                                      const copy = [...prev];
                                      const val = e.target.checked;
                                      copy[idx] = { ...copy[idx], is_refund: val, invoice_total: typeof copy[idx].invoice_total === 'number' ? (val ? -Math.abs(copy[idx].invoice_total) : Math.abs(copy[idx].invoice_total)) : copy[idx].invoice_total };
                                      return copy;
                                    })}
                                    className="rounded"
                                  />
                                  <span>{language === 'he' ? 'חשבונית זיכוי' : 'Refund invoice'}</span>
                                </label>
                                {doc.duplicate && (
                                  <Alert variant="destructive">
                                    <AlertDescription>
                                      {t('invoice_already_scanned') || 'This invoice number was already scanned for this supplier.'}
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (formData.receipt_images.length > 0) && (
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
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData(prev => ({ ...prev, invoice_number: val }));
                                const supplierId = (formData.supplier_id || (receipt?.supplier_id));
                                if (supplierId) { checkDuplicateInvoice(val, supplierId, receipt?.id); }
                              }}
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
                              lang={language === 'he' ? 'he-IL' : undefined}
                              className="mt-1 font-semibold"
                              required
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">{t('invoice_total')} ({t('including_vat') || 'כולל מע"ם'}) *</Label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={invoiceTotalInput}
                              onChange={(e) => {
                                const raw = e.target.value;
                                setInvoiceTotalInput(raw);
                                const normalized = raw.replace(',', '.');
                                const parsed = parseFloat(normalized);
                                if (!isNaN(parsed) && isFinite(parsed)) {
                                  setFormData(prev => {
                                    const { calculatedTotal, totalsMatch } = recalculateTotals(prev.verified_items, parsed);
                                    return { ...prev, invoice_total: parsed, calculated_total: calculatedTotal, totals_match: totalsMatch };
                                  });
                                }
                              }}
                              onBlur={() => {
                                const normalized = String(invoiceTotalInput || '').replace(',', '.');
                                const parsed = parseFloat(normalized);
                                const finalVal = (!isNaN(parsed) && isFinite(parsed)) ? parsed : 0;
                                setInvoiceTotalInput(String(finalVal));
                                setFormData(prev => {
                                  const { calculatedTotal, totalsMatch } = recalculateTotals(prev.verified_items, finalVal);
                                  return { ...prev, invoice_total: finalVal, calculated_total: calculatedTotal, totals_match: totalsMatch };
                                });
                              }}
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

                      <div className="bg-white border rounded-lg p-3 mt-3 space-y-3">
                        <div className="flex items-center gap-4 flex-wrap">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={!!formData.is_refund}
                              onChange={(e) => setFormData(prev => ({ ...prev, is_refund: e.target.checked }))}
                              className="rounded"
                            />
                            <span>{language === 'he' ? 'חשבונית זיכוי' : 'Refund invoice'}</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={!!formData.needs_review}
                              onChange={(e) => setFormData(prev => ({ ...prev, needs_review: e.target.checked }))}
                              className="rounded"
                            />
                            <span>{language === 'he' ? 'לבדיקה נוספת' : 'Needs review'}</span>
                          </label>
                          {formData.is_refund && (
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={!!formData.refund_received}
                                onChange={(e) => setFormData(prev => ({ ...prev, refund_received: e.target.checked }))}
                                className="rounded"
                              />
                              <span>{language === 'he' ? 'זיכוי התקבל' : 'Credit received'}</span>
                            </label>
                          )}
                          {formData.needs_review && (
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={!!formData.reviewed}
                                onChange={(e) => setFormData(prev => ({ ...prev, reviewed: e.target.checked }))}
                                className="rounded"
                              />
                              <span>{language === 'he' ? 'נבדק' : 'Reviewed'}</span>
                            </label>
                          )}
                        </div>
                        {formData.is_refund && (
                          <div className="mt-3">
                            <Label className="text-xs text-gray-600">{language === 'he' ? 'קשר לחשבונית המקורית (אופציונלי)' : 'Link to original receipt (optional)'} </Label>
                            <Select
                              value={formData.linked_receipt_id || ''}
                              onValueChange={(val) => setFormData(prev => ({ ...prev, linked_receipt_id: val }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={language === 'he' ? 'בחר קבלה לקישור' : 'Select receipt to link'} />
                              </SelectTrigger>
                              <SelectContent>
                                {(previousReceipts || []).slice(0,200).map(r => (
                                  <SelectItem key={r.id} value={r.id}>
                                    {(r.order_number || r.invoice_number || r.id)} • {new Date(r.received_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')} • {r.supplier_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {formData.needs_review && (
                          <div>
                            <Label className="text-xs text-gray-600">{language === 'he' ? 'סיבת בדיקה (אופציונלי)' : 'Review reason (optional)'} </Label>
                            <Input
                              value={formData.review_note}
                              onChange={(e) => setFormData(prev => ({ ...prev, review_note: e.target.value }))}
                              placeholder={language === 'he' ? 'מה לבדוק?' : 'What to check?'}
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-semibold">
                            {formData.verified_items.length > 0 
                              ? (t('items') || 'פריטים') + ` (${formData.verified_items.length})`
                              : (safeT('add_items', '\u05d4\u05d5\u05e1\u05e3 \u05e4\u05e8\u05d9\u05d8\u05d9\u05dd', 'Add items') || 'הוסף פריטים')
                            }
                          </Label>
                          <Button
                            type="button"
                            onClick={addManualItem}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="w-4 h-4 ml-2" />
                            {safeT('add_item', 'הוסף פריט', 'Add item')}
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

                  {duplicateExists && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertDescription>
                          {t('invoice_already_scanned') || 'This invoice number was already scanned for this supplier. You cannot save another copy.'}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-3 pt-4">
                      {scannedDocs.length > 1 ? (
                        <>
                          <Button
                            type="button"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            disabled={!formData.supplier_id || scannedDocs.some(d => !d.invoice_number || !d.invoice_date || d.duplicate)}
                            onClick={async () => {
                              const baseData = {
                                supplier_id: formData.supplier_id,
                                supplier_name: formData.supplier_name,
                                supplier_email: formData.supplier_email,
                                received_date: formData.received_date,
                                verified_items: [],
                                price_changes_summary: [],
                                has_price_changes: false,
                                notes: formData.notes || "",
                                status: "pending",
                                needs_review: !!formData.needs_review,
                                review_note: formData.review_note || ""
                              };
                              const payloads = scannedDocs.map((d, i) => ({
                                ...baseData,
                                order_id: "",
                                order_number: `MANUAL-${Date.now()}-${i+1}`,
                                receipt_images: [d.file_url],
                                invoice_number: d.invoice_number,
                                invoice_date: d.invoice_date,
                                invoice_total: d.invoice_total,
                                calculated_total: 0,
                                totals_match: false,
                                is_refund: !!d.is_refund,
                                refund_received: !!(d.is_refund && formData.refund_received),
                                reviewed: !!(formData.needs_review && formData.reviewed),
                                linked_receipt_id: formData.linked_receipt_id || ""
                              }));
                              try {
                                if (base44.entities.SupplyReceipt.bulkCreate) {
                                  await base44.entities.SupplyReceipt.bulkCreate(payloads);
                                } else {
                                  await Promise.all(payloads.map(p => base44.entities.SupplyReceipt.create(p)));
                                }
                                alert(language === 'he' ? 'נשמרו כל החשבוניות' : 'All invoices saved');
                                onCancel && onCancel();
                              } catch (e) {
                                alert((language === 'he' ? 'שמירה נכשלה' : 'Save failed') + ': ' + (e?.message || e));
                              }
                            }}
                          >
                            <PackageCheck className="w-4 h-4 ml-2" />
                            {language === 'he' ? 'שמור הכל' : 'Save all'}
                          </Button>
                          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                            {t('cancel')}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            type="submit" 
                            className="flex-1 bg-green-600 hover:bg-green-700"
                                                         disabled={!formData.invoice_number || formData.receipt_images.length === 0 || duplicateExists}
                          >
                            <PackageCheck className="w-4 h-4 ml-2" />
                            {t('save_receipt')}
                          </Button>
                          {receipt && onDelete && (
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => onDelete(receipt)}
                              className="flex-1"
                            >
                              <Trash2 className="w-4 h-4 ml-2" />
                              {t('delete') || 'Delete'}
                            </Button>
                          )}
                          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                            {t('cancel')}
                          </Button>
                        </>
                      )}
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