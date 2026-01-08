import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RuleForm({ initial, onSave, onCancel, isRTL, language }) {
  const [form, setForm] = useState(initial || { name: '', rule_type: 'labor_cost_over_goal', is_active: true, frequency: 'daily', channels: ['in_app'] , criteria: {} });
  useEffect(() => setForm(initial || { name: '', rule_type: 'labor_cost_over_goal', is_active: true, frequency: 'daily', channels: ['in_app'], criteria: {} }), [initial]);

  const t = (he, en) => (language === 'he' ? he : en);

  const CriteriaFields = () => {
    if (form.rule_type === 'labor_cost_over_goal') {
      return (
        <div className="space-y-2">
          <Label className={isRTL ? 'text-right block' : 'text-left block'}>{t('סף אחוז עלות עבודה', 'Labor % threshold')}</Label>
          <Input type="number" value={form.criteria?.threshold_percent || ''} onChange={(e) => setForm({ ...form, criteria: { ...form.criteria, threshold_percent: Number(e.target.value) } })} placeholder="60" />
        </div>
      );
    }
    if (form.rule_type === 'pending_orders') {
      return (
        <div className="space-y-2">
          <Label className={isRTL ? 'text-right block' : 'text-left block'}>{t('שעות ממתינות לכל היותר', 'Max pending hours')}</Label>
          <Input type="number" value={form.criteria?.max_hours_pending || ''} onChange={(e) => setForm({ ...form, criteria: { ...form.criteria, max_hours_pending: Number(e.target.value) } })} placeholder="24" />
        </div>
      );
    }
    if (form.rule_type === 'supplier_low_orders') {
      return (
        <div className="space-y-2">
          <Label className={isRTL ? 'text-right block' : 'text-left block'}>{t('ימים ללא הזמנה', 'Days without order')}</Label>
          <Input type="number" value={form.criteria?.days_without_order || ''} onChange={(e) => setForm({ ...form, criteria: { ...form.criteria, days_without_order: Number(e.target.value) } })} placeholder="14" />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className={isRTL ? 'text-right block' : 'text-left block'}>{t('שם כלל', 'Rule name')}</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label className={isRTL ? 'text-right block' : 'text-left block'}>{t('סוג כלל', 'Rule type')}</Label>
          <Select value={form.rule_type} onValueChange={(v) => setForm({ ...form, rule_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="labor_cost_over_goal">{t('חריגה מעלות עבודה', 'Labor cost over goal')}</SelectItem>
              <SelectItem value="pending_orders">{t('הזמנות ממתינות', 'Pending orders')}</SelectItem>
              <SelectItem value="supplier_low_orders">{t('ספק ללא הזמנות', 'Supplier low orders')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={isRTL ? 'text-right block' : 'text-left block'}>{t('תדירות', 'Frequency')}</Label>
          <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">{t('מיידי', 'Immediate')}</SelectItem>
              <SelectItem value="daily">{t('יומי', 'Daily')}</SelectItem>
              <SelectItem value="weekly">{t('שבועי', 'Weekly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={isRTL ? 'text-right block' : 'text-left block'}>{t('ערוץ', 'Channel')}</Label>
          <Select value={(form.channels?.[0]) || 'in_app'} onValueChange={(v) => setForm({ ...form, channels: [v] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in_app">{t('בתוך האפליקציה', 'In-app')}</SelectItem>
              <SelectItem value="email">{t('מייל', 'Email')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <CriteriaFields />

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>{t('ביטול', 'Cancel')}</Button>
        <Button onClick={() => onSave(form)}>{t('שמור', 'Save')}</Button>
      </div>
    </div>
  );
}