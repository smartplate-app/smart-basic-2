import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function RowTimeDialog({ open, onClose, initial, onApply, isRTL, language }) {
  const [cfg, setCfg] = useState(initial || { start: "", end: "", mode: "all", dayFrom: "sunday", dayTo: "saturday" });

  useEffect(() => { setCfg(initial || { start: "", end: "", mode: "all", dayFrom: "sunday", dayTo: "saturday" }); }, [initial]);

  const t = (he, en) => (language === 'he' ? he : en);

  // Localized day names
  const daysLocalized = [
    { key: 'sunday', he: 'ראשון', ar: 'الأحد', en: 'Sunday' },
    { key: 'monday', he: 'שני', ar: 'الاثنين', en: 'Monday' },
    { key: 'tuesday', he: 'שלישי', ar: 'الثلاثاء', en: 'Tuesday' },
    { key: 'wednesday', he: 'רביעי', ar: 'الأربعاء', en: 'Wednesday' },
    { key: 'thursday', he: 'חמישי', ar: 'الخميس', en: 'Thursday' },
    { key: 'friday', he: 'שישי', ar: 'الجمعة', en: 'Friday' },
    { key: 'saturday', he: 'שבת', ar: 'السبت', en: 'Saturday' }
  ];
  const dayName = (key) => {
    const m = daysLocalized.find((d) => d.key === key);
    if (!m) return key;
    return language === 'he' ? m.he : (language === 'ar' ? m.ar : m.en);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{t('הגדרת שעות לשורת תפקיד', 'Set row hours')}</DialogTitle>
        </DialogHeader>
        <div 
          className="space-y-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onApply(cfg);
            }
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={isRTL ? 'text-right block' : 'text-left block'}>{t('כניסה', 'Start')}</Label>
              <Input type="time" value={cfg.start} onChange={(e) => setCfg({ ...cfg, start: e.target.value })} className={isRTL ? 'text-right' : 'text-left'} />
            </div>
            <div>
              <Label className={isRTL ? 'text-right block' : 'text-left block'}>{t('יציאה', 'End')}</Label>
              <Input type="time" value={cfg.end} onChange={(e) => setCfg({ ...cfg, end: e.target.value })} className={isRTL ? 'text-right' : 'text-left'} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className={isRTL ? 'text-right block' : 'text-left block'}>{t('החלה על', 'Apply to')}</Label>
              <Select value={cfg.mode} onValueChange={(v) => setCfg({ ...cfg, mode: v })}>
                <SelectTrigger className={isRTL ? 'text-right' : 'text-left'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('כל השבוע', 'All week')}</SelectItem>
                  <SelectItem value="range">{t('טווח ימים', 'Day range')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {cfg.mode === 'range' && (
              <>
                <div>
                  <Label className={isRTL ? 'text-right block' : 'text-left block'}>{t('מ-', 'From')}</Label>
                  <Select value={cfg.dayFrom} onValueChange={(v) => setCfg({ ...cfg, dayFrom: v })}>
                    <SelectTrigger className={isRTL ? 'text-right' : 'text-left'}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {daysLocalized.map(d => (
                        <SelectItem key={d.key} value={d.key}>{dayName(d.key)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={isRTL ? 'text-right block' : 'text-left block'}>{t('עד', 'To')}</Label>
                  <Select value={cfg.dayTo} onValueChange={(v) => setCfg({ ...cfg, dayTo: v })}>
                    <SelectTrigger className={isRTL ? 'text-right' : 'text-left'}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {daysLocalized.map(d => (
                        <SelectItem key={d.key} value={d.key}>{dayName(d.key)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </div>
        <DialogFooter className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2 justify-end mt-4`}>
          <Button variant="outline" onClick={onClose}>{t('ביטול', 'Cancel')}</Button>
          <Button onClick={() => onApply(cfg)} className="bg-blue-600 hover:bg-blue-700">{t('עדכן', 'Apply')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}