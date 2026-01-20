import React, { useMemo, useState } from "react";
import moment from "moment";
import { useLanguage } from "../LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
    return (receipts || []).filter(r => {
      const dateStr = r.invoice_date || r.received_date;
      if (!dateStr) return false;
      const d = moment(dateStr, [moment.ISO_8601, 'YYYY-MM-DD', 'DD/MM/YYYY']);
      return d.isValid() && d.isBetween(monthStart, monthEnd, undefined, '[]');
    }).sort((a, b) => (a.invoice_date || a.received_date || '').localeCompare(b.invoice_date || b.received_date || ''));
  }, [receipts, monthStart, monthEnd]);

  const grouped = useMemo(() => {
    const map = {};
    monthReceipts.forEach(r => {
      const key = r.supplier_id || 'unknown';
      if (!map[key]) map[key] = { supplier_id: key, supplier_name: r.supplier_name || supplierById[key]?.name || t('unknown') || 'Unknown', receipts: [], total: 0 };
      map[key].receipts.push(r);
      map[key].total += Number(r.invoice_total || 0);
    });
    return Object.values(map).sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));
  }, [monthReceipts, supplierById, t]);

  const grandTotal = useMemo(() => grouped.reduce((sum, g) => sum + g.total, 0), [grouped]);

  return (
    <div className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('monthly_report') || 'Monthly Report'}</span>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">{t('month') || 'Month'}</label>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Button variant="outline" size="icon" onClick={() => setMonth(moment(month + '-01').subtract(1, 'month').format('YYYY-MM'))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
                <Button variant="outline" size="icon" onClick={() => setMonth(moment(month + '-01').add(1, 'month').format('YYYY-MM'))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button
                disabled={uploading}
                onClick={async () => {
                  setUploadResult(null);
                  try {
                    // Quick auth check
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
                      alert(t('connect_drive_prompt') || 'Please connect Google Drive first. If you do not see a consent prompt, contact the app owner to enable Drive for your account.');
                      return;
                    }

                    // Require per-user share email for non-admins
                    let me = null;
                    try { me = await base44.auth.me(); } catch {}
                    if ((me?.role !== 'admin') && !me?.drive_share_email) {
                      setShowConnect(true);
                      return;
                    }

                    // Lookup the Google Drive account tied to this token
                    try {
                      const { data } = await base44.functions.invoke('driveWhoAmI', {});
                      setDriveAccount(data?.user || null);
                    } catch {}
                    setTargetPath(`SmartPlateUploads/${(me?.email || 'me')}/Invoices-${month}`);

                    // Show confirmation dialog before uploading
                    setShowDriveConfirm(true);
                  } catch (e) {
                    alert((t('upload_failed') || 'Upload failed') + `: ${e?.message || e}`);
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                {uploading ? (t('uploading') || 'Uploading...') : (t('upload_to_drive') || 'Upload to Drive')}
              </Button>
              <Button
                variant="outline"
                disabled={uploading}
                onClick={async () => {
                  try {
                    const { data } = await base44.functions.invoke('checkDriveAuth', {});
                    setDriveAuthorized(!!data?.authorized);
                    alert(data?.authorized ? (t('drive_connected') || 'Google Drive is connected') : (t('drive_not_connected') || 'Google Drive is not connected'));
                  } catch (e) {
                    setDriveAuthorized(false);
                    alert(t('drive_not_connected') || 'Google Drive is not connected');
                  }
                }}
              >
                {t('check_drive') || 'Check Drive'}
              </Button>
              <Button
                variant="outline"
                disabled={uploading}
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
                    if (!isAuth) { alert(t('connect_drive_prompt') || 'Please connect Google Drive first.'); return; }

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
                      alert((t('export_completed') || 'Export completed') + `\n${data.sheet.webViewLink}`);
                      window.open(data.sheet.webViewLink, '_blank');
                    } else {
                      alert(t('export_completed') || 'Export completed');
                    }
                  } catch (e) {
                    alert((t('export_failed') || 'Export failed') + `: ${e?.message || e}`);
                  }
                }}
              >
                {t('export_sheet') || 'Export Sheet'}
              </Button>
              {(me?.role !== 'admin' || me?.acting_as_store_email || me?.acting_as_user_email) && (
                <Button variant="outline" disabled={uploading} onClick={() => setShowConnect(true)}>
                  {t('connect_drive') || 'Connect Drive'}
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className={`border p-2 text-xs font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{t('supplier') || 'Supplier'}</th>
                  <th className="border p-2 text-xs font-semibold">{t('invoice_number') || 'Invoice #'}</th>
                  <th className="border p-2 text-xs font-semibold">{t('invoice_date') || 'Date'}</th>
                  <th className="border p-2 text-xs font-semibold">{t('invoice_total') || 'Total'}</th>
                </tr>
              </thead>
              <tbody>
                {grouped.length === 0 && (
                  <tr>
                    <td className="border p-4 text-center text-gray-500" colSpan={4}>
                      {t('no_receipts_to_display') || 'No receipts to display'}
                    </td>
                  </tr>
                )}

                {grouped.map(group => (
                  <React.Fragment key={group.supplier_id}>
                    <tr className="bg-emerald-50">
                      <td className="border p-2 font-semibold">{group.supplier_name}</td>
                      <td className="border p-2 text-sm text-gray-600" colSpan={2}>{t('total') || 'Total'}</td>
                      <td className="border p-2 font-bold text-emerald-700">₪{group.total.toFixed(2)}</td>
                    </tr>
                    {group.receipts.map(r => (
                      <tr
                        key={r.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onDoubleClick={() => setSelected(r)}
                        title={t('double_click_to_view') || 'Double click to view'}
                      >
                        <td className="border p-2 text-sm">{group.supplier_name}</td>
                        <td className="border p-2 text-sm font-medium">{r.invoice_number || '-'}</td>
                        <td className="border p-2 text-sm">{moment(r.invoice_date || r.received_date).format('DD/MM/YYYY')}</td>
                        <td className="border p-2 text-sm">₪{Number(r.invoice_total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

                {grouped.length > 0 && (
                  <tr className="bg-purple-50">
                    <td className="border p-2 font-bold">{t('grand_total') || 'Grand Total'}</td>
                    <td className="border p-2" colSpan={2}></td>
                    <td className="border p-2 font-bold text-purple-700">₪{grandTotal.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {uploadResult?.parentFolder?.webViewLink && (
              <div className="mt-3 text-sm text-gray-700">
                <a href={uploadResult.parentFolder.webViewLink} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                  {t('open_drive_folder') || 'Open Drive folder'}
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
            <Button variant="outline" onClick={() => setShowConnect(false)}>{t('cancel') || 'Cancel'}</Button>
            <Button onClick={async () => { try { const email = (connectEmail || '').trim(); if (!email) { alert(t('enter_google_email') || 'Enter the Google email'); return; } const adminControlling = !!(me?.role === 'admin' && (me?.acting_as_store_email || me?.acting_as_user_email)); if (adminControlling) { let tu = targetUser; if (!tu) { const users = await base44.entities.User.filter({ email: targetEmail }); tu = Array.isArray(users) && users.length ? users[0] : null; setTargetUser(tu); } if (!tu?.id) { alert('User not found'); return; } await base44.entities.User.update(tu.id, { drive_share_email: email }); setTargetUser({ ...tu, drive_share_email: email }); } else { await base44.auth.updateMe({ drive_share_email: email }); const u2 = await base44.auth.me(); setMe(u2); } alert(t('saved') || 'Saved'); setShowConnect(false); } catch (e) { alert((t('error_saving') || 'Error') + ': ' + (e?.message || e)); } }} className="bg-green-600 hover:bg-green-700">{t('save') || 'Save'}</Button>
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
            <div>{(t('drive_upload_account') && t('drive_upload_account') !== 'drive_upload_account') ? t('drive_upload_account') : "Files will be uploaded using the app owner’s Google Drive account:"}</div>
            <div className="font-medium">{driveAccount?.emailAddress || driveAccount?.displayName || ((t('google_drive') && t('google_drive') !== 'google_drive') ? t('google_drive') : 'Google Drive')}</div>
            <div className="text-gray-500">
              { (t('drive_target_folder') && t('drive_target_folder') !== 'drive_target_folder') ? t('drive_target_folder') : 'Target folder:' } {targetPath || 'SmartPlateUploads/<your email>/Invoices-<month>'}
            </div>
            <div className="text-gray-500">
              {(t('drive_shared_with') && t('drive_shared_with') !== 'drive_shared_with') ? t('drive_shared_with') : 'Files will be shared with:'} {targetUser?.drive_share_email || targetEmail}
            </div>
            <div className="text-gray-500">
              { (t('drive_app_connector_note') && t('drive_app_connector_note') !== 'drive_app_connector_note') ? t('drive_app_connector_note') : 'Note: For security, files upload to the app owner’s Drive and are organized under your personal folder.'}
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDriveConfirm(false)}>{t('cancel') || 'Cancel'}</Button>
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
                  const { data } = await base44.functions.invoke('uploadMonthlyInvoicesToDrive', payload);
                  setUploadResult(data);
                  setShowDriveConfirm(false);
                  alert((t('upload_completed') || 'Upload completed') + (data?.parentFolder?.webViewLink ? `\n${data.parentFolder.webViewLink}` : ''));
                } catch (e) {
                  alert((t('upload_failed') || 'Upload failed') + `: ${e?.message || e}`);
                } finally {
                  setUploading(false);
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              {t('upload') || 'Upload'}
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