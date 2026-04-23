import React, { useState, useEffect, useRef } from "react";
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
import PdfThumbnail from "@/components/receipts/PdfThumbnail";

export default function ReceiveSupplyForm({ order, receipt, suppliers, onSubmit, onCancel, onDelete, noOrderMode = false, autoOpenUpload = false, user }) {
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
      awaiting_credit: !!receipt.awaiting_credit,
      reviewed: !!receipt.reviewed,
      linked_receipt_id: receipt.linked_receipt_id || "",
      summarized_delivery_note_ids: receipt.summarized_delivery_note_ids || [],
      document_type: receipt.document_type || "invoice",
      is_zero_vat: !!receipt.is_zero_vat,
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
      awaiting_credit: false,
      summarized_delivery_note_ids: [],
      document_type: "invoice",
      is_zero_vat: false,
      manual_entry_mode: false
    };
  });

  const [exclVatInput, setExclVatInput] = useState("");
  const [inclVatInput, setInclVatInput] = useState("");

  useEffect(() => {
    if (formData.invoice_total !== undefined && formData.invoice_total !== null && !inclVatInput) {
      setInclVatInput(String(formData.invoice_total));
      const userVatMultiplier = 1 + (user?.vat_percent ?? 18) / 100;
      const vatRate = formData.is_zero_vat ? 1 : userVatMultiplier;
      setExclVatInput(String((formData.invoice_total / vatRate).toFixed(2)));
    }
  }, [formData.invoice_total, formData.is_zero_vat, user]);

  const handleExclVatChange = (raw) => {
     setExclVatInput(raw);
     const parsed = parseFloat(raw.replace(',', '.'));
     if (!isNaN(parsed)) {
        const userVatMultiplier = 1 + (user?.vat_percent ?? 18) / 100;
        const vatRate = formData.is_zero_vat ? 1 : userVatMultiplier;
        const incl = parsed * vatRate;
        const finalIncl = formData.is_refund ? -Math.abs(incl) : Math.abs(incl);
        setInclVatInput(finalIncl.toFixed(2));
        updateInvoiceTotal(finalIncl);
     }
  };

  const handleInclVatChange = (raw) => {
     setInclVatInput(raw);
     const parsed = parseFloat(raw.replace(',', '.'));
     if (!isNaN(parsed)) {
        const userVatMultiplier = 1 + (user?.vat_percent ?? 18) / 100;
        const vatRate = formData.is_zero_vat ? 1 : userVatMultiplier;
        const excl = parsed / vatRate;
        const finalExcl = formData.is_refund ? -Math.abs(excl) : Math.abs(excl);
        setExclVatInput(finalExcl.toFixed(2));
        const finalIncl = formData.is_refund ? -Math.abs(parsed) : Math.abs(parsed);
        updateInvoiceTotal(finalIncl);
     }
  };

  const updateInvoiceTotal = (val) => {
     setFormData(prev => {
        const { calculatedTotal, totalsMatch } = recalculateTotals(prev.verified_items, val);
        return { ...prev, invoice_total: val, calculated_total: calculatedTotal, totals_match: totalsMatch };
     });
  };

  const [uploading, setUploading] = useState(false);
  const [openOrders, setOpenOrders] = useState([]);
  const [selectedOpenOrderIds, setSelectedOpenOrderIds] = useState([]);

  useEffect(() => {
    if (formData.supplier_id && !receipt) {
       base44.entities.Order.filter({ supplier_id: formData.supplier_id }).then(orders => {
          const open = orders.filter(o => o.status === 'sent' || o.status === 'confirmed');
          setOpenOrders(open);
       });
    } else {
       setOpenOrders([]);
    }
  }, [formData.supplier_id, receipt]);

  useEffect(() => {
    if (order && !selectedOpenOrderIds.includes(order.id)) {
      setSelectedOpenOrderIds(prev => [...prev, order.id]);
    }
  }, [order]);

  const handleLoadItemsFromOrders = () => {
     const selectedOrders = openOrders.filter(o => selectedOpenOrderIds.includes(o.id));
     if (order && selectedOpenOrderIds.includes(order.id) && !selectedOrders.find(o => o.id === order.id)) {
       selectedOrders.push(order);
     }
     
     const combinedItems = [];
     selectedOrders.forEach(o => {
       (o.items || []).forEach(oi => {
          const existing = combinedItems.find(i => i.item_id === oi.item_id && i.item_name === (oi.item_name || oi.name));
          if (existing) {
             existing.ordered_quantity += Number(oi.quantity || 0);
             existing.received_quantity += Number(oi.quantity || 0);
          } else {
             combinedItems.push({
               item_id: oi.item_id,
               item_name: oi.item_name || oi.name,
               ordered_quantity: Number(oi.quantity || 0),
               received_quantity: Number(oi.quantity || 0),
               unit: oi.unit || 'unit',
               catalog_price: Number(oi.price || 0),
               actual_price: Number(oi.price || 0),
               catalog_discount: Number(oi.discount || 0),
               actual_discount: Number(oi.discount || 0),
               price_changed: false,
               discount_changed: false,
               has_issue: false,
               issue_note: "",
               units_per_package: 1
             });
          }
       });
     });
     
     if (combinedItems.length > 0) {
        setFormData(prev => {
          const { calculatedTotal, totalsMatch } = recalculateTotals(combinedItems, prev.invoice_total);
          return { ...prev, verified_items: combinedItems, calculated_total: calculatedTotal, totals_match: totalsMatch };
        });
     }
  };
  const [scanning, setScanning] = useState(false);
  const [matching, setMatching] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [duplicateExists, setDuplicateExists] = useState(false);
  const [duplicateReceipts, setDuplicateReceipts] = useState([]);
  const [previousReceipts, setPreviousReceipts] = useState([]);
  const [deliveryNotes, setDeliveryNotes] = useState([]);
  const { t, language } = useLanguage();
  const [scannedDocs, setScannedDocs] = useState([]);
  const invoiceDetailsRef = useRef(null);
  const invoiceNumberRef = useRef(null);
  const firstDocInvoiceRef = useRef(null);
  const scrollToDetails = () => {
    try {
      const el = invoiceDetailsRef?.current;
      if (!el) return;
      const y = Math.max(0, (el.getBoundingClientRect().top + window.scrollY) - 100);
      window.scrollTo({ top: y, behavior: 'smooth' });
      setTimeout(() => {
        (invoiceNumberRef?.current || firstDocInvoiceRef?.current)?.focus?.();
      }, 350);
    } catch {}
  };

  // Ensure no English keys show in Hebrew when translations are missing
  const safeT = (key, fallbackHe, fallbackEn) => {
    const v = t(key);
    if (language === 'he' && (v === key || !v)) return fallbackHe;
    if (v === key || !v) return fallbackEn ?? key;
    return v;
  };

  // Detect PDF URLs (handles query strings)
  const isPdfUrl = (u) => {
    try { return /\.pdf(\?|$)/i.test(String(u || '')); } catch { return false; }
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

  // Prefill from selected order
  useEffect(() => {
    if (order && !formData.order_id) {
      setFormData(prev => ({
        ...prev,
        order_id: order.id || prev.order_id,
        order_number: order.order_number || prev.order_number || `ORD-${Date.now()}`,
        supplier_id: order.supplier_id || prev.supplier_id,
        supplier_name: order.supplier_name || prev.supplier_name,
        supplier_email: order.supplier_email || prev.supplier_email,
        manual_entry_mode: true
      }));
    }
  }, [order]);

  // If requested, auto-open file chooser to start the scan flow quickly
  useEffect(() => {
    try {
      if (autoOpenUpload && (formData.receipt_images || []).length === 0) {
        const input = document.getElementById('receipt-upload');
        if (input && typeof input.click === 'function') {
          setTimeout(() => { try { input.click(); } catch {} }, 250);
        }
      }
    } catch {}
  }, [autoOpenUpload, formData.receipt_images]);

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

// Load delivery notes for summary invoice selection
useEffect(() => {
  (async () => {
    try {
      if (formData.document_type !== 'summary_invoice') { setDeliveryNotes([]); return; }
      const supplierId = formData.supplier_id || receipt?.supplier_id;
      if (!supplierId) { setDeliveryNotes([]); return; }
      const me = await base44.auth.me();
      const workingEmail = me.acting_as_store_email || me.email;
      const list = await base44.entities.SupplyReceipt.filter({ supplier_id: supplierId });
      const filtered = (list || []).filter(r => r.document_type === 'delivery_note' && r.created_by === workingEmail && (!receipt || r.id !== receipt.id));
      setDeliveryNotes(filtered.slice(0, 200));
    } catch (e) { setDeliveryNotes([]); }
  })();
}, [formData.supplier_id, formData.document_type]);

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

            EXTRACTION RULES (HEBREW ONLY):
            - Prefer invoice date labeled "תאריך חשבונית" or "תאריך מסמך". Do NOT use "תאריך הדפסה" or "שעת הדפסה".
            - Extract both dates if present: invoice_date_invoice and invoice_date_printed.
            - Totals: extract all three if available:
            • total_excl_vat = סכום ללא מע"מ / מחיר כולל (before VAT)
            • vat_amount = מע"מ
            • total_incl_vat = סה"כ לתשלום OR סה"כ כולל מע"מ (after VAT). Prefer the bold bottom number.
            - Invoice number: number/code following "מספר חשבונית" / "חשבונית מס'" / "מס' חשבונית" / "חשבונית".
            - Values may contain commas or dots.

            Return valid JSON:
            {
            "invoice_number": "string",
            "invoice_date_invoice": "YYYY-MM-DD",
            "invoice_date_printed": "YYYY-MM-DD",
            "total_excl_vat": number,
            "vat_amount": number,
            "total_incl_vat": number,
            "is_refund": boolean
            }

            NOTES:
            - If the document includes "זיכוי" or "החזר", set is_refund=true.
            - Dates must be YYYY-MM-DD. If only DD/MM/YY present, convert to YYYY-MM-DD.
            - Do not include line items.`,
              file_urls: [url],
              response_json_schema: {
                type: "object",
                properties: {
                  invoice_number: { type: "string" },
                  invoice_date_invoice: { type: "string" },
                  invoice_date_printed: { type: "string" },
                  total_excl_vat: { type: "number" },
                  vat_amount: { type: "number" },
                  total_incl_vat: { type: "number" },
                  is_refund: { type: "boolean" }
                }
              }
            });
            const isRefund = Boolean(resp.is_refund);
            const incl = Number(resp.total_incl_vat);
            const excl = Number(resp.total_excl_vat);
            const vat = Number(resp.vat_amount);
            let totalCandidate = (isFinite(incl) && incl > 0) ? incl : ((isFinite(excl) && isFinite(vat)) ? (excl + vat) : Number(resp.invoice_total || 0));
            let total = (typeof totalCandidate === 'number' && isFinite(totalCandidate)) ? totalCandidate : 0;
            total = isRefund ? -Math.abs(total) : Math.abs(total);
            const inv = sanitizeInvoiceNumber(resp.invoice_number || '');
            const dateChosen = resp.invoice_date_invoice || resp.invoice_date || resp.invoice_date_printed || formData.received_date;
            const dup = supplierId ? await checkDuplicateInvoice(inv, supplierId, receipt?.id) : false;
            const isZeroVat = vat === 0 && excl === incl && incl > 0;
            // duplicate flag shown inline per-card; confirmation happens at save time
            return { file_url: url, invoice_number: inv, invoice_date: dateChosen, invoice_total: total, is_refund: isRefund, is_zero_vat: isZeroVat, duplicate: dup, document_type: 'invoice' };
          })
        );
        setScannedDocs(results);
        scrollToDetails();
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

      EXTRACTION RULES (HEBREW ONLY):
      - Prefer invoice date labeled "תאריך חשבונית" or "תאריך מסמך". Do NOT use "תאריך הדפסה" or "שעת הדפסה".
      - Extract both dates if present: invoice_date_invoice and invoice_date_printed.
      - Totals: extract all three if available:
      • total_excl_vat = סכום ללא מע"מ / מחיר כולל (before VAT)
      • vat_amount = מע"מ
      • total_incl_vat = סה"כ לתשלום OR סה"כ כולל מע"מ (after VAT). Prefer the bold bottom number.
      - Invoice number: number/code following "מספר חשבונית" / "חשבונית מס'" / "מס' חשבונית" / "חשבונית".
      - Values may contain commas or dots.

      Return valid JSON:
      {
      "invoice_number": "string",
      "invoice_date_invoice": "YYYY-MM-DD",
      "invoice_date_printed": "YYYY-MM-DD",
      "total_excl_vat": number,
      "vat_amount": number,
      "total_incl_vat": number,
      "is_refund": boolean
      }

      NOTES:
      - If the document includes "זיכוי" or "החזר", set is_refund=true.
      - Dates must be YYYY-MM-DD. If only DD/MM/YY present, convert to YYYY-MM-DD.
      - Do not include line items.`,
        file_urls: formData.receipt_images,
        response_json_schema: {
          type: "object",
          properties: {
            invoice_number: { type: "string" },
            invoice_date_invoice: { type: "string" },
            invoice_date_printed: { type: "string" },
            total_excl_vat: { type: "number" },
            vat_amount: { type: "number" },
            total_incl_vat: { type: "number" },
            is_refund: { type: "boolean" }
          }
        }
      });

      console.log('Scanned invoice header data:', response);

      const responseIsRefund = Boolean(response.is_refund);
      const incl = Number(response.total_incl_vat);
      const excl = Number(response.total_excl_vat);
      const vat = Number(response.vat_amount);
      let totalCandidate = (isFinite(incl) && incl > 0) ? incl : ((isFinite(excl) && isFinite(vat)) ? (excl + vat) : Number(response.invoice_total || 0));
      let adjustedInvoiceTotal = (typeof totalCandidate === 'number' && isFinite(totalCandidate)) ? totalCandidate : 0;
      adjustedInvoiceTotal = responseIsRefund ? -Math.abs(adjustedInvoiceTotal) : Math.abs(adjustedInvoiceTotal);

      const invoiceNum = sanitizeInvoiceNumber(response.invoice_number || '');
      const chosenDate = response.invoice_date_invoice || response.invoice_date || response.invoice_date_printed || formData.received_date;

      const isZeroVat = vat === 0 && excl === incl && incl > 0;

      const finalIncl = responseIsRefund ? -Math.abs(adjustedInvoiceTotal) : Math.abs(adjustedInvoiceTotal);
      setInclVatInput(String(finalIncl));
      const userVatMultiplier = 1 + (user?.vat_percent ?? 18) / 100;
      const vatRate = isZeroVat ? 1 : userVatMultiplier;
      setExclVatInput(String((finalIncl / vatRate).toFixed(2)));

      const noTotalFound = !isFinite(adjustedInvoiceTotal) || Math.abs(adjustedInvoiceTotal) === 0;

      if (noOrderMode) {
        setFormData(prev => ({
          ...prev,
          invoice_number: invoiceNum,
          invoice_date: chosenDate,
          invoice_total: adjustedInvoiceTotal,
          is_refund: responseIsRefund,
          is_zero_vat: isZeroVat,
          calculated_total: 0, // Reset calculated total as items are not scanned yet
          totals_match: false, // Reset totals match
          manual_entry_mode: true // Automatically switch to manual entry mode to allow editing/adding
        }));

        scrollToDetails();

        const supplierId = formData.supplier_id || (receipt?.supplier_id || '');
        const isDup = await checkDuplicateInvoice(invoiceNum, supplierId, receipt?.id);
        if (noTotalFound) {
          alert(language === 'he' ? 'לא נמצא סכום בחשבונית; הסכום נקבע ל-0. ניתן לערוך ידנית.' : 'No total found on the invoice; amount set to 0. You can edit it manually.');
        } else {
          alert(t('scanning_complete') || 'סריקה הושלמה! הוסף פריטים ידנית.');
        }
        // Duplicate warning shown via inline alert in the form (duplicateExists state)

      } else {
        // Original flow for orders - only update invoice details from scan
        const invoiceTotal = adjustedInvoiceTotal;
        // Recalculate totals based on existing items and newly scanned invoice total
        const { calculatedTotal, totalsMatch } = recalculateTotals(formData.verified_items, invoiceTotal);

        setFormData(prev => ({
          ...prev,
          invoice_number: invoiceNum,
          invoice_date: chosenDate,
          invoice_total: invoiceTotal,
          is_refund: responseIsRefund,
          is_zero_vat: isZeroVat,
          calculated_total: calculatedTotal,
          totals_match: totalsMatch
        }));

        scrollToDetails();

        const supplierId = formData.supplier_id || (receipt?.supplier_id || '');
        await checkDuplicateInvoice(invoiceNum, supplierId, receipt?.id);
        if (noTotalFound) {
          alert(language === 'he' ? 'לא נמצא סכום בחשבונית; הסכום נקבע ל-0. ניתן לערוך ידנית.' : 'No total found on the invoice; amount set to 0. You can edit it manually.');
        } else {
          alert(t('scanning_complete') || 'סריקה הושלמה! בדוק את הפרטים.');
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
    if (dup) {
      const msg = language === 'he'
        ? `⚠️ חשבונית מספר ${formData.invoice_number} כבר קיימת במערכת עבור ספק זה!\n\nהאם אתה בטוח שברצונך לשמור אותה שוב?`
        : `⚠️ Invoice #${formData.invoice_number} already exists in the system for this supplier!\n\nAre you sure you want to save it again?`;
      const confirmed = window.confirm(msg);
      if (!confirmed) return;
    }

    let finalData = { ...formData };
    if (selectedOpenOrderIds.length > 0) {
      const selectedOrdersObj = openOrders.filter(o => selectedOpenOrderIds.includes(o.id));
      if (order && selectedOpenOrderIds.includes(order.id) && !selectedOrdersObj.find(o => o.id === order.id)) {
        selectedOrdersObj.push(order);
      }
      finalData.order_id = selectedOrdersObj[0]?.id || "";
      finalData.linked_order_ids = selectedOpenOrderIds;
      finalData.order_number = selectedOrdersObj.map(o => o.order_number).join(', ');
    }

    onSubmit(finalData);
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
        <form onSubmit={handleSubmit} className="space-y-6 pb-28 md:pb-6">
          {order && (
            <div className="mb-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm">
              {language === 'he'
                ? `סריקה להזמנה ${order.order_number || '—'} • ספק: ${order.supplier_name || ''}. הקבלה תקושר להזמנה זו.`
                : `Scanning for order ${order.order_number || '—'} • Supplier: ${order.supplier_name || ''}. This receipt will attach to this order.`}
            </div>
            )}
          {(noOrderMode || order) ? (
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
                  {!receipt && openOrders.length > 0 && (
                    <div className="space-y-2 mt-4 bg-orange-50/50 p-4 rounded-xl border border-orange-200">
                      <Label className="text-orange-800 font-bold text-base flex items-center gap-2">
                        <PackageCheck className="w-5 h-5" />
                        {language === 'he' ? 'הזמנות פתוחות לספק זה (ניתן לסמן מספר הזמנות)' : 'Open orders for this supplier (can select multiple)'}
                      </Label>
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                        {openOrders.map(o => (
                          <label key={o.id} className={`flex items-center gap-3 text-sm p-3 rounded-lg border cursor-pointer transition-colors ${selectedOpenOrderIds.includes(o.id) ? 'bg-orange-100 border-orange-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                            <input
                              type="checkbox"
                              checked={selectedOpenOrderIds.includes(o.id)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedOpenOrderIds(prev => checked ? [...prev, o.id] : prev.filter(id => id !== o.id));
                              }}
                              className="rounded w-5 h-5 accent-orange-600"
                            />
                            <span className="font-bold text-gray-900">{o.order_number}</span>
                            <span className="text-gray-500">{new Date(o.created_date || o.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}</span>
                            <span className="text-green-600 font-bold ml-auto rtl:mr-auto rtl:ml-0">₪{(o.total_cost || 0).toFixed(2)}</span>
                          </label>
                        ))}
                      </div>
                      {selectedOpenOrderIds.length > 0 && (
                        <Button type="button" onClick={handleLoadItemsFromOrders} className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white">
                          {language === 'he' ? `משוך פריטים מ-${selectedOpenOrderIds.length} הזמנות נבחרות` : `Load items from ${selectedOpenOrderIds.length} selected orders`}
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="space-y-2 mt-4">
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
                            {isPdfUrl(url) ? (
                              <PdfThumbnail url={url} size={96} className="w-full h-24" />
                            ) : (
                              <img src={url} alt={language === 'he' ? 'קבלה' : 'Receipt'} className="w-full h-24 object-cover rounded" />
                            )}
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
                      <div className="flex gap-2 sticky bottom-0 pb-safe z-50 bg-white/95 dark:bg-[#0b1530]/95 backdrop-blur md:static md:bg-transparent md:dark:bg-transparent p-2 md:p-0 rounded-md pointer-events-auto">
                        <Button
                          type="button"
                          onClick={handleAutoScan}
                          disabled={scanning}
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white dark:text-white"
                        >
                          {scanning ? (
                            <>
                              <Loader className="w-4 h-4 ml-2 animate-spin" />
                              {t('scanning_invoice')}
                            </>
                          ) : (
                            <>
                              <Scan className="w-4 h-4 ml-2" />
                              {formData.manual_entry_mode ? (safeT('re_scan_header', 'סרוק מחדש', 'Re-scan header') || 'סרוק מחדש') : safeT('auto_scan', 'סריקה אוטומטית', 'Auto scan')}
                            </>
                          )}
                        </Button>
                        
                        {/* Match items button removed per request */}
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
                      <div ref={invoiceDetailsRef} style={{ scrollMarginTop: '96px' }} className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                        <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                          <Scan className="w-5 h-5" />
                          {t('invoice_details') || 'פרטי חשבונית'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="invoice-details-section">
                          {scannedDocs.map((doc, idx) => (
                            <Card key={doc.file_url || idx} className="overflow-hidden">
                              <CardContent className="pt-4 space-y-3">
                                <div className="aspect-video bg-white/40 rounded border">
                                  {isPdfUrl(doc.file_url) ? (
                                    <PdfThumbnail url={doc.file_url} size={160} className="w-full h-full" />
                                  ) : (
                                    <img src={doc.file_url} alt={`Invoice ${idx+1}`} className="w-full h-full object-contain" />
                                  )}
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-600">{t('invoice_number')} *</Label>
                                  <Input
                                    ref={idx === 0 ? firstDocInvoiceRef : null}
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
                                <div>
                                  <Label className="text-xs text-gray-600">{language === 'he' ? 'סוג מסמך' : 'Document type'}</Label>
                                  <Select
                                    value={doc.document_type || 'invoice'}
                                    onValueChange={(val) => setScannedDocs(prev => {
                                      const copy = [...prev];
                                      copy[idx] = { ...copy[idx], document_type: val };
                                      return copy;
                                    })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={language === 'he' ? 'בחר סוג מסמך' : 'Select document type'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="delivery_note">{language === 'he' ? 'תעודת משלוח' : 'Delivery note'}</SelectItem>
                                      <SelectItem value="invoice">{language === 'he' ? 'חשבונית' : 'Invoice'}</SelectItem>
                                      <SelectItem value="summary_invoice">{language === 'he' ? 'חשבונית מרכזת' : 'Summary invoice'}</SelectItem>
                                    </SelectContent>
                                  </Select>
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
                                <label className="flex items-center gap-2 text-sm mt-1">
                                  <input
                                    type="checkbox"
                                    checked={!!doc.is_zero_vat}
                                    onChange={(e) => setScannedDocs(prev => {
                                      const copy = [...prev];
                                      copy[idx] = { ...copy[idx], is_zero_vat: e.target.checked };
                                      return copy;
                                    })}
                                    className="rounded accent-green-600"
                                  />
                                  <span className={doc.is_zero_vat ? 'text-green-700 font-bold' : ''}>
                                    {language === 'he' ? 'ללא מע״מ (0%)' : 'No VAT (0%)'}
                                  </span>
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
                      <div ref={invoiceDetailsRef} style={{ scrollMarginTop: '96px' }} className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                        <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                          <Scan className="w-5 h-5" />
                          {t('invoice_details') || 'פרטי חשבונית'}
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <Label className="text-xs text-gray-600">{t('invoice_number')} *</Label>
                            <Input
                              ref={invoiceNumberRef}
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
                          {formData.document_type === 'delivery_note' ? (
                            <div className="bg-gray-100 p-3 rounded-lg border">
                              <Label className="text-sm text-gray-700 font-bold">{language === 'he' ? 'תעודת משלוח (ללא סכום)' : 'Delivery Note (No amount)'}</Label>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-gray-600">{language === 'he' ? 'סכום לפני מע״מ' : 'Total (Excl. VAT)'}</Label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={exclVatInput}
                                  onChange={(e) => handleExclVatChange(e.target.value)}
                                  className="mt-1 font-bold text-lg"
                                  placeholder="0.00"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-600">{t('invoice_total')} ({t('including_vat') || 'כולל מע"ם'}) *</Label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={inclVatInput}
                                  onChange={(e) => handleInclVatChange(e.target.value)}
                                  className="mt-1 font-bold text-lg text-blue-700"
                                  placeholder="0.00"
                                  required={formData.document_type !== 'delivery_note'}
                                />
                              </div>
                            </div>
                          )}
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="col-span-full">
                            <Label className="text-xs text-gray-600 mb-2 block">{language === 'he' ? 'סוג מסמך' : 'Document type'}</Label>
                            <div className="flex gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, document_type: 'invoice' }));
                                }}
                                className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${formData.document_type === 'invoice' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                              >
                                🧾 {language === 'he' ? 'חשבונית מס' : 'Tax Invoice'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, document_type: 'delivery_note', invoice_total: 0 }));
                                  setInclVatInput("0");
                                  setExclVatInput("0");
                                }}
                                className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${formData.document_type === 'delivery_note' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                              >
                                📦 {language === 'he' ? 'תעודת משלוח' : 'Delivery Note'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, document_type: 'summary_invoice' }));
                                }}
                                className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${formData.document_type === 'summary_invoice' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                              >
                                📊 {language === 'he' ? 'חשבונית מרכזת' : 'Summary Invoice'}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <label className="flex items-center gap-2 text-sm font-semibold p-2 bg-white border rounded shadow-sm cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={!!formData.is_refund}
                              onChange={(e) => {
                                const isRefund = e.target.checked;
                                setFormData(prev => ({ ...prev, is_refund: isRefund }));
                                
                                const currentIncl = parseFloat(inclVatInput);
                                if (!isNaN(currentIncl)) {
                                   const newIncl = isRefund ? -Math.abs(currentIncl) : Math.abs(currentIncl);
                                   setInclVatInput(newIncl.toFixed(2));
                                   updateInvoiceTotal(newIncl);
                                }
                                const currentExcl = parseFloat(exclVatInput);
                                if (!isNaN(currentExcl)) {
                                   const newExcl = isRefund ? -Math.abs(currentExcl) : Math.abs(currentExcl);
                                   setExclVatInput(newExcl.toFixed(2));
                                }
                              }}
                              className="rounded w-4 h-4 accent-orange-600"
                            />
                            <span className={formData.is_refund ? 'text-orange-600' : ''}>{language === 'he' ? 'חשבונית זיכוי (-)' : 'Refund invoice (-)'}</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={!!formData.is_zero_vat}
                              onChange={(e) => {
                                const zeroVat = e.target.checked;
                                setFormData(prev => ({ ...prev, is_zero_vat: zeroVat }));
                                const currentIncl = parseFloat(inclVatInput);
                                if (!isNaN(currentIncl)) {
                                  const userVatMultiplier = 1 + (user?.vat_percent ?? 18) / 100;
                                  const vatRate = zeroVat ? 1 : userVatMultiplier;
                                  const newExcl = currentIncl / vatRate;
                                  setExclVatInput(newExcl.toFixed(2));
                                }
                              }}
                              className="rounded accent-green-600"
                            />
                            <span className={formData.is_zero_vat ? 'text-green-700 font-bold' : ''}>
                              {language === 'he' ? 'ללא מע״מ (0%)' : 'No VAT (0%)'}
                            </span>
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={!!formData.awaiting_credit}
                              onChange={(e) => setFormData(prev => ({ ...prev, awaiting_credit: e.target.checked }))}
                              className="rounded"
                            />
                            <span>{language === 'he' ? 'ממתין לזיכוי' : 'Awaiting credit'}</span>
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
                        {formData.document_type === 'summary_invoice' && (
                          <div className="mt-2 p-3 border rounded-md bg-amber-50">
                            <Label className="text-xs text-gray-700">{language === 'he' ? 'בחר תעודות משלוח לחיוב' : 'Select delivery notes to include'}</Label>
                            {!formData.supplier_id ? (
                              <div className="text-sm text-gray-600 mt-1">{language === 'he' ? 'בחר/י ספק כדי לראות תעודות משלוח' : 'Choose a supplier to see delivery notes'}</div>
                            ) : (
                              <>
                                {deliveryNotes.length === 0 ? (
                                  <div className="text-sm text-gray-600 mt-1">{language === 'he' ? 'אין תעודות משלוח לספק זה' : 'No delivery notes for this supplier'}</div>
                                ) : (
                                  <div className="max-h-48 overflow-auto mt-2 space-y-1">
                                    <label className="flex items-center gap-2 text-sm mb-2">
                                      <input
                                        type="checkbox"
                                        checked={Array.isArray(formData.summarized_delivery_note_ids) && formData.summarized_delivery_note_ids.length === deliveryNotes.length}
                                        onChange={(e) => {
                                          const allIds = deliveryNotes.map(d => d.id);
                                          setFormData(prev => ({ ...prev, summarized_delivery_note_ids: e.target.checked ? allIds : [] }));
                                        }}
                                      />
                                      <span>{language === 'he' ? 'בחר הכל' : 'Select all'}</span>
                                    </label>
                                    {deliveryNotes.map(dn => (
                                      <label key={dn.id} className="flex items-center gap-2 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={Array.isArray(formData.summarized_delivery_note_ids) && formData.summarized_delivery_note_ids.includes(dn.id)}
                                          onChange={(e) => {
                                            setFormData(prev => {
                                              const cur = Array.isArray(prev.summarized_delivery_note_ids) ? [...prev.summarized_delivery_note_ids] : [];
                                              if (e.target.checked) { if (!cur.includes(dn.id)) cur.push(dn.id); }
                                              else { const i = cur.indexOf(dn.id); if (i >= 0) cur.splice(i,1); }
                                              return { ...prev, summarized_delivery_note_ids: cur };
                                            });
                                          }}
                                        />
                                        <span className="flex-1">{(dn.order_number || dn.invoice_number || dn.id)} • {new Date(dn.received_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')} • {dn.supplier_name}</span>
                                        <span className="text-xs text-gray-600">{dn.invoice_total ?? 0}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                        {formData.is_refund && (
                          <>
                            <Alert variant="default" className="bg-amber-50 border-amber-200 mb-2">
                              <AlertDescription dir={language === 'he' ? 'rtl' : undefined} className={language === 'he' ? 'text-right' : ''}>{language === 'he' ? 'בקבלת זיכוי מומלץ להעלות קובץ PDF, אחרת יש לתקן את הסכום ידנית על ידי הוספת מינוס (−).' : 'For credit invoices, we recommend uploading a PDF; otherwise adjust the amount manually by prefixing a minus (−).'}</AlertDescription>
                            </Alert>
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
                            </>
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
                      <Alert variant="destructive" className="mt-2 bg-orange-50 border-orange-300 text-orange-800">
                        <AlertDescription>
                          <AlertTriangle className="w-4 h-4 inline-block mr-2 text-orange-600 rtl:ml-2" />
                          {language === 'he' 
                            ? 'שים לב: חשבונית מספר זה כבר קיימת במערכת עבור הספק הנ"ל.'
                            : 'Warning: This invoice number already exists in the system for this supplier.'}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-3 pt-4">
                      {scannedDocs.length > 1 ? (
                        <>
                          <Button
                            type="button"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            disabled={!formData.supplier_id || scannedDocs.some(d => !d.invoice_number || !d.invoice_date)}
                            onClick={async () => {
                              const hasDups = scannedDocs.some(d => d.duplicate);
                              if (hasDups) {
                                const msg = language === 'he'
                                  ? '⚠️ חלק מהחשבוניות שסרקת כבר קיימות במערכת עבור ספק זה!\n\nהאם אתה בטוח שברצונך לשמור אותן שוב?'
                                  : '⚠️ Some of the scanned invoices already exist in the system for this supplier!\n\nAre you sure you want to save them again?';
                                const confirmed = window.confirm(msg);
                                if (!confirmed) return;
                              }

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
                                is_zero_vat: !!d.is_zero_vat,
                                refund_received: !!(d.is_refund && formData.refund_received),
                                awaiting_credit: !!formData.awaiting_credit,
                                reviewed: !!(formData.needs_review && formData.reviewed),
                                linked_receipt_id: formData.linked_receipt_id || "",
                                document_type: d.document_type || (formData.document_type || "invoice")
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
                            {safeT('cancel', 'ביטול', 'Cancel')}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            type="submit" 
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                                     disabled={!formData.invoice_number || formData.receipt_images.length === 0}
                          >
                            <PackageCheck className="w-4 h-4 ml-2" />
                            {safeT('save_receipt', 'שמור קבלה', 'Save receipt')}
                          </Button>
                          {receipt && onDelete && (
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => onDelete(receipt)}
                              className="flex-1"
                            >
                              <Trash2 className="w-4 h-4 ml-2" />
                              {safeT('delete', 'מחק', 'Delete')}
                            </Button>
                          )}
                          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                            {safeT('cancel', 'ביטול', 'Cancel')}
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