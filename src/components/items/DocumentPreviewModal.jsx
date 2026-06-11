import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader, Image as ImageIcon, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../LanguageProvider";
import { Link } from "react-router-dom";

export default function DocumentPreviewModal({ docId, docType, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const { language } = useLanguage();

  useEffect(() => {
    if (!isOpen || !docId || !docType) return;
    setLoading(true);
    const fetchDoc = async () => {
      try {
        let res;
        if (docType === 'supply_receipt') {
          res = await base44.entities.SupplyReceipt.filter({ id: docId });
        } else if (docType === 'inventory_count') {
          res = await base44.entities.InventoryCount.filter({ id: docId });
        }
        setData(res?.[0] || null);
      } catch (error) {
        console.error("Error fetching doc:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [docId, docType, isOpen]);

  const images = data ? (docType === 'supply_receipt' ? data.receipt_images : data.screenshot_urls) : [];
  const linkUrl = docType === 'supply_receipt' ? `/SupplyReceipts?highlight=${docId}` : `/MonthlyCount?highlight=${docId}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex justify-between items-center text-xl">
            {language === 'he' ? 'צפייה במסמך מקור' : 'View Source Document'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-gray-50/50">
          {loading ? (
            <div className="flex justify-center p-12"><Loader className="w-8 h-8 animate-spin text-gray-500" /></div>
          ) : !data ? (
            <div className="text-center p-12 text-gray-500">{language === 'he' ? 'מסמך לא נמצא' : 'Document not found'}</div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{docType === 'supply_receipt' ? data.supplier_name : data.name || data.warehouse_name}</h3>
                  <div className="flex gap-4 mt-2">
                    <p className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                      {docType === 'supply_receipt' ? (language === 'he' ? 'מספר תעודה:' : 'Invoice No:') : (language === 'he' ? 'תאריך ספירה:' : 'Count Date:')} 
                      {' '}
                      <span className="font-semibold text-gray-900">{docType === 'supply_receipt' ? data.order_number || data.invoice_number : data.count_date}</span>
                    </p>
                  </div>
                  {data.notes && (
                    <p className="text-sm text-gray-600 mt-3 border-t pt-2">
                      {language === 'he' ? 'הערות:' : 'Notes:'} <span className="font-medium text-gray-900">{data.notes}</span>
                    </p>
                  )}
                </div>
                <Link to={linkUrl} onClick={onClose} className="shrink-0">
                  <Button variant="outline" className="gap-2 bg-white">
                    <ExternalLink className="w-4 h-4" />
                    {language === 'he' ? 'עבור למסמך המלא' : 'Open Full Document'}
                  </Button>
                </Link>
              </div>
              
              {images && images.length > 0 ? (
                <div className="grid gap-6">
                  <h4 className="font-semibold text-gray-700">{language === 'he' ? 'צילומי מסמך:' : 'Attached Images:'}</h4>
                  {images.map((img, i) => (
                    <img key={i} src={img} alt={`Document ${i+1}`} className="w-full h-auto rounded-xl border shadow-sm object-contain bg-white" />
                  ))}
                </div>
              ) : (
                <div className="text-center p-12 bg-white rounded-xl border border-dashed flex flex-col items-center">
                    <ImageIcon className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">{language === 'he' ? 'אין תמונות מצורפות למסמך זה' : 'No images attached to this document'}</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter className="p-4 border-t bg-white">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            {language === 'he' ? 'סגור' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}