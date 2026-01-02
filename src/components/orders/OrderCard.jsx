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
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-lg text-gray-900">
                {t('order_number')} {order.order_number || '—'}
              </h3>
              <Badge variant="secondary" className={`${statusInfo.color} border`}>
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
      <CardContent className="space-y-3">
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
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
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
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-800">{t('total_cost')}:</span>
              <span className="text-lg font-bold text-blue-700">{order.total_cost?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        )}

        {order.notes && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">{order.notes}</p>
          </div>
        )}

        <div className="pt-2 flex justify-between items-center flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            {t('created_at')}: {new Date(order.created_date).toLocaleDateString('he-IL')}
          </Badge>
          
          {order.supplier_phone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResend(order);
              }}
              className="text-white text-sm font-medium rounded-md px-4 py-2 flex items-center justify-center shadow-sm transition-colors"
              style={{
                backgroundColor: '#25D366',
                border: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#128C7E'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#25D366'}
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              {t('send_via_whatsapp')}
            </button>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex justify-end items-center gap-2 border-t mt-3">
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