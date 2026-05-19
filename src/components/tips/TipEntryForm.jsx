import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader, Plus, Save, X, DollarSign } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import moment from "moment";

export default function TipEntryForm({ selectedDate, onSave }) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [shiftType, setShiftType] = useState("evening");
  const [cashTips, setCashTips] = useState(0);
  const [creditTips, setCreditTips] = useState(0);
  const [totalTips, setTotalTips] = useState(0);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const allWorkers = await base44.entities.Worker.filter({ is_active: true });
      setWorkers(allWorkers);
    } catch (error) {
      console.error("Error loading workers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorker = () => {
    setSelectedWorkers([...selectedWorkers, { 
      worker_id: "", 
      worker_name: "", 
      tip_percentage: 0,
      tip_amount: 0,
      cash_tips: 0,
      credit_tips: 0
    }]);
  };

  const handleRemoveWorker = (index) => {
    const updated = selectedWorkers.filter((_, i) => i !== index);
    setSelectedWorkers(updated);
    recalculateTips(cashTips, creditTips, updated);
  };

  const handleWorkerChange = (index, workerId) => {
    const worker = workers.find(w => w.id === workerId);
    const updated = [...selectedWorkers];
    updated[index] = {
      ...updated[index],
      worker_id: workerId,
      worker_name: worker?.full_name || ""
    };
    setSelectedWorkers(updated);
  };

  const handlePercentageChange = (index, percentage) => {
    const updated = [...selectedWorkers];
    updated[index].tip_percentage = parseFloat(percentage) || 0;
    setSelectedWorkers(updated);
    recalculateTips(cashTips, creditTips, updated);
  };

  const recalculateTips = (cash, credit, workersList) => {
    const cashTotal = parseFloat(cash) || 0;
    const creditTotal = parseFloat(credit) || 0;
    const total = cashTotal + creditTotal;
    
    const updated = workersList.map(w => ({
      ...w,
      cash_tips: cashTotal * (w.tip_percentage / 100),
      credit_tips: creditTotal * (w.tip_percentage / 100),
      tip_amount: total * (w.tip_percentage / 100)
    }));
    setSelectedWorkers(updated);
  };

  const handleCashTipsChange = (value) => {
    const cash = parseFloat(value) || 0;
    setCashTips(cash);
    setTotalTips(cash + creditTips);
    recalculateTips(cash, creditTips, selectedWorkers);
  };

  const handleCreditTipsChange = (value) => {
    const credit = parseFloat(value) || 0;
    setCreditTips(credit);
    setTotalTips(cashTips + credit);
    recalculateTips(cashTips, credit, selectedWorkers);
  };

  const handleSave = async () => {
    if (!selectedDate || totalTips <= 0) {
      alert(language === 'he' ? 'נא למלא את כל השדות' : 'Please fill all fields');
      return;
    }

    const totalPercentage = selectedWorkers.reduce((sum, w) => sum + (w.tip_percentage || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01 && selectedWorkers.length > 0) {
      alert(language === 'he' ? 'סך כל האחוזים חייב להיות 100%' : 'Total percentage must equal 100%');
      return;
    }

    try {
      setSaving(true);

      const targetDate = moment(selectedDate).format('YYYY-MM-DD');
      const existing = await base44.entities.TipEntry.filter({
        date: targetDate,
        shift_type: shiftType
      });

      if (existing && existing.length > 0) {
        const confirmSave = window.confirm(
          language === 'he' 
            ? 'כבר הוזנו טיפים למשמרת זו בתאריך הנבחר. האם תרצה לשמור רשומה נוספת בכל זאת?' 
            : 'Tips have already been entered for this shift on the selected date. Do you want to save another record anyway?'
        );
        if (!confirmSave) {
          setSaving(false);
          return;
        }
      }
      
      await base44.entities.TipEntry.create({
        date: targetDate,
        shift_type: shiftType,
        cash_tips: cashTips,
        credit_tips: creditTips,
        total_tips: totalTips,
        workers: selectedWorkers.filter(w => w.worker_id)
      });

      // Reset form
      setCashTips(0);
      setCreditTips(0);
      setTotalTips(0);
      setSelectedWorkers([]);
      setShiftType("evening");
      
      if (onSave) onSave();
    } catch (error) {
      console.error("Error saving tip entry:", error);
      alert(language === 'he' ? 'שגיאה בשמירה' : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const totalPercentage = selectedWorkers.reduce((sum, w) => sum + (w.tip_percentage || 0), 0);
  const totalAllocated = selectedWorkers.reduce((sum, w) => sum + (w.tip_amount || 0), 0);

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <DollarSign className="w-5 h-5" />
          {language === 'he' ? 'רישום טיפים יומי' : 'Daily Tip Entry'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className={isRTL ? 'text-right block' : ''}>{language === 'he' ? 'תאריך' : 'Date'}</Label>
            <Input 
              type="date" 
              value={moment(selectedDate).format('YYYY-MM-DD')}
              onChange={(e) => {}}
              disabled
              className={isRTL ? 'text-right' : ''}
            />
          </div>
          
          <div>
            <Label className={isRTL ? 'text-right block' : ''}>{language === 'he' ? 'משמרת' : 'Shift'}</Label>
            <Select value={shiftType} onValueChange={setShiftType}>
              <SelectTrigger className={isRTL ? 'text-right' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">{language === 'he' ? 'בוקר/צהריים' : 'Morning/Afternoon'}</SelectItem>
                <SelectItem value="evening">{language === 'he' ? 'ערב' : 'Evening'}</SelectItem>
                <SelectItem value="night">{language === 'he' ? 'לילה' : 'Night'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className={isRTL ? 'text-right block' : ''}>{language === 'he' ? 'טיפים במזומן' : 'Cash Tips'}</Label>
            <Input 
              type="number" 
              value={cashTips}
              onChange={(e) => handleCashTipsChange(e.target.value)}
              placeholder="0"
              className={`text-lg font-bold text-green-600 ${isRTL ? 'text-right' : ''}`}
            />
          </div>
          
          <div>
            <Label className={isRTL ? 'text-right block' : ''}>{language === 'he' ? 'טיפים באשראי' : 'Credit Tips'}</Label>
            <Input 
              type="number" 
              value={creditTips}
              onChange={(e) => handleCreditTipsChange(e.target.value)}
              placeholder="0"
              className={`text-lg font-bold text-blue-600 ${isRTL ? 'text-right' : ''}`}
            />
          </div>
        </div>
        
        <div className={`text-lg font-bold ${isRTL ? 'text-right' : ''}`}>
          {language === 'he' ? 'סה"כ טיפים:' : 'Total Tips:'} ₪{totalTips.toFixed(2)}
        </div>

        <div className="border-t pt-4">
          <div className={`flex justify-between items-center mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Label className="text-lg font-semibold">{language === 'he' ? 'חלוקה לעובדים' : 'Worker Distribution'}</Label>
            <Button onClick={handleAddWorker} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              {language === 'he' ? 'הוסף עובד' : 'Add Worker'}
            </Button>
          </div>

          {selectedWorkers.map((worker, index) => (
            <div key={index} className={`grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 p-3 bg-gray-50 rounded-lg ${isRTL ? 'text-right' : ''}`}>
              <Select value={worker.worker_id} onValueChange={(v) => handleWorkerChange(index, v)}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'he' ? 'בחר עובד' : 'Select Worker'} />
                </SelectTrigger>
                <SelectContent>
                  {workers.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input 
                type="number"
                placeholder={language === 'he' ? 'אחוז' : 'Percentage'}
                value={worker.tip_percentage}
                onChange={(e) => handlePercentageChange(index, e.target.value)}
                className={isRTL ? 'text-right' : ''}
              />

              <div className="flex gap-2 w-full">
                <Input 
                  type="number"
                  value={worker.cash_tips ? worker.cash_tips.toFixed(2) : 0}
                  disabled
                  title={language === 'he' ? 'מזומן' : 'Cash'}
                  className={`bg-gray-50 text-emerald-700 w-1/2 ${isRTL ? 'text-right' : ''}`}
                />
                <Input 
                  type="number"
                  value={worker.credit_tips ? worker.credit_tips.toFixed(2) : 0}
                  disabled
                  title={language === 'he' ? 'אשראי' : 'Credit'}
                  className={`bg-gray-50 text-blue-700 w-1/2 ${isRTL ? 'text-right' : ''}`}
                />
              </div>

              <Input 
                type="number"
                value={worker.tip_amount.toFixed(2)}
                disabled
                className={`bg-green-50 font-bold ${isRTL ? 'text-right' : ''}`}
              />

              <Button variant="ghost" size="icon" onClick={() => handleRemoveWorker(index)}>
                <X className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>

        {selectedWorkers.length > 0 && (
          <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${isRTL ? 'text-right' : ''}`}>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span>{language === 'he' ? 'סה"כ אחוזים:' : 'Total %:'}</span>
              <span className={`font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
                {totalPercentage.toFixed(1)}%
              </span>
            </div>
            <div className={`flex justify-between mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span>{language === 'he' ? 'סה"כ מחולק:' : 'Total Allocated:'}</span>
              <span className="font-bold">₪{totalAllocated.toFixed(2)}</span>
            </div>
          </div>
        )}

        <Button 
          onClick={handleSave} 
          disabled={saving || totalPercentage !== 100}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {language === 'he' ? 'שמור' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}