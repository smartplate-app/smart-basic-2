import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, DollarSign, TrendingUp, Users } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import moment from "moment";

export default function MonthlyTipReport({ selectedMonth, totalSales }) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  
  const [loading, setLoading] = useState(true);
  const [tipEntries, setTipEntries] = useState([]);
  const [workerTotals, setWorkerTotals] = useState({});

  useEffect(() => {
    loadTipData();
  }, [selectedMonth]);

  const loadTipData = async () => {
    try {
      setLoading(true);
      
      const monthStart = moment(selectedMonth).startOf('month').format('YYYY-MM-DD');
      const monthEnd = moment(selectedMonth).endOf('month').format('YYYY-MM-DD');
      
      const allEntries = await base44.entities.TipEntry.list();
      const monthEntries = allEntries.filter(entry => 
        entry.date >= monthStart && entry.date <= monthEnd
      );
      
      setTipEntries(monthEntries);
      
      // Calculate totals per worker
      const totals = {};
      monthEntries.forEach(entry => {
        entry.workers?.forEach(worker => {
          if (!totals[worker.worker_id]) {
            totals[worker.worker_id] = {
              name: worker.worker_name,
              total: 0,
              shifts: 0
            };
          }
          totals[worker.worker_id].total += worker.tip_amount || 0;
          totals[worker.worker_id].shifts += 1;
        });
      });
      
      setWorkerTotals(totals);
    } catch (error) {
      console.error("Error loading tip data:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalTips = tipEntries.reduce((sum, entry) => sum + (entry.total_tips || 0), 0);
  const tipPercentage = totalSales > 0 ? (totalTips / totalSales) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className={`text-white text-sm flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <DollarSign className="w-4 h-4" />
              {language === 'he' ? 'סה"כ טיפים' : 'Total Tips'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${isRTL ? 'text-right' : ''}`}>
              ₪{totalTips.toLocaleString()}
            </div>
            <div className={`text-green-100 text-xs mt-1 ${isRTL ? 'text-right' : ''}`}>
              {language === 'he' ? 'לחודש ' : 'For month '}{selectedMonth}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className={`text-white text-sm flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <TrendingUp className="w-4 h-4" />
              {language === 'he' ? 'אחוז מהמכירות' : '% of Sales'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${isRTL ? 'text-right' : ''}`}>
              {tipPercentage.toFixed(1)}%
            </div>
            <div className={`text-blue-100 text-xs mt-1 ${isRTL ? 'text-right' : ''}`}>
              {language === 'he' ? 'כולל מע"מ' : 'Including VAT'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className={`text-white text-sm flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Users className="w-4 h-4" />
              {language === 'he' ? 'עובדים פעילים' : 'Active Workers'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${isRTL ? 'text-right' : ''}`}>
              {Object.keys(workerTotals).length}
            </div>
            <div className={`text-purple-100 text-xs mt-1 ${isRTL ? 'text-right' : ''}`}>
              {language === 'he' ? 'קיבלו טיפים' : 'Received tips'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Worker Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className={isRTL ? 'text-right' : ''}>
            {language === 'he' ? 'פירוט לפי עובד' : 'Breakdown by Worker'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(workerTotals).length === 0 ? (
            <p className={`text-gray-500 text-center py-4 ${isRTL ? 'text-right' : ''}`}>
              {language === 'he' ? 'אין נתוני טיפים' : 'No tip data'}
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(workerTotals)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([workerId, data]) => (
                  <div 
                    key={workerId} 
                    className={`flex justify-between items-center p-3 bg-gray-50 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={isRTL ? 'text-right' : ''}>
                      <div className="font-semibold">{data.name}</div>
                      <div className="text-sm text-gray-500">
                        {data.shifts} {language === 'he' ? 'משמרות' : 'shifts'}
                      </div>
                    </div>
                    <div className={`text-lg font-bold text-green-600 ${isRTL ? 'text-left' : 'text-right'}`}>
                      ₪{data.total.toLocaleString()}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className={isRTL ? 'text-right' : ''}>
            {language === 'he' ? 'טיפים יומיים' : 'Daily Tips'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tipEntries.length === 0 ? (
            <p className={`text-gray-500 text-center py-4 ${isRTL ? 'text-right' : ''}`}>
              {language === 'he' ? 'אין רשומות' : 'No entries'}
            </p>
          ) : (
            <div className="space-y-2">
              {tipEntries
                .sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf())
                .map((entry) => (
                  <div 
                    key={entry.id} 
                    className={`flex justify-between items-center p-3 bg-gray-50 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={isRTL ? 'text-right' : ''}>
                      <div className="font-semibold">
                        {moment(entry.date).format('DD/MM/YYYY')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {entry.shift_type === 'morning' ? (language === 'he' ? 'בוקר' : 'Morning') : 
                         entry.shift_type === 'evening' ? (language === 'he' ? 'ערב' : 'Evening') : 
                         (language === 'he' ? 'לילה' : 'Night')}
                        {' • '}
                        {entry.workers?.length || 0} {language === 'he' ? 'עובדים' : 'workers'}
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${isRTL ? 'text-left' : 'text-right'}`}>
                      ₪{entry.total_tips.toLocaleString()}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}