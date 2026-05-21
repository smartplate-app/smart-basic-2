import React, { useMemo, useState } from "react";
import moment from "moment";
import { useLanguage } from "../LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ChevronRight, ChevronDown, Search, CloudUpload, FileSpreadsheet, HardDrive, Link as LinkIcon, Send } from "lucide-react";

function normalizeText(str) {
  if (!str) return '';
  try {
    const s = String(str).toLowerCase();
    const noNiq = s.replace(/[\u0591-\u05C7]/g, ''); // remove Hebrew niqqud
    const noPunct = noNiq.replace(/[^\p{L}\p{N}\s]/gu, ' '); // keep letters, numbers, spaces
    return noPunct.replace(/\s+/g, ' ').trim();
  } catch {
    return String(str).toLowerCase().trim();
  }
}

export default function MonthlyInvoiceReport({ receipts = [], suppliers = [] }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [month, setMonth] = useState(() => moment().format('YYYY-MM'));
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [driveAuthorized, setDriveAuthorized] = useState(null);
  const [showDriveConfirm, setShowDriveConfirm] = useState(false);
  const [driveAccount, setDriveAccount] = useState(null);
  const [targetPath, setTargetPath] = useState('');
  const [me, setMe] = useState(null);
  const [showConnect, setShowConnect] = useState(false);
  const [connectEmail, setConnectEmail] = useState('');
  const [targetUser, setTargetUser] = useState(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [sortMode, setSortMode] = useState('supplier_asc');
  const [itemSearch, setItemSearch] = useState('');
  const [uploadTarget, setUploadTarget] = useState('drive');

  React.useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setMe(u);
        const acting = u?.acting_as_store_email || u?.acting_as_user_email || u?.email || '';
        setTargetEmail(acting);
        if (acting && acting !== u?.email) {
          const users = await base44.entities.User.filter({ email: acting });
          const tu = Array.isArray(users) && users.length ? users[0] : null;
          setTargetUser(tu);
          setConnectEmail(tu?.drive_share_email || acting);
        } else {
          setTargetUser(u);
          setConnectEmail(u?.drive_share_email || acting);
        }
      } catch {}
    })();
  }, []);

  const supplierById = useMemo(() => {
    const map = {};
    suppliers.forEach(s => { map[s.id] = s; });
    return map;
  }, [suppliers]);

  const monthStart = useMemo(() => moment(month + '-01').startOf('month'), [month]);
  const monthEnd = useMemo(() => moment(month + '-01').endOf('month'), [month]);

  const monthReceipts = useMemo(() => {
    const inRange = (receipts || []).filter(r => {
      const dateStr = r.invoice_date || r.received_date;
      if (!dateStr) return false;
      const d = moment(dateStr, [moment.ISO_8601, 'YYYY-MM-DD', 'DD/MM/YYYY']);
      return d.isValid() && d.isBetween(monthStart, monthEnd, undefined, '[]');
    });
    const term = normalizeText(itemSearch || '');
    const filtered = term ? inRange.filter(r => {
      const items = Array.isArray(r.verified_items) ? r.verified_items : [];
      const matchesItem = items.some(it => normalizeText(String(it.item_name || it.name || '')).includes(term));
      const matchesSupplier = normalizeText(String(r.supplier_name || supplierById[r.supplier_id]?.name || '')).includes(term);
      return matchesItem || matchesSupplier;
    }) : inRange;
    return filtered.sort((a, b) => (a.invoice_date || a.received_date || '').localeCompare(b.invoice_date || b.received_date || ''));
  }, [receipts, monthStart, monthEnd, itemSearch]);

  const grouped = useMemo(() => {
    const map = {};
    monthReceipts.forEach(r => {
      const key = r.supplier_id || 'unknown';
      if (!map[key]) map[key] = { supplier_id: key, supplier_name: r.supplier_name || supplierById[key]?.name || t('unknown') || 'Unknown', receipts: [], total: 0 };
      map[key].receipts.push(r);
      map[key].total += Number(r.invoice_total || 0);
    });
    const arr = Object.values(map);
    if (sortMode === 'supplier_desc') arr.sort((a, b) => b.supplier_name.localeCompare(a.supplier_name));
    else if (sortMode === 'total_desc') arr.sort((a, b) => b.total - a.total);
    else if (sortMode === 'total_asc') arr.sort((a, b) => a.total - b.total);
    else arr.sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));
    return arr;
  }, [monthReceipts, supplierById, t, sortMode]);

  const grandTotal = useMemo(() => grouped.reduce((sum, g) => sum + g.total, 0), [grouped]);
  const totalReceipts = monthReceipts.length;
  const totalSuppliers = grouped.length;
  const avgReceipt = totalReceipts > 0 ? (grandTotal / totalReceipts) : 0;

  return (
    <div className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-4">
        
        {/* Main Header & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={uploading}
                  className="bg-[#d4a373] hover:bg-[#b88c60] text-white shrink-0 h-11 md:h-10 px-5 rounded-lg shadow-sm"
                >
                  <CloudUpload className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                  {uploading ? (t('uploading') || 'Uploading...') : (language === 'he' ? 'העלה לענן' : 'Upload to Cloud')}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={async () => {
                  setUploadResult(null);
                  setUploadTarget('drive');
                  try {
                    let isAuth = false;
                    try {
                      const { data: auth } = await base44.functions.invoke('checkDriveAuth', {});
                      isAuth = !!auth?.authorized;
                      setDriveAuthorized(isAuth);
                    } catch (authErr) {
                      isAuth = false;
                      setDriveAuthorized(false);
                    }
                    if (!isAuth) {
                      alert(language === 'he' ? 'אנא התחבר ל-Google Drive תחילה.' : (t('connect_drive_prompt') || 'Please connect Google Drive first. If you do not see a consent prompt, contact the app owner to enable Drive for your account.'));
                      return;
                    }

                    let me = null;
                    try { me = await base44.auth.me(); } catch {}
                    if ((me?.role !== 'admin') && !me?.drive_share_email) {
                      setShowConnect(true);
                      return;
                    }

                    try {
                      const { data } = await base44.functions.invoke('driveWhoAmI', {});
                      setDriveAccount(data?.user || null);
                    } catch {}
                    setTargetPath(`SmartPlateUploads/${(me?.email || 'me')}/Invoices-${month}`);

                    setShowDriveConfirm(true);
                  } catch (e) {
                    alert((language === 'he' ? 'שגיאה בהעלאה' : (t('upload_failed') || 'Upload failed')) + `: ${e?.message || e}`);
                  }
                }}>
                  {language === 'he' ? 'העלה ל-Google Drive' : (t('upload_to_drive') || 'Upload to Google Drive')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  setUploadResult(null);
                  setUploadTarget('dropbox');
                  try {
                    let isAuth = false;
                    try {
                      const { data: auth } = await base44.functions.invoke('checkDropboxAuth', {});
                      isAuth = !!auth?.authorized;
                    } catch (authErr) {
                      isAuth = false;
                    }
                    if (!isAuth) {
                      alert(language === 'he' ? 'אנא התחבר ל-Dropbox תחילה.' : 'Please connect Dropbox first.');
                      return;
                    }

                    let me = null;
                    try { me = await base44.auth.me(); } catch {}
                    
                    setDriveAccount({ displayName: 'Dropbox' });
                    setTargetPath(`SmartPlateUploads/${(me?.email || 'me')}/Invoices-${month}`);

                    setShowDriveConfirm(true);
                  } catch (e) {
                    alert((t('upload_failed') || 'Upload failed') + `: ${e?.message || e}`);
                  }
                }}>
                  {language === 'he' ? 'העלה ל-Dropbox' : 'Upload to Dropbox'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
               variant="outline"
               disabled={uploading}
               className="h-11 md:h-10 px-4 rounded-lg bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm"
               onClick={async () => {
                 try {
                   // Auth check
                   let isAuth = false;
                  try {
                    const { data: auth } = await base44.functions.invoke('checkDriveAuth', {});
                    isAuth = !!auth?.authorized;
                    setDriveAuthorized(isAuth);
                  } catch {
                    isAuth = false;
                  }
                  if (!isAuth) { alert(language === 'he' ? 'אנא התחבר ל-Google Drive תחילה.' : (t('connect_drive_prompt') || 'Please connect Google Drive first.')); return; }

                  // Ensure share email exists (for admin preview use target user's share)
                  const adminControlling = !!(me?.role === 'admin' && (me?.acting_as_store_email || me?.acting_as_user_email));
                  const shareEmail = adminControlling ? (targetUser?.drive_share_email || '') : (me?.drive_share_email || '');
                  if (!shareEmail) { setShowConnect(true); return; }

                  const payload = {
                    month,
                    targetEmail,
                    shareEmail,
                    receipts: monthReceipts.map(r => ({
                      id: r.id,
                      supplier_id: r.supplier_id,
                      supplier_name: r.supplier_name,
                      invoice_number: r.invoice_number,
                      invoice_date: r.invoice_date,
                      received_date: r.received_date,
                      invoice_total: r.invoice_total,
                      receipt_images: r.receipt_images,
                    })),
                  };

                  const { data } = await base44.functions.invoke('exportMonthlyInvoicesSheet', payload);
                  if (data?.sheet?.webViewLink) {
                    alert((language === 'he' ? 'הייצוא הושלם בהצלחה' : (t('export_completed') || 'Export completed')) + `\n${data.sheet.webViewLink}`);
                    window.open(data.sheet.webViewLink, '_blank');
                  } else {
                    alert(language === 'he' ? 'הייצוא הושלם בהצלחה' : (t('export_completed') || 'Export completed'));
                  }
                } catch (e) {
                  alert((language === 'he' ? 'שגיאה בייצוא' : (t('export_failed') || 'Export failed')) + `: ${e?.message || e}`);
                }
              }}
            >
              <FileSpreadsheet className="w-4 h-4 rtl:ml-2 ltr:mr-2 text-gray-500" />
              {language === 'he' ? 'ייצא לאקסל' : (t('export_sheet') || 'Export Sheet')}
            </Button>
            
            <Button
               variant="outline"
               disabled={uploading}
               className="h-11 md:h-10 px-4 rounded-lg bg-white border-gray-200 text-blue-700 hover:bg-blue-50 shadow-sm border-blue-200"
               onClick={async () => {
                 const unsent = monthReceipts.filter(r => Array.isArray(r.receipt_images) && r.receipt_images.length > 0 && !r.dokka_synced);
                 if (unsent.length === 0) {
                   alert(language === 'he' ? 'אין חשבוניות חדשות עם קבצים מצורפים לשלוח ל-Dokka החודש' : 'No new invoices with attachments to send to Dokka this month');
                   return;
                 }
                 if (!window.confirm(language === 'he' ? `לשלוח ${unsent.length} חשבוניות חדשות ל-Dokka?` : `Send ${unsent.length} new invoices to Dokka?`)) return;
                 
                 setUploading(true);
                 let successCount = 0;
                 let errorCount = 0;
                 
                 for (const r of unsent) {
                    try {
                      const { data } = await base44.functions.invoke('sendInvoiceToDokka', { receiptId: r.id });
                      if (data?.success) successCount++;
                      else errorCount++;
                    } catch(e) {
                      errorCount++;
                    }
                 }
                 setUploading(false);
                 alert(language === 'he' ? `נשלחו ${successCount} חשבוניות בהצלחה.${errorCount > 0 ? ` נכשלו ${errorCount}.` : ''}` : `Sent ${successCount} successfully.${errorCount > 0 ? ` Failed ${errorCount}.` : ''}`);
               }}
            >
              <Send className="w-4 h-4 rtl:ml-2 ltr:mr-2 text-blue-600" />
              {language === 'he' ? 'שלח ל-Dokka' : 'Send to Dokka'}
            </Button>
            
            <Button
               variant="outline"
               disabled={uploading}
               className="h-11 md:h-10 px-4 rounded-lg bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm"
               onClick={async () => {
                 try {
                   const { data } = await base44.functions.invoke('checkDriveAuth', {});
                   setDriveAuthorized(!!data?.authorized);
                   alert(data?.authorized ? (language === 'he' ? 'Google Drive מחובר' : (t('drive_connected') || 'Google Drive is connected')) : (language === 'he' ? 'Google Drive אינו מחובר' : (t('drive_not_connected') || 'Google Drive is not connected')));
                 } catch (e) {
                   setDriveAuthorized(false);
                   alert(language === 'he' ? 'Google Drive אינו מחובר' : (t('drive_not_connected') || 'Google Drive is not connected'));
                 }
               }}
            >
              <HardDrive className="w-4 h-4 rtl:ml-2 ltr:mr-2 text-gray-500" />
              {language === 'he' ? 'בדוק חיבור לדרייב' : (t('check_drive') || 'Check Drive')}
            </Button>
            
            {(me?.role !== 'admin' || me?.acting_as_store_email || me?.acting_as_user_email) && (
              <Button 
                variant="outline" 
                disabled={uploading} 
                onClick={() => setShowConnect(true)} 
                className="h-11 md:h-10 px-4 rounded-lg bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm"
              >
                <LinkIcon className="w-4 h-4 rtl:ml-2 ltr:mr-2 text-gray-500" />
                {language === 'he' ? 'חבר לדרייב' : (t('connect_drive') || 'Connect Drive')}
              </Button>
            )}
          </div>
        </div>

        {/* Filters Box */}
        <div className="flex flex-col gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-gray-50/50 border border-gray-200 rounded-xl">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-white hover:shadow-sm transition-all" onClick={() => setMonth(moment(month + '-01').subtract(1, 'month').format('YYYY-MM'))}>
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </Button>
              <Input 
                type="month" 
                value={month} 
                onChange={(e) => setMonth(e.target.value)} 
                className="h-9 w-32 md:w-36 rounded-lg bg-transparent border-transparent shadow-none font-medium text-center focus-visible:bg-white focus-visible:border-gray-300 focus-visible:shadow-sm transition-all" 
              />
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-white hover:shadow-sm transition-all" onClick={() => setMonth(moment(month + '-01').add(1, 'month').format('YYYY-MM'))}>
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </Button>
            </div>

            <div className="relative flex-1 min-w-[200px] max-w-sm flex items-center bg-gray-50/50 border border-gray-200 rounded-xl focus-within:bg-white transition-colors">
              <div className="relative flex-1">
                <Search className={`absolute top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 ${isRTL ? 'left-3' : 'right-3'}`} />
                <Input
                  list="suppliers-datalist"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder={language === 'he' ? 'חפש פריט או ספק...' : 'Search item or supplier...'}
                  className={`h-11 border-none shadow-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 ${isRTL ? 'pl-9 pr-3' : 'pr-9 pl-3'}`}
                  autoComplete="off"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-gray-400 hover:text-gray-600 mr-1 rtl:ml-1 rtl:mr-0">
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? "start" : "end"} className="max-h-[300px] overflow-y-auto w-[220px]">
                  <DropdownMenuItem onClick={() => setItemSearch('')} className="font-medium text-gray-500">
                    {language === 'he' ? 'נקה חיפוש' : 'Clear search'}
                  </DropdownMenuItem>
                  {Array.from(new Set(suppliers.map(s => s.name).filter(Boolean)))
                    .sort((a,b) => a.localeCompare(b))
                    .map(name => (
                      <DropdownMenuItem key={name} onClick={() => setItemSearch(name)}>
                        {name}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <datalist id="suppliers-datalist">
                {Array.from(new Set(suppliers.map(s => s.name).filter(Boolean)))
                  .sort((a,b) => a.localeCompare(b))
                  .map(name => (
                    <option key={name} value={name} />
                  ))}
              </datalist>
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-gray-500 text-sm mb-1">{language === 'he' ? 'סה"כ הוצאות' : 'Total Expenses'}</span>
              <span className="text-2xl font-bold text-gray-900">₪{grandTotal.toFixed(0)}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-gray-500 text-sm mb-1">{language === 'he' ? 'מספר קבלות' : 'Total Receipts'}</span>
              <span className="text-2xl font-bold text-gray-900">{totalReceipts}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-gray-500 text-sm mb-1">{language === 'he' ? 'מספר ספקים' : 'Total Suppliers'}</span>
              <span className="text-2xl font-bold text-gray-900">{totalSuppliers}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-gray-500 text-sm mb-1">{language === 'he' ? 'ממוצע לקבלה' : 'Avg. Receipt'}</span>
              <span className="text-2xl font-bold text-gray-900">₪{avgReceipt.toFixed(0)}</span>
            </div>
          </div>
          <div className="overflow-auto max-h-[60vh] w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full min-w-[700px] border-collapse relative">
              <thead className="bg-transparent border-b border-gray-100 sticky top-0 z-20">
                <tr>
                  <th className={`px-4 py-4 text-xs font-semibold text-gray-500 sticky top-0 bg-white/95 backdrop-blur z-10 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="inline-flex items-center gap-1 cursor-pointer hover:text-gray-900 transition-colors" onClick={() => setSortMode(sortMode === 'supplier_asc' ? 'supplier_desc' : 'supplier_asc')}>
                      {language === 'he' ? 'ספק' : (t('supplier') || 'Supplier')}
                      <span className={`text-[10px] ${sortMode.startsWith('supplier') ? 'text-gray-900' : 'text-gray-400'}`}>
                        {sortMode === 'supplier_asc' ? '↑' : sortMode === 'supplier_desc' ? '↓' : '⇅'}
                      </span>
                    </div>
                  </th>
                  <th className={`px-4 py-4 text-xs font-semibold text-gray-500 sticky top-0 bg-white/95 backdrop-blur z-10 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'מספר חשבונית' : (t('invoice_number') || 'Invoice #')}</th>
                  <th className={`px-4 py-4 text-xs font-semibold text-gray-500 sticky top-0 bg-white/95 backdrop-blur z-10 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'תאריך' : (t('invoice_date') || 'Date')}</th>
                  <th className={`px-4 py-4 text-xs font-semibold text-gray-500 sticky top-0 bg-white/95 backdrop-blur z-10 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="inline-flex items-center gap-1 cursor-pointer hover:text-gray-900 transition-colors" onClick={() => setSortMode(sortMode === 'total_desc' ? 'total_asc' : 'total_desc')}>
                      {language === 'he' ? 'סה"כ' : (t('invoice_total') || 'Total')}
                      <span className={`text-[10px] ${sortMode.startsWith('total') ? 'text-gray-900' : 'text-gray-400'}`}>
                        {sortMode === 'total_asc' ? '↑' : sortMode === 'total_desc' ? '↓' : '⇅'}
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {grouped.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={4}>
                      {language === 'he' ? 'אין קבלות להצגה בחודש זה' : (t('no_receipts_to_display') || 'No receipts to display')}
                    </td>
                  </tr>
                )}

                {grouped.map(group => (
                  <React.Fragment key={group.supplier_id}>
                    <tr className="bg-green-50/50 border-t border-green-100">
                      <td className="px-4 py-3 font-semibold text-gray-900">{group.supplier_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500" colSpan={2}>{language === 'he' ? 'סה"כ' : (t('total') || 'Total')}</td>
                      <td className="px-4 py-3 font-bold text-green-700">₪{group.total.toFixed(2)}</td>
                    </tr>
                    {group.receipts.map(r => (
                      <tr
                        key={r.id}
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                        onDoubleClick={() => setSelected(r)}
                        title={t('double_click_to_view') || 'Double click to view'}
                      >
                        <td className="px-4 py-3 text-sm text-gray-700 align-middle">
                          <div className="font-medium">{group.supplier_name}</div>
                          {itemSearch && Array.isArray(r.verified_items) && (
                            <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[240px]">
                              {(r.verified_items || [])
                                .map(it => it.item_name)
                                .filter(Boolean)
                                .filter(n => normalizeText(n).includes(normalizeText(itemSearch)))
                                .slice(0,3)
                                .join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 align-middle">{r.invoice_number || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 align-middle">{moment(r.invoice_date || r.received_date).format('DD/MM/YYYY')}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 align-middle">₪{Number(r.invoice_total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    </React.Fragment>
                ))}

                {grouped.length > 0 && (
                  <tr className="sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <td className="bg-purple-50 px-4 py-4 font-bold text-gray-900 border-t-2 border-purple-200">{language === 'he' ? 'סך הכל כללי' : (t('grand_total') || 'Grand Total')}</td>
                    <td className="bg-purple-50 px-4 py-4 border-t-2 border-purple-200" colSpan={2}></td>
                    <td className="bg-purple-50 px-4 py-4 font-bold text-purple-700 text-lg border-t-2 border-purple-200">₪{grandTotal.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {(uploadResult?.parentFolder?.webViewLink || (uploadTarget === 'dropbox' && uploadResult?.parentFolder?.path)) && (
              <div className="mt-3 text-sm text-gray-700">
                <a 
                  href={uploadResult.parentFolder.webViewLink || `https://www.dropbox.com/home${uploadResult.parentFolder.path}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-blue-600 underline"
                >
                  {uploadTarget === 'dropbox' ? (language === 'he' ? 'פתח תיקיית Dropbox' : 'Open Dropbox folder') : (t('open_drive_folder') || 'Open Drive folder')}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connect Drive dialog */}
      <Dialog open={showConnect} onOpenChange={setShowConnect}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'text-right' : 'text-left'}>
          <DialogHeader>
            <DialogTitle>{t('connect_drive') || 'Connect Drive'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>{t('enter_google_email') || 'Enter the Google email to receive your uploads:'}</div>
            <Input type="email" value={connectEmail} onChange={(e) => setConnectEmail(e.target.value)} placeholder="you@gmail.com" />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowConnect(false)}>{language === 'he' ? 'ביטול' : (t('cancel') || 'Cancel')}</Button>
            <Button onClick={async () => { try { const email = (connectEmail || '').trim(); if (!email) { alert(t('enter_google_email') || 'Enter the Google email'); return; } const adminControlling = !!(me?.role === 'admin' && (me?.acting_as_store_email || me?.acting_as_user_email)); if (adminControlling) { let tu = targetUser; if (!tu) { const users = await base44.entities.User.filter({ email: targetEmail }); tu = Array.isArray(users) && users.length ? users[0] : null; setTargetUser(tu); } if (!tu?.id) { alert('User not found'); return; } await base44.entities.User.update(tu.id, { drive_share_email: email }); setTargetUser({ ...tu, drive_share_email: email }); } else { await base44.auth.updateMe({ drive_share_email: email }); const u2 = await base44.auth.me(); setMe(u2); } alert(t('saved') || 'Saved'); setShowConnect(false); } catch (e) { alert((t('error_saving') || 'Error') + ': ' + (e?.message || e)); } }} className="bg-green-600 hover:bg-green-700">{language === 'he' ? 'שמור' : (t('save') || 'Save')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Drive confirmation dialog */}
      <Dialog open={showDriveConfirm} onOpenChange={setShowDriveConfirm}>
        <DialogContent className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{(t('confirm_upload') && t('confirm_upload') !== 'confirm_upload') ? t('confirm_upload') : 'Confirm upload'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              {uploadTarget === 'dropbox' 
                ? (language === 'he' ? 'הקבצים יועלו לחשבון ה-Dropbox המחובר:' : 'Files will be uploaded to the connected Dropbox account:')
                : ((t('drive_upload_account') && t('drive_upload_account') !== 'drive_upload_account') ? t('drive_upload_account') : "Files will be uploaded using the app owner’s Google Drive account:")}
            </div>
            <div className="font-medium">{driveAccount?.emailAddress || driveAccount?.displayName || ((t('google_drive') && t('google_drive') !== 'google_drive') ? t('google_drive') : 'Google Drive')}</div>
            <div className="text-gray-500">
              { (t('drive_target_folder') && t('drive_target_folder') !== 'drive_target_folder') ? t('drive_target_folder') : 'Target folder:' } {targetPath || 'SmartPlateUploads/<your email>/Invoices-<month>'}
            </div>
            {uploadTarget === 'drive' && (
              <div className="text-gray-500">
                {(t('drive_shared_with') && t('drive_shared_with') !== 'drive_shared_with') ? t('drive_shared_with') : 'Files will be shared with:'} {targetUser?.drive_share_email || targetEmail}
              </div>
            )}
            <div className="text-gray-500">
              {uploadTarget === 'dropbox'
                ? (language === 'he' ? 'הערה: הקבצים יאורגנו בתיקייה תחת שמך.' : 'Note: Files will be organized in a folder under your name.')
                : ((t('drive_app_connector_note') && t('drive_app_connector_note') !== 'drive_app_connector_note') ? t('drive_app_connector_note') : 'Note: For security, files upload to the app owner’s Drive and are organized under your personal folder.')}
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDriveConfirm(false)}>{language === 'he' ? 'ביטול' : (t('cancel') || 'Cancel')}</Button>
            <Button
              onClick={async () => {
                try {
                  setUploading(true);
                  const payload = {
                    month,
                    targetEmail,
                    shareEmail: targetUser?.drive_share_email || '',
                    receipts: monthReceipts.map(r => ({
                      id: r.id,
                      supplier_id: r.supplier_id,
                      supplier_name: r.supplier_name,
                      invoice_number: r.invoice_number,
                      invoice_date: r.invoice_date,
                      received_date: r.received_date,
                      receipt_images: r.receipt_images,
                    })),
                  };
                  
                  const functionName = uploadTarget === 'dropbox' ? 'uploadMonthlyInvoicesToDropbox' : 'uploadMonthlyInvoicesToDrive';
                  const { data } = await base44.functions.invoke(functionName, payload);
                  
                  setUploadResult(data);
                  setShowDriveConfirm(false);
                  
                  const link = data?.parentFolder?.webViewLink || (uploadTarget === 'dropbox' && data?.parentFolder?.path ? `https://www.dropbox.com/home${data.parentFolder.path}` : '');
                  alert((language === 'he' ? 'העלאה הושלמה בהצלחה' : (t('upload_completed') || 'Upload completed')) + (link ? `\n${link}` : ''));
                } catch (e) {
                  alert((language === 'he' ? 'העלאה נכשלה' : (t('upload_failed') || 'Upload failed')) + `: ${e?.message || e}`);
                } finally {
                  setUploading(false);
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              {language === 'he' ? 'העלה' : (t('upload') || 'Upload')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>
              {(t('invoice') || 'Invoice') + ': '}{selected?.invoice_number || '-'} • {selected?.supplier_name || ''}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-600">{t('invoice_date') || 'Date'}</div>
                  <div className="font-medium">{moment(selected.invoice_date || selected.received_date).format('DD/MM/YYYY')}</div>
                </div>
                <div>
                  <div className="text-gray-600">{t('invoice_total') || 'Total'}</div>
                  <div className="font-bold text-emerald-700">₪{Number(selected.invoice_total || 0).toFixed(2)}</div>
                </div>
              </div>

              {Array.isArray(selected.receipt_images) && selected.receipt_images.length > 0 ? (
                <div>
                  <div className="text-sm font-semibold mb-2">{t('scanned_images') || 'Scanned Images'}</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selected.receipt_images.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" className="block">
                        <img src={url} alt={`Receipt ${idx + 1}`} className="w-full h-32 object-cover rounded border" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">{t('no_scanned_images') || 'No scanned images available.'}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}