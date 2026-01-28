import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, Package, CheckCircle, AlertCircle, Clock, Edit } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import PdfThumbnail from "./PdfThumbnail";

export default function ReceiptCard({ receipt, onEdit }) {
  const { t } = useLanguage();
  
  const isPdf = (url) => typeof url === 'string' && /\.pdf(?:$|\?)/i.test(url);
  const isSafari = typeof navigator !== 'undefined' && /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
  const pdfViewerUrl = (url) => `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(url)}&rm=minimal`;
  
  const statusConfig = {
    verified: { 
      label: t('status_verified'), 
      color: "bg-green-50 text-green-700 border-green-200",
      icon: CheckCircle
    },
    has_issues: { 
      label: t('status_has_issues'), 
      color: "bg-red-50 text-red-700 border-red-200",
      icon: AlertCircle
    },
    pending: { 
      label: t('status_pending'), 
      color: "bg-yellow-50 text-yellow-700 border-yellow-200",
      icon: Clock
    }
  };

  const status = statusConfig[receipt.status] || statusConfig.pending;
  const StatusIcon = status.icon;

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
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-lg text-gray-900">
                  {t('receipt')} #{receipt.order_number}
                </h3>
                <Badge className={`${status.color} border flex items-center gap-1`}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </Badge>
                {receipt.is_refund && (
                  <Badge className="bg-purple-100 text-purple-800">{t('refund') || 'Refund'}</Badge>
                )}
                {receipt.needs_review && (
                  <Badge className="bg-amber-100 text-amber-800">{t('needs_review') || 'Review'}</Badge>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="w-4 h-4" />
                  <span>{t('supplier')}: {receipt.supplier_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{t('received_date')}: {new Date(receipt.received_date).toLocaleDateString('he-IL')}</span>
                </div>
              </div>
            </div>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(receipt)}
                className="text-gray-500 hover:text-green-600"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
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