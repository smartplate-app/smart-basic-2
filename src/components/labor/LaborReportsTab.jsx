import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../LanguageProvider";
import moment from "moment";
import { FileText, Users, Clock, Calculator } from "lucide-react";

export default function LaborReportsTab({ schedules, workers, positions }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  
  const [reportType, setReportType] = useState("summary"); // summary | detailed
  const [periodType, setPeriodType] = useState("current_month"); // current_week | current_month | last_month | custom
  const [startDate, setStartDate] = useState(moment().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().endOf('month').format('YYYY-MM-DD'));
  const [tipEntries, setTipEntries] = useState([]);
  const [loadingTips, setLoadingTips] = useState(false);

  // Fetch tip entries for the selected date range
  useEffect(() => {
    const fetchTips = async () => {
      setLoadingTips(true);
      try {
        const user = await base44.auth.me();
        let workingEmail = user.acting_as_store_email || user.acting_as_user_email || user.email;
        let ownerEmail = user.store_user_owner_email || null;
        if (!ownerEmail) {
          try {
            const storeUserRecords = await base44.entities.StoreUser.filter({ user_email: workingEmail, is_active: true });
            if (storeUserRecords.length > 0) ownerEmail = storeUserRecords[0].owner_email || null;
          } catch (_) {}
        }
        if (ownerEmail) workingEmail = ownerEmail;

        const entries = await base44.entities.TipEntry.filter({ created_by: workingEmail });
        // Filter by date range manually since backend filter might not support complex date queries
        const filtered = (entries || []).filter(entry => {
          const entryDate = moment(entry.date);
          return entryDate.isSameOrAfter(moment(startDate).startOf('day')) && 
                 entryDate.isSameOrBefore(moment(endDate).endOf('day'));
        });
        setTipEntries(filtered);
      } catch (err) {
        console.error("Failed to load tip entries:", err);
      } finally {
        setLoadingTips(false);
      }
    };
    fetchTips();
  }, [startDate, endDate]);

  // Handle preset period changes
  const handlePeriodChange = (val) => {
    setPeriodType(val);
    if (val === 'current_week') {
      setStartDate(moment().startOf('week').format('YYYY-MM-DD'));
      setEndDate(moment().endOf('week').format('YYYY-MM-DD'));
    } else if (val === 'current_month') {
      setStartDate(moment().startOf('month').format('YYYY-MM-DD'));
      setEndDate(moment().endOf('month').format('YYYY-MM-DD'));
    } else if (val === 'last_month') {
      setStartDate(moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'));
      setEndDate(moment().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'));
    }
  };

  // Filter shifts based on the selected date range
  const filteredShifts = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];
    
    const start = moment(startDate).startOf('day');
    const end = moment(endDate).endOf('day');
    
    let allShifts = [];
    schedules.forEach(schedule => {
      // Check if schedule overlaps with our date range at all to optimize
      const schedStart = moment(schedule.week_start_date);
      const schedEnd = moment(schedule.week_start_date).add(6, 'days').endOf('day');
      
      if (schedStart.isSameOrBefore(end) && schedEnd.isSameOrAfter(start)) {
        const shifts = schedule.shifts || [];
        shifts.forEach(shift => {
          const shiftDate = moment(shift.date);
          if (shiftDate.isSameOrAfter(start) && shiftDate.isSameOrBefore(end)) {
            allShifts.push({
              ...shift,
              schedule_id: schedule.id,
              week_start_date: schedule.week_start_date
            });
          }
        });
      }
    });
    
    // Sort by date then start time
    return allShifts.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.start_time || '').localeCompare(b.start_time || '');
    });
  }, [schedules, startDate, endDate]);

  // Aggregate data for summary report
  const summaryData = useMemo(() => {
    const workerMap = new Map();
    
    // Initialize with all workers (even those without shifts if requested, but for now just those with shifts)
    filteredShifts.forEach(shift => {
      if (!workerMap.has(shift.worker_id)) {
        const worker = workers.find(w => w.id === shift.worker_id);
        workerMap.set(shift.worker_id, {
          worker_id: shift.worker_id,
          worker_name: shift.worker_name || worker?.full_name || 'לא ידוע',
          total_hours: 0,
          total_shifts: 0,
          base_payment: 0,
          payment_for_shift: 0, // This is basically base + overtime
          employer_cost: 0,
          total_cost: 0,
          total_tips: 0,
          positions: new Set()
        });
      }
      
      const record = workerMap.get(shift.worker_id);
      const worker = workers.find(w => w.id === shift.worker_id);
      const employerCostPercent = worker?.employer_cost_percentage || 25;
      
      record.total_hours += (shift.hours_worked || 0);
      record.total_shifts += 1;
      record.base_payment += (shift.base_payment || 0);
      
      const shiftPayment = shift.payment_for_shift || 0;
      record.payment_for_shift += shiftPayment;
      
      const employerCost = shiftPayment * (employerCostPercent / 100);
      record.employer_cost += employerCost;
      record.total_cost += (shiftPayment + employerCost);
      
      if (shift.job_position) record.positions.add(shift.job_position);
    });

    // Add tips data from TipEntries
    tipEntries.forEach(entry => {
      if (!entry.workers) return;
      entry.workers.forEach(w => {
        if (!workerMap.has(w.worker_id)) {
          // If worker received tips but has no shifts in this schedule range, add them
          const worker = workers.find(wk => w.worker_id === wk.id);
          workerMap.set(w.worker_id, {
            worker_id: w.worker_id,
            worker_name: w.worker_name || worker?.full_name || 'לא ידוע',
            total_hours: 0,
            total_shifts: 0,
            base_payment: 0,
            payment_for_shift: 0,
            employer_cost: 0,
            total_cost: 0,
            total_tips: 0,
            positions: new Set()
          });
        }
        
        const record = workerMap.get(w.worker_id);
        record.total_tips += (w.tip_amount || 0);
      });
    });
    
    return Array.from(workerMap.values()).map(r => ({
      ...r,
      positions_list: Array.from(r.positions).join(', ')
    })).sort((a, b) => b.total_cost - a.total_cost); // Sort by highest cost first
  }, [filteredShifts, tipEntries, workers]);

  // Calculate grand totals
  const grandTotals = useMemo(() => {
    return summaryData.reduce((acc, curr) => {
      acc.hours += curr.total_hours;
      acc.shifts += curr.total_shifts;
      acc.payment += curr.payment_for_shift;
      acc.cost += curr.total_cost;
      acc.tips += curr.total_tips;
      return acc;
    }, { hours: 0, shifts: 0, payment: 0, cost: 0, tips: 0 });
  }, [summaryData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(language === 'he' ? 'he-IL' : 'en-US', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className={`text-xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <FileText className="w-5 h-5 text-purple-600 shrink-0" />
            {language === 'he' ? 'דוחות שכר ונוכחות' : 'Labor & Attendance Reports'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="bg-gray-50 p-4 rounded-lg border flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/4">
              <label className={`block text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'סוג דוח' : 'Report Type'}
              </label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className={isRTL ? 'text-right flex-row-reverse' : 'text-left'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
                  <SelectItem value="summary">{language === 'he' ? 'סיכום לפי עובד' : 'Summary by Worker'}</SelectItem>
                  <SelectItem value="detailed">{language === 'he' ? 'פירוט משמרות מלא' : 'Detailed Shifts'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-1/4">
              <label className={`block text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'תקופה' : 'Period'}
              </label>
              <Select value={periodType} onValueChange={handlePeriodChange}>
                <SelectTrigger className={isRTL ? 'text-right flex-row-reverse' : 'text-left'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
                  <SelectItem value="current_week">{language === 'he' ? 'שבוע נוכחי' : 'Current Week'}</SelectItem>
                  <SelectItem value="current_month">{language === 'he' ? 'חודש נוכחי' : 'Current Month'}</SelectItem>
                  <SelectItem value="last_month">{language === 'he' ? 'חודש שעבר' : 'Last Month'}</SelectItem>
                  <SelectItem value="custom">{language === 'he' ? 'טווח מותאם אישית' : 'Custom Range'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-1/4">
              <label className={`block text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'מתאריך' : 'Start Date'}
              </label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => { setStartDate(e.target.value); setPeriodType('custom'); }} 
                className={isRTL ? 'text-right' : 'text-left'}
                dir="ltr"
              />
            </div>
            <div className="w-full md:w-1/4">
              <label className={`block text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'עד תאריך' : 'End Date'}
              </label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => { setEndDate(e.target.value); setPeriodType('custom'); }} 
                className={isRTL ? 'text-right' : 'text-left'}
                dir="ltr"
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <div className={`text-sm text-purple-800 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'סה״כ עובדים' : 'Total Workers'}
              </div>
              <div className={`text-2xl font-bold text-purple-900 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {summaryData.length}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className={`text-sm text-blue-800 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'סה״כ שעות' : 'Total Hours'}
              </div>
              <div className={`text-2xl font-bold text-blue-900 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {grandTotals.hours.toFixed(1)}
              </div>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
              <div className={`text-sm text-emerald-800 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'סה״כ טיפים' : 'Total Tips'}
              </div>
              <div className={`text-2xl font-bold text-emerald-900 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {formatCurrency(grandTotals.tips)}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <div className={`text-sm text-green-800 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'שכר (ללא טיפים)' : 'Wages (excl. tips)'}
              </div>
              <div className={`text-2xl font-bold text-green-900 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {formatCurrency(grandTotals.payment)}
              </div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
              <div className={`text-sm text-amber-800 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'עלות כוללת למעסיק' : 'Total Employer Cost'}
              </div>
              <div className={`text-2xl font-bold text-amber-900 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {formatCurrency(grandTotals.cost)}
              </div>
            </div>
          </div>

          {/* Report Data */}
          <div className="overflow-x-auto border rounded-lg">
            {filteredShifts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {language === 'he' ? 'לא נמצאו משמרות לתקופה הנבחרת' : 'No shifts found for the selected period'}
              </div>
            ) : (
              <table className="w-full text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
                {reportType === "summary" ? (
                  <>
                    <thead className="bg-gray-100">
                      <tr>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'עובד' : 'Worker'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'תפקידים' : 'Positions'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'משמרות' : 'Shifts'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'שעות' : 'Hours'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'טיפים' : 'Tips'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'שכר ברוטו' : 'Gross Pay'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'} bg-amber-50/50`}>{language === 'he' ? 'עלות למעסיק' : 'Employer Cost'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.map((row, idx) => (
                        <tr key={row.worker_id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <td className="p-3 font-medium">{row.worker_name}</td>
                          <td className="p-3 text-gray-600 truncate max-w-[200px]" title={row.positions_list}>{row.positions_list}</td>
                          <td className="p-3 text-gray-600">{row.total_shifts}</td>
                          <td className="p-3 font-medium">{row.total_hours.toFixed(2)}</td>
                          <td className="p-3 text-emerald-600 font-medium">{formatCurrency(row.total_tips)}</td>
                          <td className="p-3 text-green-700 font-medium">{formatCurrency(row.payment_for_shift)}</td>
                          <td className="p-3 text-amber-700 font-bold bg-amber-50/30">{formatCurrency(row.total_cost)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                        <td className="p-3" colSpan={2}>{language === 'he' ? 'סה״כ' : 'Total'}</td>
                        <td className="p-3">{grandTotals.shifts}</td>
                        <td className="p-3">{grandTotals.hours.toFixed(2)}</td>
                        <td className="p-3 text-emerald-600">{formatCurrency(grandTotals.tips)}</td>
                        <td className="p-3 text-green-700">{formatCurrency(grandTotals.payment)}</td>
                        <td className="p-3 text-amber-700">{formatCurrency(grandTotals.cost)}</td>
                      </tr>
                    </tbody>
                  </>
                ) : (
                  <>
                    <thead className="bg-gray-100">
                      <tr>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'תאריך' : 'Date'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'עובד' : 'Worker'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'תפקיד' : 'Position'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'שעות' : 'Hours'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'תעריף' : 'Rate'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'סה״כ שכר' : 'Total Pay'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShifts.map((shift, idx) => {
                        const dayName = moment(shift.date).locale(language === 'he' ? 'he' : 'en').format('dddd');
                        return (
                          <tr key={`${shift.id || idx}-${shift.date}`} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                            <td className="p-3 text-gray-600">
                              <span className="font-medium text-gray-900">{moment(shift.date).format('DD/MM/YYYY')}</span>
                              <span className="text-xs ml-2 rtl:mr-2 rtl:ml-0">{dayName}</span>
                            </td>
                            <td className="p-3 font-medium">{shift.worker_name}</td>
                            <td className="p-3 text-gray-600">{shift.job_position}</td>
                            <td className="p-3">
                              <div className="font-medium">{shift.hours_worked?.toFixed(2)}h</div>
                              <div className="text-xs text-gray-500">{shift.start_time} - {shift.end_time}</div>
                            </td>
                            <td className="p-3 text-gray-600 text-xs">
                              {shift.overtime_rate && shift.overtime_rate !== 'regular' ? (
                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded">{shift.overtime_rate}%</span>
                              ) : (
                                <span className="text-gray-400">100%</span>
                              )}
                            </td>
                            <td className="p-3 text-green-700 font-medium">{formatCurrency(shift.payment_for_shift)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}