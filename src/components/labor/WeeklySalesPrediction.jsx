import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Copy, TrendingUp, Loader } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { toast } from "sonner";
import moment from "moment";

export default function WeeklySalesPrediction({ weekStartDate, onCopyToSchedule }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [formData, setFormData] = useState({
    predicted_sales: 0,
    actual_sales: 0,
    notes: ""
  });

  useEffect(() => {
    loadPrediction();
  }, [weekStartDate]);

  const loadPrediction = async () => {
    try {
      setLoading(true);
      const weekNumber = moment(weekStartDate).isoWeek();
      const year = moment(weekStartDate).isoWeekYear();
      
      const user = await base44.auth.me();
      const predictions = await base44.entities.WeeklySalesPrediction.filter({
        week_number: String(weekNumber),
        year: String(year),
        created_by: user.email
      });

      if (predictions && predictions.length > 0) {
        const pred = predictions[0];
        setPrediction(pred);
        setFormData({
          predicted_sales: pred.predicted_sales || 0,
          actual_sales: pred.actual_sales || 0,
          notes: pred.notes || ""
        });
      } else {
        setPrediction(null);
        setFormData({
          predicted_sales: 0,
          actual_sales: 0,
          notes: ""
        });
      }
    } catch (error) {
      console.error("Error loading prediction:", error);
      toast.error(t('error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const weekNumber = moment(weekStartDate).isoWeek();
      const year = moment(weekStartDate).isoWeekYear();

      const data = {
        week_start_date: moment(weekStartDate).format('YYYY-MM-DD'),
        week_number: String(weekNumber),
        year: String(year),
        predicted_sales: parseFloat(formData.predicted_sales) || 0,
        actual_sales: parseFloat(formData.actual_sales) || 0,
        notes: formData.notes
      };

      if (prediction && prediction.id) {
        await base44.entities.WeeklySalesPrediction.update(prediction.id, data);
      } else {
        const newPred = await base44.entities.WeeklySalesPrediction.create(data);
        setPrediction(newPred);
      }

      toast.success(t('save') + ' ✓');
      await loadPrediction();
    } catch (error) {
      console.error("Error saving prediction:", error);
      toast.error(t('error_saving'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyToSchedule = () => {
    if (!formData.predicted_sales || formData.predicted_sales <= 0) {
      toast.error(language === 'he' ? 'אנא הזן תחזית מכירות תחילה' : 'Please enter sales prediction first');
      return;
    }

    onCopyToSchedule(formData.predicted_sales);
    toast.success(language === 'he' ? 'תחזית הועתקה ללוח המשמרות!' : 'Prediction copied to schedule!');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader className="w-6 h-6 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    );
  }

  const salesExcludingVAT = formData.predicted_sales / 1.18;
  const variance = formData.actual_sales > 0 ? ((formData.actual_sales - formData.predicted_sales) / formData.predicted_sales * 100) : 0;

  return (
    <Card className="border-2 border-purple-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
          <TrendingUp className="w-5 h-5 text-purple-600" />
          {language === 'he' ? 'תחזית מכירות שבועית' : 'Weekly Sales Prediction'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="predicted_sales" className={isRTL ? 'text-right block' : 'text-left block'}>
              {language === 'he' ? 'תחזית מכירות (כולל מע"מ)' : 'Predicted Sales (incl. VAT)'} *
            </Label>
            <Input
              id="predicted_sales"
              type="number"
              inputMode="decimal"
              value={formData.predicted_sales}
              onChange={(e) => setFormData({ ...formData, predicted_sales: e.target.value })}
              placeholder="0"
              className={isRTL ? 'text-right' : 'text-left'}
              dir={isRTL ? 'rtl' : 'ltr'}
              min="0"
              step="100"
            />
            {formData.predicted_sales > 0 && (
              <p className={`text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'ללא מע"מ:' : 'Excl. VAT:'} {salesExcludingVAT.toFixed(0)} ₪
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="actual_sales" className={isRTL ? 'text-right block' : 'text-left block'}>
              {language === 'he' ? 'מכירות בפועל (כולל מע"מ)' : 'Actual Sales (incl. VAT)'}
            </Label>
            <Input
              id="actual_sales"
              type="number"
              inputMode="decimal"
              value={formData.actual_sales}
              onChange={(e) => setFormData({ ...formData, actual_sales: e.target.value })}
              placeholder="0"
              className={isRTL ? 'text-right' : 'text-left'}
              dir={isRTL ? 'rtl' : 'ltr'}
              min="0"
              step="100"
            />
            {variance !== 0 && formData.actual_sales > 0 && (
              <p className={`text-xs font-semibold ${variance > 0 ? 'text-green-600' : 'text-red-600'} ${isRTL ? 'text-right' : 'text-left'}`}>
                {variance > 0 ? '↑' : '↓'} {Math.abs(variance).toFixed(1)}%
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className={isRTL ? 'text-right block' : 'text-left block'}>
            {language === 'he' ? 'הערות' : 'Notes'}
          </Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder={language === 'he' ? 'הערות לגבי השבוע...' : 'Notes about this week...'}
            className={`h-20 ${isRTL ? 'text-right' : 'text-left'}`}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>

        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('save')}
          </Button>
          <Button
            onClick={handleCopyToSchedule}
            disabled={!formData.predicted_sales || formData.predicted_sales <= 0}
            variant="outline"
            className={`flex-1 border-2 border-blue-500 text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Copy className="w-4 h-4" />
            {language === 'he' ? 'העתק ללוח משמרות' : 'Copy to Schedule'}
          </Button>
        </div>

        {formData.predicted_sales > 0 && (
          <div className={`bg-blue-50 p-3 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-sm text-gray-600">
              {language === 'he' 
                ? 'לחץ על "העתק ללוח משמרות" כדי להעביר את התחזית ללוח המשמרות השבועי' 
                : 'Click "Copy to Schedule" to transfer this prediction to the weekly schedule'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}