import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader, Upload, X, Scan, AlertTriangle, TrendingUp, TrendingDown, Plus, RefreshCw, PackageCheck, Trash2, FileText, Camera, Receipt, Package, BarChart3, RefreshCcw, Info, Eye, Download, Check, ChevronsUpDown, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../LanguageProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import PdfThumbnail from "@/components/receipts/PdfThumbnail";
import OrderPreviewModal from "@/components/orders/OrderPreviewModal";

export default function ReceiveSupplyForm({ order, receipt, suppliers, onSubmit, onCancel, onDelete, noOrderMode = false, autoOpenUpload = false, user }) {
  const [previewOrder, setPreviewOrder] = useState(null);
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
     let selectedOrders = openOrders.filter(o => selectedOpenOrderIds.includes(o.id));
     if (order && selectedOpenOrderIds.includes(order.id) && !selectedOrders.find(o => o.id === order.id)) {
       selectedOrders.push(order);
     }
     
     // If the order prop isn't in openOrders but is selected (fallback for noOrderMode if openOrders is used directly)
     if (selectedOrders.length === 0 && selectedOpenOrderIds.length > 0) {
       selectedOrders = openOrders.filter(o => selectedOpenOrderIds.includes(o.id));
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
               units_per_package: 1,
               request_credit_quantity: false,
               request_credit_price: false
             });
          }
       });
     });
     
     if (combinedItems.length > 0) {
        setFormData(prev => {
          // Merge existing manual items with the loaded order items
          const existingItems = [...(prev.verified_items || [])];
          
          combinedItems.forEach(ci => {
            const existingIndex = existingItems.findIndex(ei => 
              (ei.item_id && ci.item_id && ei.item_id === ci.item_id) || 
              (ei.item_name && ci.item_name && ei.item_name === ci.item_name)
            );
            
            if (existingIndex >= 0) {
              existingItems[existingIndex].ordered_quantity += ci.ordered_quantity;
              existingItems[existingIndex].received_quantity += ci.received_quantity;
            } else {
              existingItems.push(ci);
            }
          });

          const { calculatedTotal, totalsMatch } = recalculateTotals(existingItems, prev.invoice_total);
          return { ...prev, verified_items: existingItems, calculated_total: calculatedTotal, totals_match: totalsMatch };
        });
     }
  };
  const [scanning, setScanning] = useState(false);
  const [matching, setMatching] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [duplicateExists, setDuplicateExists] = useState(false);
  const [anomalyCheck, setAnomalyCheck] = useState({ show: false, messages: [], onContinue: null });
  const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(!!receipt);

  const checkForAnomalies = () => {
    const messages = [];
    const quantityMismatch = formData.verified_items.filter(i => i.received_quantity !== i.ordered_quantity && i.ordered_quantity > 0);
    const notOrdered = formData.verified_items.filter(i => i.received_quantity > 0 && i.ordered_quantity === 0 && i.item_id);
    const notRecognized = formData.verified_items.filter(i => !i.item_id && i.item_name);

    if (!noOrderMode && (order || openOrders.length > 0)) {
      if (quantityMismatch.length > 0) {
        messages.push(language === 'he' 
          ? `הכמות שהתקבלה שונה מהכמות שהוזמנה עבור ${quantityMismatch.length} פריטים.` 
          : `The received quantity differs from the ordered quantity for ${quantityMismatch.length} items.`);
      }
      if (notOrdered.length > 0) {
        messages.push(language === 'he' 
          ? `קיבלת ${notOrdered.length} פריטים שלא היו בהזמנה המקורית.` 
          : `You received ${notOrdered.length} items that were not on the original order.`);
      }
    }

    if (notRecognized.length > 0) {
      messages.push(language === 'he' 
        ? `ישנם ${notRecognized.length} פריטים שלא קיימים בקטלוג. הם יתווספו אוטומטית למערכת ותוכל לעדכן אותם מאוחר יותר.` 
        : `There are ${notRecognized.length} items that don't exist in the catalog. They will be added automatically and you can edit them later.`);
    }

    return messages;
  };
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
      // Use smooth scroll but ensure it targets the correct scrollable parent (Dialog)
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        
        // Auto-scan after upload
        setTimeout(() => {
          handleAutoScanWithUrls([...formData.receipt_images, ...urls]);
        }, 300);
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
      filtered.sort((a, b) => (b.awaiting_credit?1:0) - (a.awaiting_credit?1:0) || new Date(b.received_date) - new Date(a.received_date));
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
  handleAutoScanWithUrls(formData.receipt_images);
};

