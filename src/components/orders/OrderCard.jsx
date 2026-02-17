import React from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, Package, Edit, MessageCircle, MapPin, FileCheck, Truck } from "lucide-react";
import { useLanguage } from "../LanguageProvider";

export default function OrderCard({ order, onEdit, onResend, onCreateReceipt, onReceiveSupply }) {
  const { t } = useLanguage();
  
  const statusLabels = {
    sent: { label: t('status_sent'), color: "bg-blue-50 text-blue-700 border-blue-200" },
    confirmed: { label: t('status_confirmed'), color: "bg-green-50 text-green-700 border-green-200" },
    delivered: { label: t('status_delivered'), color: "bg-purple-50 text-purple-700 border-purple-200" },
    draft: { label: t('status_draft'), color: "bg-yellow-50 text-yellow-700 border-yellow-200" }
  };

  const statusInfo = statusLabels[order.status] || { 
    label: order.status || t('status_unknown'), 
    color: "bg-gray-100 text-gray-800 border-gray-200" 
  };

  // Can create receipt for any order that's not a draft
  const canCreateReceipt = order.status !== 'draft';

  return (
    <Card className="hover:shadow-md md:hover:shadow-lg transition-shadow duration-300 rounded-xl">
      <CardHeader className="p-3 pb-2 md:pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-base md:text-lg text-gray-900">
                {t('order_number')} {order.order_number || '—'}
              </h3>
              <Badge variant="secondary" className={`${statusInfo.color} border text-[11px] px-2 py-0.5 md:text-xs`}>
                {statusInfo.label}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4" />
                <span>{t('supplier')}: {order.supplier_name}</span>
              </div>
              {order.restaurant_name && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="w-4 h-4" />
                  <span>{t('business')}: {order.restaurant_name}</span>
                </div>
              )}
              {order.restaurant_address && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{order.restaurant_address}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onEdit(order)}
              className="text-gray-500 hover:text-purple-600"
              title={t('edit')}
            >
              <Edit className="w-4 h-4" />
            </Button>
            {order.supplier_phone && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onResend(order)}
                className="text-[#25D366] hover:text-[#20BA5A] hover:bg-green-50"
                title={t('send_whatsapp')}
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3 md:p-6 pt-0">
        {order.delivery_date && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span>{t('delivery_date')}: {new Date(order.delivery_date).toLocaleDateString('he-IL')}</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Package className="w-4 h-4 text-orange-500" />
            {t('items')} ({order.items?.length || 0}):
          </div>
          <div className="bg-gray-50 rounded-lg p-2 md:p-3 space-y-1 max-h-28 md:max-h-32 overflow-y-auto">
            {order.items?.map((item, index) => (
              <div key={index} className="text-sm text-gray-700">
                <div className="flex justify-between">
                  <span className="font-medium">{item.item_name}</span>
                  <span>{item.quantity} {item.unit} × {item.price?.toFixed(2) || '0.00'} = {item.total?.toFixed(2) || '0.00'}</span>
                </div>
                {item.units_per_package > 1 && (
                  <div className="text-xs text-amber-700 ml-2">
                    = {(item.quantity * item.units_per_package).toLocaleString()} {t('unit_piece')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {order.total_cost > 0 && (
          <div className="bg-blue-50 rounded-lg p-2 md:p-3 border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-medium text-blue-800">{t('total_cost')}:</span>
              <span className="text-base md:text-lg font-bold text-blue-700">{order.total_cost?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        )}

        {order.notes && (
          <div className="p-2 md:p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">{order.notes}</p>
          </div>
        )}

        <div className="pt-2 md:pt-3 flex justify-between items-center flex-wrap gap-1.5 text-xs md:text-sm">
          <Badge variant="outline" className="text-xs">
            {t('created_at')}: {new Date(order.created_date).toLocaleDateString('he-IL')}
          </Badge>
          
          {order.supplier_phone && (
            <Button
              variant="default"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onResend(order); }}
              className="bg-[#25D366] hover:bg-[#128C7E] text-white h-8 px-3 rounded-md flex items-center gap-1"
              title={t('send_whatsapp')}
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              {t('send_via_whatsapp')}
            </Button>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-3 pt-2 md:pt-3 flex justify-end items-center gap-2 border-t mt-2">
        {onReceiveSupply && (
            <Button
                variant="outline"
                size="sm"
                onClick={() => onReceiveSupply(order)}
                className="text-blue-700 hover:bg-blue-50"
            >
                <Truck className="w-3 h-3 mr-1" />
                {t('receive')}
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}