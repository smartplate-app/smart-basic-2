import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, Users, Calendar, TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import moment from "moment";

export default function MonthlySalaryReport({ selectedMonth, user, language }) {
  const [loading, setLoading] = useState(true);
  const [salaryData, setSalaryData] = useState([]);
  const [totals, setTotals] = useState({ totalSalary: 0, totalHours: 0 });
  const isRTL = language === 'he';

  useEffect(() => {
    loadSalaryData();
  }, [selectedMonth]);

  const loadSalaryData = async () => {
    try {
      setLoading(true);
      const workingEmail = user.acting_as_store_email || user.email;

      const monthStart = moment(selectedMonth).startOf('month');
      const monthEnd = moment(selectedMonth).endOf('month');
      const today = moment();
      const endDate = today.isBefore(monthEnd) && today.isAfter(monthStart) ? today : monthEnd;
      const daysPassed = endDate.diff(monthStart, 'days') + 1;
      const daysInMonth = moment(selectedMonth).daysInMonth();

      // Fetch all schedules, workers, and tips
      const [allSchedules, allWorkers, tipEntries] = await Promise.all([
        base44.entities.WeeklySchedule.filter({ created_by: workingEmail }),
        base44.entities.Worker.filter({ created_by: workingEmail, is_active: true }),
        base44.entities.TipEntry.filter({ created_by: workingEmail })
      ]);

      const monthTipsByWorker = {};
      (tipEntries || []).forEach(entry => {
        const entryDate = moment(entry.date || entry.period_start);
        if (entryDate.isSameOrAfter(monthStart) && entryDate.isSameOrBefore(endDate)) {
          (entry.workers || []).forEach(w => {
            if (!monthTipsByWorker[w.worker_id]) monthTipsByWorker[w.worker_id] = 0;
            monthTipsByWorker[w.worker_id] += (w.tip_amount || 0);
          });
        }
      });

      // Filter schedules that overlap with selected month
      const monthSchedules = allSchedules.filter(schedule => {
        const weekStart = moment(schedule.week_start_date);
        const weekEnd = moment(schedule.week_start_date).add(6, 'days');
        return weekEnd.isSameOrAfter(monthStart) && weekStart.isSameOrBefore(endDate);
      });

      // Group shifts by worker
      const workerShifts = {};
      monthSchedules.forEach(schedule => {
        if (schedule.shifts && schedule.shifts.length > 0) {
          schedule.shifts.forEach(shift => {
            if (!shift.worker_id || !shift.worker_name) return;
            
            // Only count shifts that are within the month and before/on endDate
            const shiftDate = moment(shift.date);
            if (!shiftDate.isSameOrAfter(monthStart) || !shiftDate.isSameOrBefore(endDate)) return;

            if (!workerShifts[shift.worker_id]) {
              workerShifts[shift.worker_id] = {
                worker_id: shift.worker_id,
                worker_name: shift.worker_name,
                shifts: [],
                positions: new Set()
              };
            }
            
            workerShifts[shift.worker_id].shifts.push({
              ...shift,
              schedule_week: schedule.week_start_date
            });
            
            if (shift.job_position) {
              workerShifts[shift.worker_id].positions.add(shift.job_position);
            }
          });
        }
      });

      // Calculate salary for each worker
      const salaryResults = Object.values(workerShifts).map(workerData => {
        const worker = allWorkers.find(w => w.id === workerData.worker_id);
        if (!worker) {
          return {
            ...workerData,
            totalSalary: 0,
            totalHours: 0,
            breakdown: [],
            positions: Array.from(workerData.positions).join(', ')
          };
        }

        const paymentType = worker.payment_type;
        const paymentAmount = worker.payment_amount || 0;
        const managementBonus = parseFloat(worker.management_bonus) || 0;
        const targetMonthlySalary = parseFloat(worker.target_monthly_salary) || 0;
        const employerCostPercent = worker.employer_cost_percentage || 25;

        let totalSalary = 0;
        let totalHours = 0;
        const breakdown = [];

        // Note: For target_monthly_salary, we first need to calculate the actual shift pay, so we calculate management bonus LATER.
        // We will push a placeholder for it and compute it after all shifts.
        let dynamicBonusPlaceholderIndex = -1;
        let fixedBonusAmount = 0;
        let fixedBonusWithEmployerCosts = 0;

        // Add proportional management bonus for ALL payment types
        if (managementBonus > 0 || targetMonthlySalary > 0) {
          if (managementBonus > 0) {
            const dailyBonus = managementBonus / daysInMonth;
            fixedBonusAmount = dailyBonus * daysPassed;
            fixedBonusWithEmployerCosts = fixedBonusAmount * (1 + employerCostPercent / 100);
            
            totalSalary += fixedBonusWithEmployerCosts;
            breakdown.push({
              type: language === 'he' ? 'תוספת ניהול (יחסית)' : 'Management Bonus (Pro-rata)',
              days: daysPassed,
              daysInMonth: daysInMonth,
              baseSalary: fixedBonusAmount,
              salary: fixedBonusWithEmployerCosts,
              details: language === 'he' 
                ? `תוספת ניהול: ${daysPassed} ימים מתוך ${daysInMonth} (${((daysPassed/daysInMonth)*100).toFixed(0)}%)`
                : `Management Bonus: ${daysPassed} days out of ${daysInMonth} (${((daysPassed/daysInMonth)*100).toFixed(0)}%)`
            });
          }

          if (targetMonthlySalary > 0) {
            // We need to calculate it at the end. Keep its index.
            dynamicBonusPlaceholderIndex = breakdown.length;
            breakdown.push(null);
          }
        }
        }

        if (paymentType === 'monthly') {
          // Monthly salary: pro-rata based on days passed
          const dailyRate = paymentAmount / daysInMonth;
          let baseSalary = dailyRate * daysPassed;
          
          if (!worker.salary_includes_travel && worker.travel_expense_type === 'monthly') {
            baseSalary += (226 * (daysPassed / daysInMonth));
          }
          
          const withEmployerCosts = baseSalary * (1 + employerCostPercent / 100);
          
          totalSalary = withEmployerCosts;
          totalHours = workerData.shifts.reduce((sum, shift) => sum + (shift.hours_worked || 0), 0);
          
          breakdown.push({
            type: language === 'he' ? 'משכורת חודשית (יחסית)' : 'Monthly Salary (Pro-rata)',
            days: daysPassed,
            daysInMonth: daysInMonth,
            baseSalary: baseSalary,
            salary: withEmployerCosts,
            details: language === 'he' 
              ? `${daysPassed} ימים מתוך ${daysInMonth} (${((daysPassed/daysInMonth)*100).toFixed(0)}%)`
              : `${daysPassed} days out of ${daysInMonth} (${((daysPassed/daysInMonth)*100).toFixed(0)}%)`
          });
        } else {
          // Hourly or Daily: calculate from actual shifts with overtime
          workerData.shifts.forEach(shift => {
            const hoursWorked = shift.hours_worked || 0;
            totalHours += hoursWorked;

            if (paymentType === 'hourly') {
              const hourlyRate = paymentAmount;
              
              // Israeli labor law: calculate overtime
              // Get custom regular hours threshold (default 8)
              const regularHoursThreshold = parseFloat(user.regular_hours_per_day) || 8;
              let regularHours = Math.min(hoursWorked, regularHoursThreshold);
              let overtime125 = Math.min(Math.max(hoursWorked - regularHoursThreshold, 0), 2);
              let overtime150 = Math.max(hoursWorked - (regularHoursThreshold + 2), 0);

              // Check if weekend (Saturday) - all hours are 150%
              const shiftDate = moment(shift.date);
              const isSaturday = shiftDate.day() === 6;
              
              if (isSaturday) {
                overtime150 = hoursWorked;
                regularHours = 0;
                overtime125 = 0;
              }
              
              const regularPay = regularHours * hourlyRate;
              const overtime125Pay = overtime125 * hourlyRate * 1.25;
              const overtime150Pay = overtime150 * hourlyRate * 1.5;
              
              // If worker salary includes overtime, treat all hours as 100%
              let baseSalary = regularPay + overtime125Pay + overtime150Pay;
              if (worker.salary_includes_overtime) {
                baseSalary = hoursWorked * hourlyRate;
              }
              
              if (!worker.salary_includes_travel && worker.travel_expense_type === 'daily') {
                baseSalary += 22.60;
              }
              
              const withEmployerCosts = baseSalary * (1 + employerCostPercent / 100);

              totalSalary += withEmployerCosts;
              
              if (hoursWorked > 0) {
                breakdown.push({
                  type: language === 'he' ? 'שעתי' : 'Hourly',
                  date: shift.date,
                  position: shift.job_position,
                  regularHours,
                  overtime125,
                  overtime150,
                  isSaturday,
                  hourlyRate,
                  baseSalary,
                  salary: withEmployerCosts,
                  details: isSaturday 
                    ? (language === 'he' ? `שבת - ${hoursWorked}ש׳ × 150%` : `Saturday - ${hoursWorked}h × 150%`)
                    : (language === 'he' 
                      ? `${regularHours}ש׳ רגיל${overtime125 > 0 ? ` + ${overtime125}ש׳×125%` : ''}${overtime150 > 0 ? ` + ${overtime150}ש׳×150%` : ''}`
                      : `${regularHours}h regular${overtime125 > 0 ? ` + ${overtime125}h×125%` : ''}${overtime150 > 0 ? ` + ${overtime150}h×150%` : ''}`)
                });
              }
            } else if (paymentType === 'daily') {
              // Daily rate: fixed per day regardless of hours (but track hours for reference)
              const baseSalary = paymentAmount;
              const withEmployerCosts = baseSalary * (1 + employerCostPercent / 100);
              
              totalSalary += withEmployerCosts;
              
              breakdown.push({
                type: language === 'he' ? 'יומי' : 'Daily',
                date: shift.date,
                position: shift.job_position,
                hours: hoursWorked,
                dailyRate: paymentAmount,
                baseSalary,
                salary: withEmployerCosts,
                details: language === 'he' 
                  ? `תשלום יומי (${hoursWorked} שעות)`
                  : `Daily rate (${hoursWorked} hours)`
              });
            }
          });
        }

        // Now calculate dynamic bonus if target_monthly_salary > 0
        if (targetMonthlySalary > 0 && dynamicBonusPlaceholderIndex !== -1) {
          const ratio = Math.min(1, Math.max(0, daysPassed / daysInMonth));
          const targetProRata = targetMonthlySalary * ratio;
          
          // The base earnings without employer costs:
          const shiftBaseEarnings = breakdown.reduce((sum, item) => {
            if (!item) return sum;
            if (item.type.includes('Management Bonus')) return sum;
            return sum + (item.baseSalary || 0);
          }, 0);
          
          const workerTips = monthTipsByWorker[workerData.worker_id] || 0;
          // Simple approximation for Monthly Report (LaborReportsTab has the exact Alema logic)
          // We assume managers with target_monthly_salary either don't work tipped shifts,
          // or their base pay + tips is their total earnings.
          const totalBaseEarnings = shiftBaseEarnings + workerTips;

          const dynamicBonusAmount = Math.max(0, targetProRata - totalBaseEarnings);
          const dynamicBonusWithEmployerCosts = dynamicBonusAmount * (1 + employerCostPercent / 100);

          totalSalary += dynamicBonusWithEmployerCosts;

          breakdown[dynamicBonusPlaceholderIndex] = {
            type: language === 'he' ? 'השלמה לשכר יעד (יחסית)' : 'Target Salary Bonus (Pro-rata)',
            days: daysPassed,
            daysInMonth: daysInMonth,
            baseSalary: dynamicBonusAmount,
            salary: dynamicBonusWithEmployerCosts,
            details: language === 'he'
              ? `יעד: ${targetProRata.toFixed(0)}₪ (השלמה משכר בסיס של ${totalBaseEarnings.toFixed(0)}₪)`
              : `Target: ${targetProRata.toFixed(0)} ILS (Completed from base ${totalBaseEarnings.toFixed(0)} ILS)`
          };
        }

        // Clean up any potential nulls if logic bypassed
        const finalBreakdown = breakdown.filter(Boolean);

        return {
          ...workerData,
          worker,
          totalSalary,
          totalHours,
          breakdown: finalBreakdown,
          positions: Array.from(workerData.positions).join(', '),
          paymentType,
          paymentAmount,
          employerCostPercent
        };
      });

      // Sort by total salary descending
      salaryResults.sort((a, b) => b.totalSalary - a.totalSalary);

      const totalSalary = salaryResults.reduce((sum, w) => sum + w.totalSalary, 0);
      const totalHours = salaryResults.reduce((sum, w) => sum + w.totalHours, 0);

      setSalaryData(salaryResults);
      setTotals({ totalSalary, totalHours });

    } catch (error) {
      console.error("Error loading salary data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(language === 'he' ? 'he-IL' : 'en-US', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const monthStart = moment(selectedMonth).startOf('month');
  const monthEnd = moment(selectedMonth).endOf('month');
  const today = moment();
  const isCurrentMonth = today.isSame(selectedMonth, 'month');
  const daysPassed = isCurrentMonth ? today.diff(monthStart, 'days') + 1 : moment(selectedMonth).daysInMonth();
  const daysInMonth = moment(selectedMonth).daysInMonth();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className={`text-white text-sm flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <DollarSign className="w-4 h-4" />
              {language === 'he' ? 'סה"כ עלות שכר' : 'Total Salary Cost'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
              {formatCurrency(totals.totalSalary)}
            </div>
            <p className={`text-xs text-blue-100 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {language === 'he' ? 'כולל עלויות מעסיק' : 'Including employer costs'}
            </p>
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
            <div className={`text-3xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
              {salaryData.length}
            </div>
            <p className={`text-xs text-purple-100 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {language === 'he' ? 'עבדו החודש' : 'Worked this month'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className={`text-white text-sm flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <TrendingUp className="w-4 h-4" />
              {language === 'he' ? 'סה"כ שעות' : 'Total Hours'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
              {totals.totalHours.toFixed(1)}
            </div>
            <p className={`text-xs text-green-100 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {language === 'he' ? 'שעות עבודה' : 'Work hours'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period Info */}
      {isCurrentMonth && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className={`flex items-center gap-2 text-amber-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Calendar className="w-5 h-5" />
              <span className="font-semibold">
                {language === 'he' 
                  ? `דוח חלקי: ${daysPassed} ימים מתוך ${daysInMonth} (${((daysPassed/daysInMonth)*100).toFixed(0)}%)`
                  : `Partial Report: ${daysPassed} days out of ${daysInMonth} (${((daysPassed/daysInMonth)*100).toFixed(0)}%)`}
              </span>
            </div>
            <p className={`text-sm text-amber-700 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {language === 'he' 
                ? 'משכורות חודשיות מחושבות יחסית לפי ימי העבודה עד כה'
                : 'Monthly salaries calculated pro-rata based on days worked so far'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Worker Salary Details */}
      {salaryData.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>{language === 'he' ? 'אין נתוני שכר לחודש זה' : 'No salary data for this month'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {salaryData.map((workerData, index) => (
            <Card key={workerData.worker_id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className={`flex justify-between items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div>
                    <CardTitle className={`text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                      {workerData.worker_name}
                    </CardTitle>
                    <p className={`text-sm text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {workerData.positions || (language === 'he' ? 'לא צוין תפקיד' : 'No position specified')}
                    </p>
                  </div>
                  <div className={`text-right ${isRTL ? 'text-left' : ''}`}>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(workerData.totalSalary)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {workerData.totalHours.toFixed(1)} {language === 'he' ? 'שעות' : 'hours'}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Payment Info */}
                <div className={`bg-gray-50 rounded-lg p-3 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className="text-sm text-gray-600">
                    <strong>{language === 'he' ? 'סוג תשלום:' : 'Payment Type:'}</strong>{' '}
                    {workerData.paymentType === 'monthly' 
                      ? (language === 'he' ? 'חודשי' : 'Monthly')
                      : workerData.paymentType === 'daily'
                      ? (language === 'he' ? 'יומי' : 'Daily')
                      : (language === 'he' ? 'שעתי' : 'Hourly')
                    }
                    {' | '}
                    <strong>{language === 'he' ? 'שכר בסיס:' : 'Base Rate:'}</strong> {formatCurrency(workerData.paymentAmount)}
                    {' | '}
                    <strong>{language === 'he' ? 'עלויות מעסיק:' : 'Employer Costs:'}</strong> {workerData.employerCostPercent}%
                  </div>
                </div>

                {/* Breakdown */}
                {workerData.breakdown && workerData.breakdown.length > 0 && (
                  <div className="space-y-2">
                    <h4 className={`text-sm font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {language === 'he' ? 'פירוט:' : 'Breakdown:'}
                    </h4>
                    {workerData.breakdown.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`flex justify-between items-center text-sm p-2 bg-white rounded border ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          {item.date && (
                            <div className="font-medium text-gray-700">
                              {moment(item.date).format('DD/MM')} - {item.position}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">{item.details}</div>
                        </div>
                        <div className={`font-semibold text-gray-900 ${isRTL ? 'text-left' : 'text-right'}`}>
                          {formatCurrency(item.salary)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}