import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, Package, CheckCircle, AlertCircle, Clock, Edit, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import { useLanguage } from "../LanguageProvider";
import PdfThumbnail from "./PdfThumbnail";

export default function ReceiptCard({ receipt, onEdit }) {
  const { t } = useLanguage();
  
  const isPdf = (url) => typeof url === 'string' && /\.pdf(?:$|\?)/i.test(url);
  const isSafari = typeof navigator !== 'undefined' && /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
  const pdfViewerUrl = (url) => `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(url)}&rm=minimal`;
  
  const [sendingToDokka, setSendingToDokka] = useState(false);

  const handleSendToDokka = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!receipt.receipt_images || receipt.receipt_images.length === 0) {
        alert(t('no_file_attached') || 'No file attached to send');
        return;
    }
    setSendingToDokka(true);
    try {
        const { data } = await base44.functions.invoke('sendInvoiceToDokka', { receiptId: receipt.id });
        if (data && data.success) {
            alert('Sent to DOKKA successfully');
            // If there's an onEdit passed, we could optionally refresh it, but alerting is enough
        } else {
            alert('Error: ' + (data?.error || 'Unknown error'));
        }
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        setSendingToDokka(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="font-bold text-lg text-gray-900">
                  {receipt.supplier_name}
                </h3>
                {receipt.is_refund && (
                  <Badge className="bg-purple-50 text-purple-700 border-none">{t('refund') || 'Refund'}</Badge>
                )}
                {receipt.needs_review && (
                  <Badge className="bg-amber-50 text-amber-700 border-none">{t('needs_review') || 'Review'}</Badge>
                )}
                {receipt.awaiting_credit && (
                  <Badge className="bg-orange-50 text-orange-700 border-none">{t('awaiting_credit') || 'Awaiting credit'}</Badge>
                )}
                {receipt.refund_received && (
                  <Badge className="bg-green-50 text-green-700 border-none">{t('credit_handled') || 'Credit handled'}</Badge>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{new Date(receipt.received_date).toLocaleDateString('he-IL')}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {receipt.receipt_images && receipt.receipt_images.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendToDokka}
                  disabled={sendingToDokka}
                  className="text-blue-600 hover:bg-blue-50"
                  title="Send to Dokka"
                >
                  <Send className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                  {sendingToDokka ? '...' : 'Dokka'}
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(receipt)}
                  className="text-gray-400 hover:text-gray-900 rounded-full bg-gray-50 hover:bg-gray-100"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {receipt.verified_items && receipt.verified_items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Package className="w-4 h-4 text-green-500" />
                {t('items')} ({receipt.verified_items.length}):
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
                {receipt.verified_items.map((item, index) => (
                  <div key={index} className="text-sm">
                    <div className="flex justify-between">
                      <span className={item.has_issue ? 'text-red-600 font-medium' : 'text-gray-700'}>
                        {item.item_name}
                      </span>
                      <span>{item.received_quantity} {item.unit}</span>
                    </div>
                    {item.has_issue && item.issue_note && (
                      <div className="text-xs text-red-600 ml-2">{item.issue_note}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {receipt.invoice_total > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-800">{t('invoice_total')}:</span>
                <span className="text-lg font-bold text-blue-700">{receipt.invoice_total.toFixed(2)}</span>
              </div>
              {receipt.invoice_number && (
                <div className="text-xs text-blue-600 mt-1">
                  {t('order_number')}: {receipt.invoice_number}
                </div>
              )}
            </div>
          )}

          {receipt.notes && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">{receipt.notes}</p>
            </div>
          )}

          {receipt.receipt_images && receipt.receipt_images.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {receipt.receipt_images.map((imageUrl, index) => (
                <a 
                  key={index}
                  href={imageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-500 transition-colors"
                >
                  {isPdf(imageUrl) ? (
                    <PdfThumbnail url={imageUrl} size={80} />
                  ) : (
                    <img 
                      src={imageUrl} 
                      alt={`Receipt ${index + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  )}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}