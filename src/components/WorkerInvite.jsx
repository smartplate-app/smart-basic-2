
import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Loader } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { createPageUrl } from "@/utils";

export default function WorkerInvite({ onClose }) {
  const [workerName, setWorkerName] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  const [preparing, setPreparing] = useState(false);
  const { t } = useLanguage();

  const handlePrepareInvite = async () => {
    if (!workerPhone) {
      alert(t('phone_required'));
      return;
    }

    try {
      setPreparing(true);
      const user = await base44.auth.me();
      
      const baseUrl = window.location.origin;
      const workerPortalUrl = `${baseUrl}${createPageUrl('WorkerPortal')}?owner=${user.id}`;
      
      const greeting = workerName ? `${t('hello')} ${workerName},\n\n` : `${t('hello')},\n\n`;
      
      const message = `${greeting}${t('worker_invite_instructions')}\n\n` +
                     `${t('access_link')}:\n${workerPortalUrl}\n\n` +
                     `${t('worker_can_do')}:\n` +
                     `✅ ${t('create_orders')}\n` +
                     `✅ ${t('receive_supplies')}\n\n` +
                     `${t('worker_invite_footer')}`;

      let cleanPhone = workerPhone.replace(/\D/g, '');
      
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '972' + cleanPhone.substring(1);
      }
      
      if (!cleanPhone.startsWith('972')) {
        cleanPhone = '972' + cleanPhone;
      }
      
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
      setWhatsappLink(whatsappUrl);
      
    } catch (error) {
      console.error("Error preparing invite:", error);
      alert(t('error_saving'));
    } finally {
      setPreparing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('invite_worker')}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            {t('worker_name')} ({t('optional')})
          </label>
          <Input
            value={workerName}
            onChange={(e) => setWorkerName(e.target.value)}
            placeholder={t('worker_name')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {t('phone')} *
          </label>
          <Input
            value={workerPhone}
            onChange={(e) => setWorkerPhone(e.target.value)}
            placeholder="050-1234567"
            required
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          {t('worker_portal_note')}
        </div>

        {!whatsappLink ? (
          <button
            onClick={handlePrepareInvite}
            disabled={preparing || !workerPhone}
            className="w-full text-white font-medium shadow-sm rounded-md px-4 py-2 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: preparing || !workerPhone ? '#9ca3af' : '#25D366',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              if (!preparing && workerPhone) {
                e.currentTarget.style.backgroundColor = '#128C7E';
              }
            }}
            onMouseLeave={(e) => {
              if (!preparing && workerPhone) {
                e.currentTarget.style.backgroundColor = '#25D366';
              }
            }}
          >
            {preparing ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                {t('preparing')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                {t('prepare_invite')}
              </>
            )}
          </button>
        ) : (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full"
          >
            <button
              className="w-full text-white font-medium shadow-sm rounded-md px-4 py-2 flex items-center justify-center transition-colors"
              style={{
                backgroundColor: '#25D366',
                border: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#128C7E'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#25D366'}
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              {t('send_whatsapp')}
            </button>
          </a>
        )}
      </CardContent>
    </Card>
  );
}
