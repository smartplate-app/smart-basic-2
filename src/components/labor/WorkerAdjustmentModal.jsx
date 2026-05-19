import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../LanguageProvider";
import moment from "moment";
import { toast } from "@/components/ui/use-toast";

export default function WorkerAdjustmentModal({ isOpen, onClose, workers, onSaved }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    worker_id: "",
    type: "bonus",
    amount: "",
    date: moment().format('YYYY-MM-DD'),
    notes: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.worker_id || !formData.amount || !formData.date) {
      toast({
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'אנא מלא את כל שדות החובה' : 'Please fill all required fields',
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const worker = workers.find(w => w.id === formData.worker_id);
      await base44.entities.WorkerAdjustment.create({
        ...formData,
        worker_name: worker.full_name,
        amount: parseFloat(formData.amount)
      });
      toast({
        title: language === 'he' ? 'נשמר בהצלחה' : 'Saved successfully',
        description: language === 'he' ? 'ההתאמה נשמרה' : 'Adjustment saved'
      });
      onSaved();
      onClose();
    } catch (err) {
      toast({
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{language === 'he' ? 'הוספת בונוס / מקדמה' : 'Add Bonus / Advance'}</DialogTitle>
          <DialogDescription>
            {language === 'he' ? 'הזן תשלומים נוספים שישוקללו בחישוב השכר' : 'Enter additional payments to be calculated in payroll'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{language === 'he' ? 'עובד' : 'Worker'}</Label>
            <Select value={formData.worker_id} onValueChange={val => setFormData(p => ({ ...p, worker_id: val }))}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'he' ? 'בחר עובד...' : 'Select worker...'} />
              </SelectTrigger>
              <SelectContent>
                {workers.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'he' ? 'סוג' : 'Type'}</Label>
              <Select value={formData.type} onValueChange={val => setFormData(p => ({ ...p, type: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bonus">{language === 'he' ? 'בונוס' : 'Bonus'}</SelectItem>
                  <SelectItem value="advance">{language === 'he' ? 'מקדמה' : 'Advance'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>{language === 'he' ? 'תאריך ערך' : 'Value Date'}</Label>
              <Input 
                type="date" 
                value={formData.date} 
                onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                required 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{language === 'he' ? 'סכום' : 'Amount'}</Label>
            <Input 
              type="number" 
              min="0"
              step="0.01"
              value={formData.amount} 
              onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
              required 
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'he' ? 'הערות (אופציונלי)' : 'Notes (Optional)'}</Label>
            <Input 
              value={formData.notes} 
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}