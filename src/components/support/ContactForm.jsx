import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function ContactForm() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!subject || !message) {
      alert('נא למלא נושא ותיאור בעיה');
      return;
    }
    setSending(true);
    try {
      const page_url = window.location.href;
      const { data } = await base44.functions.invoke('createSupportTicket', { subject, message, priority, preferred_language: 'he', page_url });
      if (data?.success) {
        alert('הפנייה נשלחה! מספר טיקט: ' + data.ticketId);
        setSubject(''); setMessage(''); setPriority('normal');
      } else {
        throw new Error(data?.error || 'Failed to send');
      }
    } catch (e) {
      alert('שגיאה בשליחת הפנייה: ' + (e?.message || e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>פנייה ישירה לתמיכה</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="נושא" value={subject} onChange={e => setSubject(e.target.value)} />
        <Textarea placeholder="תיאור הבעיה" value={message} onChange={e => setMessage(e.target.value)} className="min-h-32" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">עדיפות:</span>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="עדיפות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">נמוכה</SelectItem>
              <SelectItem value="normal">רגילה</SelectItem>
              <SelectItem value="high">גבוהה</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={submit} disabled={sending} className="bg-gray-900 hover:bg-gray-800">
          {sending ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> שולח...</>) : 'שלח פנייה'}
        </Button>
      </CardContent>
    </Card>
  );
}