const handleAutoScanWithUrls = async (urlsToScan) => {
  if (!urlsToScan || !urlsToScan.length) return;
  if (noOrderMode && !formData.supplier_id) {
    alert(t('supplier_required'));
    return;
  }

  try {
    setScanning(true);

    if (urlsToScan.length > 1) {
      const supplierId = formData.supplier_id || (receipt?.supplier_id || '');
      const results = await Promise.all(
        urlsToScan.map(async (url) => {
          const { data } = await base44.functions.invoke('scanAndMatchReceipt', {
            file_urls: [url],
            supplier_id: supplierId || null,
          });
          const resp = data?.header || {};
          const isRefund = Boolean(resp.is_refund);
          const incl = Number(resp.total_incl_vat);
          const excl = Number(resp.total_excl_vat);
          const vat = Number(resp.vat_amount);
          let totalCandidate = (isFinite(incl) && incl > 0) ? incl : ((isFinite(excl) && isFinite(vat)) ? (excl + vat) : Number(resp.invoice_total || 0));
          let total = (typeof totalCandidate === 'number' && isFinite(totalCandidate)) ? totalCandidate : 0;
          total = isRefund ? -Math.abs(total) : Math.abs(total);
          const inv = sanitizeInvoiceNumber(resp.invoice_number || '');
          const dateChosen = resp.invoice_date || formData.received_date;
          const dup = supplierId ? await checkDuplicateInvoice(inv, supplierId, receipt?.id) : false;
          const isZeroVat = vat === 0 && excl === incl && incl > 0;
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

      const { data } = await base44.functions.invoke('scanAndMatchReceipt', {
        file_urls: urlsToScan,
        supplier_id: formData.supplier_id || null,
      });

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to scan receipt');
      }

      const response = data.header || {};
      console.log('Scanned invoice header and items data:', data);

      const responseIsRefund = Boolean(response.is_refund);
      const incl = Number(response.total_incl_vat);
      const excl = Number(response.total_excl_vat);
      const vat = Number(response.vat_amount);
      let totalCandidate = (isFinite(incl) && incl > 0) ? incl : ((isFinite(excl) && isFinite(vat)) ? (excl + vat) : Number(response.invoice_total || 0));
      let adjustedInvoiceTotal = (typeof totalCandidate === 'number' && isFinite(totalCandidate)) ? totalCandidate : 0;
      adjustedInvoiceTotal = responseIsRefund ? -Math.abs(adjustedInvoiceTotal) : Math.abs(adjustedInvoiceTotal);

      const invoiceNum = sanitizeInvoiceNumber(response.invoice_number || '');
      const chosenDate = response.invoice_date || formData.received_date;

      const isZeroVat = vat === 0 && excl === incl && incl > 0;
      
      const rows = Array.isArray(data.items) ? data.items : [];
      const mappedItems = rows.map(r => ({
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
        has_issue: !r.item_id,
        issue_note: !r.item_id ? (language === 'he' ? 'פריט לא מזוהה' : 'Unrecognized item') : '',
        units_per_package: 1,
        price_after_discount: 0,
      }));

      const finalIncl = responseIsRefund ? -Math.abs(adjustedInvoiceTotal) : Math.abs(adjustedInvoiceTotal);
      setInclVatInput(String(finalIncl));
      const userVatMultiplier = 1 + (user?.vat_percent ?? 18) / 100;
      const vatRate = isZeroVat ? 1 : userVatMultiplier;
      setExclVatInput(String((finalIncl / vatRate).toFixed(2)));

      const noTotalFound = !isFinite(adjustedInvoiceTotal) || Math.abs(adjustedInvoiceTotal) === 0;

      if (noOrderMode) {
        const { calculatedTotal, totalsMatch } = recalculateTotals(mappedItems, adjustedInvoiceTotal);

        setFormData(prev => ({
          ...prev,
          invoice_number: invoiceNum,
          invoice_date: chosenDate,
          invoice_total: adjustedInvoiceTotal,
          is_refund: responseIsRefund,
          is_zero_vat: isZeroVat,
          verified_items: mappedItems,
          calculated_total: calculatedTotal,
          totals_match: totalsMatch,
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
        const invoiceTotal = adjustedInvoiceTotal;
        
        let newItems = [...formData.verified_items];
        // Merge scanned items with existing order items
        if (newItems.length > 0 && mappedItems.length > 0) {
           // Reset received quantities to 0 for ordered items before applying scanned quantities
           newItems = newItems.map(item => ({ ...item, received_quantity: 0 }));
           mappedItems.forEach(mi => {
              const existingIndex = newItems.findIndex(ni => 
                 (ni.item_id && mi.item_id && ni.item_id === mi.item_id) || 
                 (ni.item_name && mi.item_name && ni.item_name.trim() === mi.item_name.trim())
              );
              if (existingIndex >= 0) {
                 newItems[existingIndex].received_quantity = mi.received_quantity;
                 newItems[existingIndex].actual_price = mi.actual_price;
                 // השארנו את הפריט המקורי כתקין אם הוא תאם לפריט בהזמנה
              } else {
                 newItems.push(mi);
              }
           });
        } else if (mappedItems.length > 0) {
           newItems = mappedItems;
        }

        const { calculatedTotal, totalsMatch } = recalculateTotals(newItems, invoiceTotal);

        setFormData(prev => ({
          ...prev,
          invoice_number: invoiceNum,
          invoice_date: chosenDate,
          invoice_total: invoiceTotal,
          is_refund: responseIsRefund,
          is_zero_vat: isZeroVat,
          verified_items: newItems,
          calculated_total: calculatedTotal,
          totals_match: totalsMatch,
          manual_entry_mode: true
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

      let awaitingCredit = prev.awaiting_credit;
      if (field === 'request_credit_quantity' || field === 'request_credit_price') {
        const hasAnyCreditReq = updatedVerifiedItems.some(i => i.request_credit_quantity || i.request_credit_price);
        if (hasAnyCreditReq) {
          awaitingCredit = true;
        }
      }

      return {
        ...prev,
        needs_review: false,
        awaiting_credit: awaitingCredit,
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
      const newItem = {
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
        price_after_discount: 0,
        request_credit_quantity: false,
        request_credit_price: false
      };
      const newItems = [newItem, ...prev.verified_items];
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
    
    const executeSubmit = async () => {
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

    // Auto-create new items that are marked as having issues/unrecognized
    try {
      const newItemsToCreate = formData.verified_items.filter(item => !item.item_id && item.item_name);
      if (newItemsToCreate.length > 0) {
        for (const item of newItemsToCreate) {
          const itemPayload = {
            name: item.item_name,
            supplier_id: 'pending',
            supplier_name: 'להשלמה',
            price: item.actual_price || 0,
            unit: item.unit || 'unit',
            is_pending_completion: true,
            status: 'pending_completion'
          };
          const createdItem = await base44.entities.Item.create(itemPayload);
          // Update the receipt item with the new ID
          item.item_id = createdItem.id;
        }
      }
    } catch (e) {
      console.error("Error auto-creating new items:", e);
      // We don't block the receipt save if this fails, we just log it
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

    executeSubmit();
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
    <>
      <Card className="mb-8 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl font-bold">
              {receipt ? (language === 'he' ? 'צפייה במסמך' : 'View Document') : (noOrderMode ? t('supply_without_order') : t('receive'))}
            </CardTitle>
            {isReadOnly && (
              <Button type="button" variant="outline" size="sm" onClick={() => setIsReadOnly(false)} className="h-8 text-gray-700">
                <Edit className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                {language === 'he' ? 'עריכת מסמך' : 'Edit Document'}
              </Button>
            )}
          </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 pb-28 md:pb-6">
          {order && (
            <div className="mb-4 flex">
              <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOrder(order)} className="text-gray-800 border-gray-300 hover:bg-gray-50 bg-white shadow-sm font-semibold">
                <Eye className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                {language === 'he' ? 'צפה בהזמנה' : 'Preview Order'}
              </Button>
            </div>
          )}


          {(noOrderMode || order) ? (
            <>
              <div className="space-y-2">
                <Popover open={supplierPopoverOpen} onOpenChange={setSupplierPopoverOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={supplierPopoverOpen} className="w-full justify-between font-normal"><span className="truncate">{formData.supplier_id && availableSuppliers.length > 0 ? availableSuppliers.find((s) => s.id === formData.supplier_id)?.name || t('select_supplier') : t('select_supplier')}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start"><Command><CommandInput placeholder={language === 'he' ? 'חפש ספק...' : 'Search supplier...'} autoFocus /><CommandList><CommandEmpty>{t('no_suppliers') || 'לא נמצאו ספקים.'}</CommandEmpty><CommandGroup>
                          {[...availableSuppliers].slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })).map((supplier) => (<CommandItem key={supplier.id} value={supplier.name} onSelect={() => { handleSupplierSelect(supplier.id); setSupplierPopoverOpen(false); }}><Check className={cn("mr-2 h-4 w-4 shrink-0", formData.supplier_id === supplier.id ? "opacity-100" : "opacity-0")} /><span className="truncate">{supplier.name}</span></CommandItem>))}
                        </CommandGroup></CommandList></Command></PopoverContent></Popover>
              </div>

              {(formData.supplier_id || receipt) && (
                <>
                  {!receipt && openOrders.length > 0 && (
                    <div className="space-y-3 mt-4 bg-gray-50/50 p-4 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-800 font-bold text-base flex items-center gap-2">
                          <PackageCheck className="w-5 h-5 text-gray-500" />
                          {language === 'he' ? 'הזמנות פתוחות לספק זה' : 'Open orders for this supplier'}
                        </Label>
                        <span className="text-xs text-gray-500">
                          {language === 'he' ? '(ניתן לסמן מספר הזמנות)' : '(Select multiple)'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {openOrders.map(o => (
                          <div 
                            key={o.id} 
                            className={`flex items-center justify-between gap-2 text-sm p-3 rounded-lg border cursor-pointer transition-colors ${selectedOpenOrderIds.includes(o.id) ? 'bg-[#d4a373]/10 border-[#d4a373]' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                            onClick={() => {
                              setSelectedOpenOrderIds(prev => 
                                prev.includes(o.id) ? prev.filter(id => id !== o.id) : [...prev, o.id]
                              );
                            }}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={selectedOpenOrderIds.includes(o.id)}
                                readOnly
                                className="rounded w-5 h-5 accent-[#d4a373] shrink-0 cursor-pointer pointer-events-none"
                              />
                              <div className="flex flex-col min-w-0">
                                <span 
                                  className="font-bold text-gray-900 hover:text-black flex items-center gap-1.5 transition-colors truncate"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewOrder(o);
                                  }}
                                >
                                  <Eye className="w-4 h-4 shrink-0" /> <span className="truncate">{o.order_number}</span>
                                </span>
                                <span className="text-gray-500 text-xs mt-0.5">{new Date(o.created_date || o.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-2 rtl:mr-2 rtl:ml-0">
                              <span className="text-gray-700 font-bold">₪{(o.total_cost || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedOpenOrderIds.length > 0 && (
                        <Button type="button" onClick={handleLoadItemsFromOrders} className="w-full mt-3 bg-[#d4a373] hover:bg-[#b88c60] text-white h-auto py-3 px-2 sm:px-4">
                          <span className="flex items-center justify-center flex-wrap gap-2 text-center text-sm sm:text-base whitespace-normal break-words leading-tight">
                            <Download className="w-4 h-4 shrink-0" />
                            <span>{language === 'he' ? `משוך פריטים מ-${selectedOpenOrderIds.length} הזמנות נבחרות` : `Load items from ${selectedOpenOrderIds.length} selected orders`}</span>
                          </span>
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="space-y-2 mt-4">
                    <Label>{t('receipt_images')} *</Label>
                    <div
                      className={`relative border-2 border-dashed rounded-2xl p-4 max-w-sm mx-auto transition-colors overflow-hidden ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50'}`}
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
                        disabled={isReadOnly}
                      />
                      <label
                        htmlFor="receipt-upload"
                        className="flex flex-col items-center gap-2 cursor-pointer relative z-10"
                      >
                        {uploading ? (
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                            <Loader className="w-6 h-6 text-blue-600 animate-spin" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-orange-400 p-[2px] shadow-lg">
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center border-2 border-white hover:bg-gray-50 transition-colors">
                              <Camera className="w-6 h-6 text-gray-800" strokeWidth={1.5} />
                            </div>
                          </div>
                        )}
                        <span className="text-sm font-bold text-gray-800 text-center">
                          {safeT('click_to_upload_images', 'לחץ להעלאת תמונות', 'Take photo or upload receipt')}
                        </span>
                        <span className="text-[10px] text-gray-500 text-center">
                          {language === 'he' ? 'תמיכה בתמונות ומסמכי PDF. ניתן גם לגרור לכאן.' : 'Supports images/PDF. You can also drag & drop here.'}
                        </span>
                      </label>
                      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                      <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                    </div>

                    {formData.receipt_images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {formData.receipt_images.map((url, index) => (
                          <div key={index} className="relative group">
                            <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full h-24 rounded border border-gray-200 overflow-hidden hover:border-blue-500 transition-colors" title={language === 'he' ? 'הגדל תמונה' : 'Enlarge image'}>
                              {isPdfUrl(url) ? (
                                <PdfThumbnail url={url} size={96} className="w-full h-full object-cover" />
                              ) : (
                                <img src={url} alt={language === 'he' ? 'קבלה' : 'Receipt'} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                              )}
                            </a>
                            {!isReadOnly && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 opacity-80 hover:opacity-100 shadow-sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeImage(index);
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {formData.receipt_images.length > 0 && !isReadOnly && (
                      <div className="flex gap-2 sticky bottom-0 pb-safe z-50 bg-white/95 dark:bg-[#0b1530]/95 backdrop-blur md:static md:bg-transparent md:dark:bg-transparent p-2 md:p-0 rounded-md pointer-events-auto">
                        <Button
                          type="button"
                          onClick={handleAutoScan}
                          disabled={scanning}
                          className="flex-1 bg-[#d4a373] hover:bg-[#b88c60] text-white dark:text-white min-h-[44px] md:min-h-0"
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
                            className="flex-1 min-h-[44px] md:min-h-0"
                          >
                            <Plus className="w-4 h-4 ml-2" />
                            {safeT('enter_manually', 'הזן ידנית', 'Enter manually')}
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
                          {safeT('invoice_details', 'פרטי חשבונית', 'Invoice Details')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="invoice-details-section">
                          {scannedDocs.map((doc, idx) => (
                            <Card key={doc.file_url || idx} className="overflow-hidden">
                              <CardContent className="pt-4 space-y-3">
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="block aspect-video bg-white/40 rounded border hover:border-blue-500 transition-colors overflow-hidden group" title={language === 'he' ? 'הגדל תמונה' : 'Enlarge image'}>
                                  {isPdfUrl(doc.file_url) ? (
                                    <PdfThumbnail url={doc.file_url} size={160} className="w-full h-full object-cover" />
                                  ) : (
                                    <img src={doc.file_url} alt={`Invoice ${idx+1}`} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                                  )}
                                </a>
                                <div>
                                  <Label className="text-xs text-gray-600">{safeT('invoice_number', 'מספר חשבונית', 'Invoice Number')} *</Label>
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
                                  <Label className="text-xs text-gray-600">{safeT('invoice_date', 'תאריך חשבונית', 'Invoice Date')} *</Label>
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
                                  <Label className="text-xs text-gray-600">{safeT('invoice_total', 'סכום בחשבונית', 'Invoice Total')} ({safeT('including_vat', 'כולל מע"ם', 'Including VAT')}) *</Label>
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
                                      {safeT('invoice_already_scanned', 'חשבונית זו כבר נסרקה עבור ספק זה.', 'This invoice number was already scanned for this supplier.')}
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
                          {safeT('invoice_details', 'פרטי חשבונית', 'Invoice Details')}
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <Label className="text-xs text-gray-600">{safeT('invoice_number', 'מספר חשבונית', 'Invoice Number')} *</Label>
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
                              placeholder={safeT('enter_invoice_number', 'הזן מספר חשבונית', 'Enter invoice number')}
                              required
                              disabled={isReadOnly}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">{safeT('invoice_date', 'תאריך חשבונית', 'Invoice Date')} *</Label>
                            <Input
                              type="date"
                              value={formData.invoice_date}
                              onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                              lang={language === 'he' ? 'he-IL' : undefined}
                              className="mt-1 font-semibold"
                              required
                              disabled={isReadOnly}
                            />
                          </div>
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
                                  disabled={isReadOnly}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-600">{safeT('invoice_total', 'סכום בחשבונית', 'Invoice Total')} ({safeT('including_vat', 'כולל מע"ם', 'Including VAT')}) {formData.document_type !== 'delivery_note' && '*'}</Label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={inclVatInput}
                                  onChange={(e) => handleInclVatChange(e.target.value)}
                                  className="mt-1 font-bold text-lg text-blue-700"
                                  placeholder="0.00"
                                  required={formData.document_type !== 'delivery_note'}
                                  disabled={isReadOnly}
                                />
                              </div>
                            </div>
                          {formData.verified_items.length > 0 && (
                            <div>
                              <Label className="text-xs text-gray-600">{safeT('calculated_total', 'סכום מחושב', 'Calculated Total')}</Label>
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

                      <div className="bg-white border rounded-lg p-4 mt-4 space-y-5 shadow-sm">
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <Label className="text-sm text-gray-800 mb-3 block font-semibold">{language === 'he' ? 'סוג מסמך' : 'Document type'}</Label>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, document_type: 'invoice', is_refund: false }));
                                }}
                                className={`py-2 px-4 rounded-md border text-sm font-medium flex items-center gap-2 transition-all shadow-sm ${formData.document_type === 'invoice' && !formData.is_refund ? 'border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500/20' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                              >
                                <Receipt className="w-4 h-4" />
                                <span>{language === 'he' ? 'חשבונית מס' : 'Tax Invoice'}</span>
                              </button>
                              <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, document_type: 'delivery_note', is_refund: false }));
                                }}
                                className={`py-2 px-4 rounded-md border text-sm font-medium flex items-center gap-2 transition-all shadow-sm ${formData.document_type === 'delivery_note' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500/20' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                              >
                                <Package className="w-4 h-4" />
                                <span>{language === 'he' ? 'תעודת משלוח' : 'Delivery Note'}</span>
                              </button>
                              <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, document_type: 'summary_invoice', is_refund: false }));
                                }}
                                className={`py-2 px-4 rounded-md border text-sm font-medium flex items-center gap-2 transition-all shadow-sm ${formData.document_type === 'summary_invoice' ? 'border-purple-500 bg-purple-50 text-purple-700 ring-1 ring-purple-500/20' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                              >
                                <BarChart3 className="w-4 h-4" />
                                <span>{language === 'he' ? 'חשבונית מרכזת' : 'Summary Invoice'}</span>
                              </button>
                              <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, document_type: 'invoice', is_refund: true }));
                                  const currentIncl = parseFloat(inclVatInput);
                                  if (!isNaN(currentIncl)) {
                                     const newIncl = -Math.abs(currentIncl);
                                     setInclVatInput(newIncl.toFixed(2));
                                     updateInvoiceTotal(newIncl);
                                  }
                                  const currentExcl = parseFloat(exclVatInput);
                                  if (!isNaN(currentExcl)) {
                                     const newExcl = -Math.abs(currentExcl);
                                     setExclVatInput(newExcl.toFixed(2));
                                  }
                                }}
                                className={`py-2 px-4 rounded-md border text-sm font-medium flex items-center gap-2 transition-all shadow-sm ${formData.is_refund ? 'border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500/20' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                              >
                                <RefreshCcw className="w-4 h-4" />
                                <span>{language === 'he' ? 'זיכוי מספק' : 'Refund from Supplier'}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                          <Label className="text-xs text-gray-500 mb-2.5 block font-medium">
                            {language === 'he' ? 'מאפיינים נוספים (ניתן לערוך במידת הצורך)' : 'Additional attributes (editable)'}
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={isReadOnly}
                              onClick={(e) => {
                                const zeroVat = !formData.is_zero_vat;
                                setFormData(prev => ({ ...prev, is_zero_vat: zeroVat }));
                                const currentIncl = parseFloat(inclVatInput);
                                if (!isNaN(currentIncl)) {
                                  const userVatMultiplier = 1 + (user?.vat_percent ?? 18) / 100;
                                  const vatRate = zeroVat ? 1 : userVatMultiplier;
                                  const newExcl = currentIncl / vatRate;
                                  setExclVatInput(newExcl.toFixed(2));
                                }
                              }}
                              className={`py-1.5 px-3 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-colors ${formData.is_zero_vat ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                            >
                              <Check className={`w-3.5 h-3.5 ${formData.is_zero_vat ? 'opacity-100' : 'opacity-0 hidden'}`} />
                              <span>{language === 'he' ? 'ללא מע״מ (0%)' : 'No VAT (0%)'}</span>
                            </button>
                            
                            {formData.is_refund && (
                              <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={(e) => {
                                  setFormData(prev => ({ ...prev, refund_received: !prev.refund_received }));
                                }}
                                className={`py-1.5 px-3 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-colors ${formData.refund_received ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                              >
                                <Check className={`w-3.5 h-3.5 ${formData.refund_received ? 'opacity-100' : 'opacity-0 hidden'}`} />
                                <span>{language === 'he' ? 'הזיכוי התקבל' : 'Credit received'}</span>
                                </button>
                                )}
                                </div>
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
                            <div className="mt-3">
                            <Label className="text-xs text-gray-600">{language === 'he' ? 'קשר לזיכוי פתוח / לחשבונית (אופציונלי)' : 'Link to open credit / receipt (optional)'}</Label>
                            <Select value={formData.linked_receipt_id || ''} onValueChange={(val) => setFormData(prev => ({ ...prev, linked_receipt_id: val }))} disabled={isReadOnly}>
                               <SelectTrigger><SelectValue placeholder={language === 'he' ? 'בחר זיכוי פתוח או קבלה לקישור' : 'Select open credit or receipt'} /></SelectTrigger>
                               <SelectContent>
                                 {(previousReceipts || []).slice(0,200).map(r => (
                                   <SelectItem key={r.id} value={r.id}>
                                     {r.awaiting_credit ? '🔴 ' : ''}{(r.invoice_number || r.order_number || r.id)} • {new Date(r.received_date).toLocaleDateString(language==='he'?'he-IL':'en-US')} • {r.supplier_name}{r.awaiting_credit ? (language==='he'?' (ממתין לזיכוי)':' (Awaiting Credit)') : ''}
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                             {formData.linked_receipt_id && previousReceipts.find(r => r.id === formData.linked_receipt_id)?.verified_items?.some(i => i.request_credit_quantity || i.request_credit_price) && (
                               <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-800">
                                 <div className="font-bold mb-1">{language === 'he' ? 'זיכויים ממתינים בחשבונית זו:' : 'Pending credits in this invoice:'}</div>
                                 <ul className="list-disc list-inside space-y-1">
                                   {previousReceipts.find(r => r.id === formData.linked_receipt_id).verified_items.filter(i => i.request_credit_quantity || i.request_credit_price).map((i, idx) => (
                                     <li key={idx} className="text-xs">
                                       <span className="font-medium">{i.item_name}</span>: 
                                       {i.request_credit_quantity && (language === 'he' ? ` פער כמות (הוזמן ${i.ordered_quantity}, התקבל ${i.received_quantity})` : ` Qty gap (Ord: ${i.ordered_quantity}, Rec: ${i.received_quantity})`)}
                                       {i.request_credit_price && (language === 'he' ? ` פער מחיר (₪${i.actual_price} במקום ₪${i.catalog_price})` : ` Price gap (₪${i.actual_price} instead of ₪${i.catalog_price})`)}
                                     </li>
                                   ))}
                                 </ul>
                               </div>
                             )}
                             </div>
                            </>
                            )}

                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-semibold">
                            {formData.verified_items.length > 0 
                              ? (t('items') || 'פריטים') + ` (${formData.verified_items.length})`
                              : (safeT('add_items', '\u05d4\u05d5\u05e1\u05e3 \u05e4\u05e8\u05d9\u05d8\u05d9\u05dd', 'Add items') || 'הוסף פריטים')
                            }
                          </Label>
                          {!isReadOnly && (
                            <Button
                              type="button"
                              onClick={addManualItem}
                              variant="outline"
                              size="sm"
                            >
                              <Plus className="w-4 h-4 ml-2" />
                              {safeT('add_item', 'הוסף פריט', 'Add item')}
                            </Button>
                          )}
                        </div>
                        
                        {formData.verified_items.length > 0 && (
                          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                              <table className="w-full text-sm text-left rtl:text-right min-w-[600px]">
                                <thead className="bg-[#f9fafb] text-[#4b5563] text-xs font-semibold">
                                  <tr>
                                    <th className="px-3 py-3 w-8 font-semibold">#</th>
                                    <th className="px-3 py-3 font-semibold min-w-[140px] uppercase">{safeT('item_name', 'שם פריט', 'Item')}</th>
                                    <th className="px-2 py-3 font-semibold w-16 text-center uppercase">{language === 'he' ? 'הוזמן' : 'Ord'}</th>
                                    <th className="px-2 py-3 font-semibold w-20 text-center uppercase">{t('received')}</th>
                                    <th className="px-2 py-3 font-semibold w-20 text-center uppercase">{t('price')}</th>
                                    <th className="px-2 py-3 font-semibold w-16 text-center uppercase">{language === 'he' ? 'הנחה %' : 'Disc%'}</th>
                                    <th className="px-2 py-3 font-semibold w-12 text-center"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {formData.verified_items.map((item, index) => (
                                    <tbody key={index} className="contents">
                                      <tr className={`border-t border-[#f3f4f6] ${index % 2 === 0 ? 'bg-white' : 'bg-[#f9fafb]'} transition-colors`}>
                                        <td className="px-3 py-2 text-[#9ca3af] text-xs text-center align-top pt-4">{index + 1}</td>
                                        <td className="px-3 py-2 align-top pt-3">
                                          <Input
                                            value={item.item_name}
                                            onChange={(e) => updateVerifiedItem(index, 'item_name', e.target.value)}
                                            placeholder={safeT('item_name', 'שם פריט', 'Item Name')}
                                            className="font-medium h-8 text-sm text-[#111827] border-transparent hover:border-gray-200 focus:border-blue-500 bg-transparent px-2 shadow-none"
                                            disabled={isReadOnly}
                                          />
                                          {(!noOrderMode && (order || openOrders.length > 0) && item.received_quantity !== item.ordered_quantity && item.ordered_quantity > 0) && (
                                            <div className="mt-1 px-2 text-[10px] text-orange-700 font-medium">
                                              {language === 'he' ? 'חריגה בכמות' : 'Quantity mismatch'}
                                            </div>
                                          )}
                                          {(!noOrderMode && (order || openOrders.length > 0) && item.received_quantity > 0 && item.ordered_quantity === 0 && item.item_id) && (
                                            <div className="mt-1 px-2 text-[10px] text-purple-700 font-medium">
                                              {language === 'he' ? 'לא הוזמן במקור' : 'Not ordered'}
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-2 py-2 align-top pt-3">
                                          <Input
                                            type="number"
                                            value={item.ordered_quantity}
                                            disabled
                                            className="bg-transparent text-gray-500 h-8 px-1 text-center text-sm border-transparent shadow-none"
                                          />
                                        </td>
                                        <td className="px-2 py-2 align-top pt-3">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={item.received_quantity}
                                            onChange={(e) => updateVerifiedItem(index, 'received_quantity', parseFloat(e.target.value) || 0)}
                                            className="h-8 px-1 text-center text-sm font-bold text-[#111827] border-gray-200 focus:border-blue-500"
                                            disabled={isReadOnly}
                                          />
                                        </td>
                                        <td className="px-2 py-2 align-top pt-3">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={item.actual_price}
                                            onChange={(e) => updateVerifiedItem(index, 'actual_price', parseFloat(e.target.value) || 0)}
                                            className={`h-8 px-1 text-center text-sm font-bold ${item.price_changed ? 'text-red-600 border-red-300 focus-visible:ring-red-500 bg-red-50' : 'text-[#111827] border-gray-200 focus:border-blue-500'}`}
                                            disabled={isReadOnly}
                                          />
                                        </td>
                                        <td className="px-2 py-2 align-top pt-3">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={item.actual_discount}
                                            onChange={(e) => updateVerifiedItem(index, 'actual_discount', parseFloat(e.target.value) || 0)}
                                            className={`h-8 px-1 text-center text-sm font-bold ${item.discount_changed ? 'text-red-600 border-red-300 focus-visible:ring-red-500 bg-red-50' : 'text-[#111827] border-gray-200 focus:border-blue-500'}`}
                                            disabled={isReadOnly}
                                          />
                                        </td>
                                        <td className="px-2 py-2 text-center align-top pt-3">
                                          {!isReadOnly && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => removeItem(index)}
                                              className="text-gray-400 hover:text-red-600 h-8 w-8 shrink-0"
                                            >
                                              <X className="w-4 h-4" />
                                            </Button>
                                          )}
                                        </td>
                                      </tr>
                                      {/* Credit checkboxes row if discrepancies exist */}
                                      {((item.price_changed || item.discount_changed || (item.ordered_quantity !== item.received_quantity && item.ordered_quantity > 0))) && (
                                        <tr className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#f9fafb]'}`}>
                                          <td></td>
                                          <td colSpan="6" className="px-3 pb-3 pt-0">
                                            <div className="flex items-center gap-2 flex-wrap ml-2 rtl:mr-2 rtl:ml-0">
                                              {item.ordered_quantity !== item.received_quantity && item.ordered_quantity > 0 && (
                                                <label className="flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded border border-red-100 cursor-pointer w-fit transition-colors hover:bg-red-100">
                                                  <input disabled={isReadOnly} type="checkbox" checked={item.request_credit_quantity} onChange={(e) => updateVerifiedItem(index, 'request_credit_quantity', e.target.checked)} className="rounded accent-red-600 w-3.5 h-3.5" />
                                                  <span className="text-[11px] text-red-800 font-medium leading-none">{language === 'he' ? 'לזיכוי כמות' : 'Qty credit'}</span>
                                                </label>
                                              )}
                                              {(item.price_changed || item.discount_changed) && (
                                                <label className="flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded border border-red-100 cursor-pointer w-fit transition-colors hover:bg-red-100">
                                                  <input disabled={isReadOnly} type="checkbox" checked={item.request_credit_price} onChange={(e) => updateVerifiedItem(index, 'request_credit_price', e.target.checked)} className="rounded accent-red-600 w-3.5 h-3.5" />
                                                  <span className="text-[11px] text-red-800 font-medium leading-none">{language === 'he' ? 'לזיכוי מחיר' : 'Price credit'}</span>
                                                </label>
                                              )}
                                            </div>
                                            </td>
                                            </tr>
                                            )}
                                            </tbody>
                                            ))}
                                            </tbody>
                                            </table>
                            </div>
                          </div>
                        )}
                      </div>

                      {formData.verified_items.some(i => i.request_credit_quantity || i.request_credit_price) && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                          <h4 className="font-bold text-red-800 mb-2">{language === 'he' ? 'פריטים דורשים זיכוי' : 'Items pending credit'}</h4>
                          <p className="text-sm text-red-700 mb-4">
                            {language === 'he' ? 'סימנת פריטים עם פערים המצריכים בקשת זיכוי מהספק.' : 'You marked items with discrepancies requiring a credit request from the supplier.'}
                          </p>
                          <Button 
                            type="button" 
                            className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto font-bold"
                            onClick={async () => {
                              const s = availableSuppliers.find(x => x.id === formData.supplier_id);
                              const phone = (s?.phone || "").replace(/\D/g, "");
                              const creditItems = formData.verified_items.filter(i => i.request_credit_quantity || i.request_credit_price);
                              const rName = user?.business_name || user?.acting_as_store_name || user?.store_user_store_name || user?.full_name || '';
                              let text = language === 'he' 
                                ? `שלום, בהמשך לקבלת סחורה (חשבונית מס' ${formData.invoice_number || 'ללא מספר'}) למסעדת ${rName} מצאנו פערים שמצריכים זיכוי:\n\n`
                                : `Hello, regarding receipt (Invoice #${formData.invoice_number || 'N/A'}) to ${rName}, we found discrepancies needing credit:\n\n`;
                              creditItems.forEach(i => {
                                text += `- ${i.item_name}:\n`;
                                if (i.request_credit_quantity) text += language === 'he' ? `  הוזמן: ${i.ordered_quantity}, התקבל בפועל: ${i.received_quantity} (פער של ${i.ordered_quantity - i.received_quantity})\n` : `  Ordered: ${i.ordered_quantity}, Received: ${i.received_quantity}\n`;
                                if (i.request_credit_price) text += language === 'he' ? `  מחיר שהוזמן: ₪${i.catalog_price}, מחיר בחשבונית: ₪${i.actual_price}\n` : `  Ordered Price: ₪${i.catalog_price}, Invoiced: ₪${i.actual_price}\n`;
                                text += "\n";
                              });
                              text += language === 'he' ? "אשמח לטיפולכם ולהפקת חשבונית זיכוי.\n\n" : "Please process a credit invoice.\n\n";
                              text += `${rName}\nהזמנה זו נשלחה באמצעות מערכת SMART PLATE BASIC, The ultimate food & labor cost app for the restaurant industry 2026.\n\n\n\n`;
                              if (s?.email) {
                                try {
                                  const logoHtml = user?.restaurant_logo ? `<br/><br/><img src="${user.restaurant_logo}" alt="Logo" style="max-height:80px;"/>` : '';
                                  await base44.integrations.Core.SendEmail({ to: s.email, subject: language === 'he' ? `בקשת זיכוי - חשבונית ${formData.invoice_number || 'ללא מספר'}` : `Credit Request - Invoice ${formData.invoice_number || 'N/A'}`, body: text.replace(/\n/g, '<br/>') + logoHtml });
                                } catch (e) {}
                              }
                              window.open(phone ? `https://wa.me/972${phone.startsWith('0') ? phone.slice(1) : phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                          >
                            {language === 'he' ? 'שלח בקשת זיכוי לספק (וואטסאפ ולמייל המוגדר)' : 'Send Credit Request (WhatsApp & Email)'}
                          </Button>
                        </div>
                      )}
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

                    <div className={`grid gap-2 pt-4 w-full ${scannedDocs.length > 1 ? 'grid-cols-2' : ((receipt && onDelete && !isReadOnly) ? 'grid-cols-3' : (!isReadOnly ? 'grid-cols-2' : 'grid-cols-1'))}`}>
                      {scannedDocs.length > 1 ? (
                        <>
                          <Button
                            type="button"
                            className="bg-green-600 hover:bg-green-700 text-white h-10 px-1 text-xs sm:text-sm shadow-none"
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

                              const executeMultiSubmit = async () => {
                                const baseData = {
                                supplier_id: formData.supplier_id,
                                supplier_name: formData.supplier_name,
                                supplier_email: formData.supplier_email,
                                received_date: formData.received_date,
                                verified_items: [],
                                price_changes_summary: [],
                                has_price_changes: false,
                                notes: formData.notes || "",
                                needs_review: !!formData.needs_review,
                                review_note: formData.review_note || ""
                              };
                              // Create missing items from the first doc's items (since multiple docs just copy baseData)
                              const itemsWithIssues = baseData.verified_items?.filter(item => !item.item_id && item.item_name) || [];
                              if (itemsWithIssues.length > 0) {
                                for (const item of itemsWithIssues) {
                                  try {
                                    const createdItem = await base44.entities.Item.create({
                                      name: item.item_name,
                                      supplier_id: 'pending',
                                      supplier_name: 'להשלמה',
                                      price: item.actual_price || 0,
                                      unit: item.unit || 'unit',
                                      is_pending_completion: true,
                                      status: 'pending_completion'
                                    });
                                    item.item_id = createdItem.id;
                                  } catch(e) { console.error(e); }
                                }
                              }

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
                                if (base44.entities.SupplyReceipt.bulkCreate) await base44.entities.SupplyReceipt.bulkCreate(payloads);
                                else await Promise.all(payloads.map(p => base44.entities.SupplyReceipt.create(p)));
                                if (formData.linked_receipt_id && payloads.some(p => p.is_refund)) await base44.entities.SupplyReceipt.update(formData.linked_receipt_id, {awaiting_credit: false, refund_received: true}).catch(()=>{});
                                alert(language === 'he' ? 'נשמרו כל החשבוניות' : 'All invoices saved');
                                onCancel && onCancel();
                              } catch (e) {
                                alert((language === 'he' ? 'שמירה נכשלה' : 'Save failed') + ': ' + (e?.message || e));
                              }
                              };

                              executeMultiSubmit();
                              }}
                              >
                              <PackageCheck className="w-3 h-3 sm:w-4 sm:h-4 ml-1 shrink-0" />
                            <span className="truncate">{language === 'he' ? 'שמור הכל' : 'Save all'}</span>
                          </Button>
                          <Button type="button" variant="outline" onClick={onCancel} className="h-10 px-1 text-xs sm:text-sm shadow-none">
                            <span className="truncate">{safeT('cancel', 'ביטול', 'Cancel')}</span>
                          </Button>
                        </>
                      ) : (
                        <>
                          {!isReadOnly && (
                            <Button 
                              type="submit" 
                              className="bg-green-600 hover:bg-green-700 text-white h-10 px-1 text-xs sm:text-sm shadow-none"
                              disabled={!formData.invoice_number || formData.receipt_images.length === 0}
                            >
                              <PackageCheck className="w-3 h-3 sm:w-4 sm:h-4 ml-1 shrink-0" />
                              <span className="truncate">{safeT('save_receipt', 'שמור קבלה', 'Save')}</span>
                            </Button>
                          )}
                          {!isReadOnly && receipt && onDelete && (
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => onDelete(receipt)}
                              className="h-10 px-1 text-xs sm:text-sm shadow-none"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 ml-1 shrink-0" />
                              <span className="truncate">{safeT('delete', 'מחיקה', 'Delete')}</span>
                            </Button>
                          )}
                          <Button type="button" variant="outline" onClick={onCancel} className="h-10 px-1 text-xs sm:text-sm shadow-none">
                            <span className="truncate">{isReadOnly ? (language === 'he' ? 'סגור' : 'Close') : safeT('cancel', 'ביטול', 'Cancel')}</span>
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

      <Dialog open={anomalyCheck.show} onOpenChange={(val) => { if (!val) setAnomalyCheck({ show: false, messages: [], onContinue: null }); }}>
        <DialogContent className="max-w-md" dir={language === 'he' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Info className="w-5 h-5" />
              {language === 'he' ? 'שים לב לנתוני הקבלה' : 'Please Note'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Anomaly warnings for the receipt
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {anomalyCheck.messages.map((msg, i) => (
              <div key={i} className="flex items-start gap-2 text-sm bg-orange-50 p-3 rounded-lg border border-orange-100 text-orange-900">
                <span className="mt-1 w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                <span>{msg}</span>
              </div>
            ))}
            <p className="text-sm text-gray-600 mt-4 font-medium">
              {language === 'he' 
                ? 'האם תרצה לאשר את קבלת הסחורה כפי שהיא, או לחזור לערוך אותה (למשל לבקש זיכוי)?'
                : 'Do you want to accept the supply as is, or go back to edit it (e.g., to ask for a refund)?'}
            </p>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-start">
            <Button
              type="button"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                const action = anomalyCheck.onContinue;
                setAnomalyCheck({ show: false, messages: [], onContinue: null });
                if (action) action();
              }}
            >
              {language === 'he' ? 'אשר והמשך' : 'Confirm and Accept'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAnomalyCheck({ show: false, messages: [], onContinue: null })}
            >
              {language === 'he' ? 'חזור לעריכה' : 'Go Back to Edit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewOrder && (
        <OrderPreviewModal
          order={previewOrder}
          isOpen={!!previewOrder}
          onClose={() => setPreviewOrder(null)}
          onSend={() => {}}
          onSendEmail={() => {}}
          hideActions={true}
        />
      )}
    </>
  );
}