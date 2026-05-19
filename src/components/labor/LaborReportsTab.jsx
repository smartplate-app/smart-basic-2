import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../LanguageProvider";
import moment from "moment";
import { FileText, Users, Clock, Calculator, Download } from "lucide-react";

export default function LaborReportsTab({ schedules, workers, positions }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  
  const [reportType, setReportType] = useState("summary"); // summary | detailed
  const [periodType, setPeriodType] = useState("current_month"); // current_week | current_month | last_month | custom
  const [startDate, setStartDate] = useState(moment().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().endOf('month').format('YYYY-MM-DD'));
  const [tipEntries, setTipEntries] = useState([]);
  const [loadingTips, setLoadingTips] = useState(false);
  const [workerSearchTerm, setWorkerSearchTerm] = useState("");
  const [selectedWorkers, setSelectedWorkers] = useState(new Set());

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

  const isPositionTipped = (posName) => {
    if (!positions) return true;
    const p = positions.find(pos => pos.name === posName);
    return p ? p.tips_method !== 'excluded' : true;
  };

  // Aggregate data by position
  const positionSummaryData = useMemo(() => {
    const posMap = new Map();
    filteredShifts.forEach(shift => {
      const posName = shift.job_position || 'לא הוגדר';
      if (!posMap.has(posName)) {
        posMap.set(posName, {
          position: posName,
          total_hours: 0,
          total_shifts: 0,
          payment_for_shift: 0,
          payment_tipped: 0,
          payment_regular: 0,
          total_cost: 0,
          total_tips: 0,
          workers: new Set()
        });
      }
      const record = posMap.get(posName);
      const worker = workers.find(w => w.id === shift.worker_id);
      const employerCostPercent = worker?.employer_cost_percentage || 25;
      
      record.total_hours += (shift.hours_worked || 0);
      record.total_shifts += 1;
      
      const shiftPayment = shift.payment_for_shift || 0;
      record.payment_for_shift += shiftPayment;
      
      if (isPositionTipped(posName)) {
        record.payment_tipped += shiftPayment;
      } else {
        record.payment_regular += shiftPayment;
      }

      const employerCost = shiftPayment * (employerCostPercent / 100);
      record.employer_taxes = (record.employer_taxes || 0) + employerCost;
      record.workers.add(shift.worker_name);
    });
    
    // Add tips to position summary
    tipEntries.forEach(entry => {
      if (!entry.workers) return;
      entry.workers.forEach(w => {
        const worker = workers.find(wk => w.worker_id === wk.id);
        const posName = worker?.job_position_name || 'לא הוגדר';
        if (!posMap.has(posName)) {
            posMap.set(posName, {
              position: posName,
              total_hours: 0,
              total_shifts: 0,
              payment_for_shift: 0,
              payment_tipped: 0,
              payment_regular: 0,
              total_cost: 0,
              total_tips: 0,
              employer_taxes: 0,
              workers: new Set([w.worker_name || worker?.full_name || 'לא ידוע'])
            });
        }
        posMap.get(posName).total_tips += (w.tip_amount || 0);
      });
    });

    return Array.from(posMap.values()).map(r => {
      const alema = Math.max(0, r.payment_tipped - r.total_tips);
      const regular_pay = r.payment_regular;
      return {
        ...r,
        workers_count: r.workers.size,
        alema: alema,
        regular_pay: regular_pay,
        total_cost: alema + regular_pay + (r.employer_taxes || 0)
      };
    }).sort((a, b) => b.total_cost - a.total_cost);
  }, [filteredShifts, tipEntries, workers, positions]);

  const detailedDataByWorker = useMemo(() => {
    if (!workers || !schedules) return [];
    
    // Generate dates in range
    const dates = [];
    let curr = moment(startDate).startOf('day');
    const end = moment(endDate).endOf('day');
    while (curr.isSameOrBefore(end)) {
      dates.push(curr.format('YYYY-MM-DD'));
      curr.add(1, 'day');
    }

    // Map tips
    const tipsByWorkerDate = new Map();
    tipEntries.forEach(entry => {
      const d = entry.date || entry.period_start;
      if (d && entry.workers) {
        entry.workers.forEach(w => {
          const key = `${w.worker_id}_${d}`;
          if (!tipsByWorkerDate.has(key)) {
            tipsByWorkerDate.set(key, { cash: 0, credit: 0, total: 0 });
          }
          const t = tipsByWorkerDate.get(key);
          t.cash += (w.cash_tips || 0);
          t.credit += (w.credit_tips || 0);
          t.total += (w.tip_amount || 0);
        });
      }
    });

    // Map shifts
    const shiftsByWorkerDate = new Map();
    filteredShifts.forEach(shift => {
       const key = `${shift.worker_id}_${shift.date}`;
       if (!shiftsByWorkerDate.has(key)) shiftsByWorkerDate.set(key, []);
       shiftsByWorkerDate.get(key).push(shift);
    });

    const sortedWorkers = [...workers]
      .filter(w => selectedWorkers.size === 0 || selectedWorkers.has(w.id))
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    
    const result = [];
    
    sortedWorkers.forEach(worker => {
       const workerRows = [];
       let w_hours = 0, w_cash = 0, w_credit = 0, w_tips = 0, w_alema = 0, w_pay = 0, w_cost = 0;
       const empCostPct = worker.employer_cost_percentage || 25;

       dates.forEach(date => {
          const shifts = shiftsByWorkerDate.get(`${worker.id}_${date}`) || [];
          const tips = tipsByWorkerDate.get(`${worker.id}_${date}`) || { cash: 0, credit: 0, total: 0 };
          
          if (shifts.length === 0) {
             workerRows.push({
                date, role: '', start: '', end: '', hours: 0, rate: 0,
                cash_tips: tips.cash, cc_tips: tips.credit, total_tips: tips.total,
                alema: 0, pay: 0, employer_cost: 0, isEmpty: tips.total === 0
             });
             w_cash += tips.cash; w_credit += tips.credit; w_tips += tips.total;
          } else {
             shifts.forEach((s, idx) => {
                const isFirst = idx === 0;
                const t_cash = isFirst ? tips.cash : 0;
                const t_credit = isFirst ? tips.credit : 0;
                const t_total = isFirst ? tips.total : 0;

                const hrs = s.hours_worked || 0;
                const pay = s.payment_for_shift || 0;
                const rate = hrs > 0 ? pay / hrs : 0;
                
                const isTipped = isPositionTipped(s.job_position);
                
                // Alema (השלמה): The gap the employer needs to pay if tips don't cover the base pay (only for tipped positions)
                const alema = isTipped ? Math.max(0, pay - t_total) : 0;
                const regular_pay = isTipped ? 0 : pay;
                
                // Employer taxes/social benefits are usually calculated on the full gross pay (base pay)
                const employerTaxes = pay * (empCostPct / 100);
                
                // Total cost to employer = The gap paid out of pocket (Alema) + Regular Pay + Employer taxes on full gross
                const empCost = alema + regular_pay + employerTaxes;

                workerRows.push({
                   date, role: s.job_position || '', start: s.start_time || '', end: s.end_time || '',
                   hours: hrs, rate: rate, cash_tips: t_cash, cc_tips: t_credit, total_tips: t_total,
                   alema: alema, regular_pay: regular_pay, pay: pay, employer_cost: empCost, isEmpty: false
                });

                w_hours += hrs; w_cash += t_cash; w_credit += t_credit; w_tips += t_total;
                w_alema += alema; w_pay += pay; w_cost += empCost;
             });
          }
       });

       if (w_hours > 0 || w_tips > 0) {
         // Calculate management bonus for detailed view total
         const mgmtBonusRaw = parseFloat(worker.management_bonus) || 0;
         const daysInMonth = moment(startDate).daysInMonth();
         const daysInPeriod = moment(endDate).diff(moment(startDate), 'days') + 1;
         const ratio = Math.min(1, Math.max(0, daysInPeriod / daysInMonth));
         const mgmtBonusProRata = mgmtBonusRaw * ratio;
         const employerTaxesOnBonus = mgmtBonusProRata * (empCostPct / 100);
         
         const finalCost = w_cost + mgmtBonusProRata + employerTaxesOnBonus;
         const finalGross = w_pay + mgmtBonusProRata;

         result.push({
            worker_name: worker.full_name,
            rows: workerRows,
            totals: { hours: w_hours, cash: w_cash, credit: w_credit, tips: w_tips, alema: w_alema, pay: finalGross, cost: finalCost, management_bonus: mgmtBonusProRata }
         });
       }
    });
    return result;
  }, [startDate, endDate, workers, schedules, filteredShifts, tipEntries, positions, selectedWorkers]);

  // Aggregate data by day
  const dailySummaryData = useMemo(() => {
    const dayMap = new Map();
    filteredShifts.forEach(shift => {
      const date = shift.date;
      if (!dayMap.has(date)) {
        dayMap.set(date, {
          date: date,
          total_hours: 0,
          total_shifts: 0,
          payment_for_shift: 0,
          payment_tipped: 0,
          payment_regular: 0,
          total_cost: 0,
          total_tips: 0
        });
      }
      const record = dayMap.get(date);
      const worker = workers.find(w => w.id === shift.worker_id);
      const employerCostPercent = worker?.employer_cost_percentage || 25;
      
      record.total_hours += (shift.hours_worked || 0);
      record.total_shifts += 1;
      const shiftPayment = shift.payment_for_shift || 0;
      record.payment_for_shift += shiftPayment;
      
      if (isPositionTipped(shift.job_position)) {
        record.payment_tipped += shiftPayment;
      } else {
        record.payment_regular += shiftPayment;
      }

      const employerCost = shiftPayment * (employerCostPercent / 100);
      record.employer_taxes = (record.employer_taxes || 0) + employerCost;
    });

    tipEntries.forEach(entry => {
       const date = entry.date || entry.period_start; // fallback to period_start if no exact date
       if (date) {
         if (!dayMap.has(date)) {
           dayMap.set(date, {
             date: date,
             total_hours: 0,
             total_shifts: 0,
             payment_for_shift: 0,
             payment_tipped: 0,
             payment_regular: 0,
             total_cost: 0,
             total_tips: 0
           });
         }
         const record = dayMap.get(date);
         entry.workers?.forEach(w => {
           record.total_tips += (w.tip_amount || 0);
         });
       }
    });

    return Array.from(dayMap.values()).map(r => {
      const alema = Math.max(0, (r.payment_tipped || 0) - r.total_tips);
      const regular_pay = r.payment_regular || 0;
      return {
        ...r,
        alema: alema,
        regular_pay: regular_pay,
        total_cost: alema + regular_pay + (r.employer_taxes || 0)
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredShifts, tipEntries, workers, positions]);

  // Aggregate data for summary report
  const summaryData = useMemo(() => {
    const workerMap = new Map();
    
    // Check all workers for management bonus even if they have no shifts
    const daysInMonth = moment(startDate).daysInMonth();
    const daysInPeriod = moment(endDate).diff(moment(startDate), 'days') + 1;
    const ratio = Math.min(1, Math.max(0, daysInPeriod / daysInMonth));
    
    workers.forEach(worker => {
      const mgmtBonusRaw = parseFloat(worker.management_bonus) || 0;
      if (mgmtBonusRaw > 0) {
        const mgmtBonusProRata = mgmtBonusRaw * ratio;
        workerMap.set(worker.id, {
          worker_id: worker.id,
          worker_name: worker.full_name,
          total_hours: 0,
          total_shifts: 0,
          payment_tipped: 0,
          payment_regular: 0,
          management_bonus: mgmtBonusProRata,
          employer_cost: 0,
          total_tips: 0,
          positions: new Set()
        });
      }
    });

    filteredShifts.forEach(shift => {
      if (!workerMap.has(shift.worker_id)) {
        const worker = workers.find(w => w.id === shift.worker_id);
        workerMap.set(shift.worker_id, {
          worker_id: shift.worker_id,
          worker_name: shift.worker_name || worker?.full_name || 'לא ידוע',
          total_hours: 0,
          total_shifts: 0,
          payment_tipped: 0,
          payment_regular: 0,
          management_bonus: 0,
          employer_cost: 0,
          total_tips: 0,
          positions: new Set()
        });
      }
      
      const record = workerMap.get(shift.worker_id);
      const worker = workers.find(w => w.id === shift.worker_id);
      const employerCostPercent = worker?.employer_cost_percentage || 25;
      
      record.total_hours += (shift.hours_worked || 0);
      record.total_shifts += 1;
      
      const shiftPayment = shift.payment_for_shift || 0;
      if (isPositionTipped(shift.job_position)) {
        record.payment_tipped += shiftPayment;
      } else {
        record.payment_regular += shiftPayment;
      }
      
      const employerCost = shiftPayment * (employerCostPercent / 100);
      record.employer_cost += employerCost;
      
      if (shift.job_position) record.positions.add(shift.job_position);
    });

    // Add tips data from TipEntries
    tipEntries.forEach(entry => {
      if (!entry.workers) return;
      entry.workers.forEach(w => {
        if (!workerMap.has(w.worker_id)) {
          const worker = workers.find(wk => w.worker_id === wk.id);
          workerMap.set(w.worker_id, {
            worker_id: w.worker_id,
            worker_name: w.worker_name || worker?.full_name || 'לא ידוע',
            total_hours: 0,
            total_shifts: 0,
            payment_tipped: 0,
            payment_regular: 0,
            management_bonus: 0,
            employer_cost: 0,
            total_tips: 0,
            positions: new Set()
          });
        }
        
        const record = workerMap.get(w.worker_id);
        record.total_tips += (w.tip_amount || 0);
      });
    });
    
    return Array.from(workerMap.values())
      .filter(r => selectedWorkers.size === 0 || selectedWorkers.has(r.worker_id))
      .map(r => {
      const worker = workers.find(w => w.id === r.worker_id);
      const empCostPct = worker?.employer_cost_percentage || 25;
      
      const alema = Math.max(0, r.payment_tipped - r.total_tips);
      const regular_pay = r.payment_regular;
      const mgmtBonus = r.management_bonus || 0;
      
      const employerTaxesOnBonus = mgmtBonus * (empCostPct / 100);
      const total_gross = r.payment_tipped + regular_pay + mgmtBonus;
      const total_taxes = r.employer_cost + employerTaxesOnBonus;
      
      return {
        ...r,
        alema,
        regular_pay,
        total_gross,
        total_cost: alema + regular_pay + mgmtBonus + total_taxes,
        positions_list: Array.from(r.positions).join(', ')
      };
    }).sort((a, b) => b.total_cost - a.total_cost);
  }, [filteredShifts, tipEntries, workers, positions, startDate, endDate, selectedWorkers]);

  // Calculate grand totals
  const grandTotals = useMemo(() => {
    const dataToSum = reportType === "summary" ? summaryData 
      : reportType === "summary_position" ? positionSummaryData 
      : reportType === "daily" ? dailySummaryData 
      : summaryData; // fallback
      
    return dataToSum.reduce((acc, curr) => {
      acc.hours += curr.total_hours || 0;
      acc.shifts += curr.total_shifts || 0;
      acc.payment += curr.total_gross || (curr.payment_tipped || 0) + (curr.regular_pay || 0) || 0;
      acc.cost += curr.total_cost || 0;
      acc.tips += curr.total_tips || 0;
      acc.alema += curr.alema || 0;
      acc.regular_pay += curr.regular_pay || 0;
      acc.management_bonus += curr.management_bonus || 0;
      return acc;
    }, { hours: 0, shifts: 0, payment: 0, cost: 0, tips: 0, alema: 0, regular_pay: 0, management_bonus: 0 });
  }, [summaryData, positionSummaryData, dailySummaryData, reportType]);

  const handleExportCSV = () => {
    let csvContent = "\uFEFF"; // BOM for UTF-8

    if (reportType === "summary") {
      csvContent += language === 'he' ? "עובד,תפקידים,משמרות,שעות,טיפים,השלמה,שכר בסיס,תוספת ניהול,שכר ברוטו,עלות למעסיק\n" : "Worker,Positions,Shifts,Hours,Tips,Alema,Regular Pay,Mgmt Bonus,Gross Pay,Employer Cost\n";
      summaryData.forEach(row => {
        csvContent += `"${row.worker_name}","${row.positions_list}",${row.total_shifts},${row.total_hours.toFixed(2)},${row.total_tips.toFixed(2)},${row.alema.toFixed(2)},${row.regular_pay.toFixed(2)},${row.management_bonus.toFixed(2)},${row.total_gross.toFixed(2)},${row.total_cost.toFixed(2)}\n`;
      });
      csvContent += language === 'he' ? `"סה״כ","",${grandTotals.shifts},${grandTotals.hours.toFixed(2)},${grandTotals.tips.toFixed(2)},${grandTotals.alema.toFixed(2)},${grandTotals.regular_pay.toFixed(2)},${grandTotals.management_bonus.toFixed(2)},${grandTotals.payment.toFixed(2)},${grandTotals.cost.toFixed(2)}\n` : `"Total","",${grandTotals.shifts},${grandTotals.hours.toFixed(2)},${grandTotals.tips.toFixed(2)},${grandTotals.alema.toFixed(2)},${grandTotals.regular_pay.toFixed(2)},${grandTotals.management_bonus.toFixed(2)},${grandTotals.payment.toFixed(2)},${grandTotals.cost.toFixed(2)}\n`;
    } else if (reportType === "summary_position") {
      csvContent += language === 'he' ? "תפקיד,מספר עובדים,משמרות,שעות,טיפים,השלמה,שכר בסיס,עלות למעסיק\n" : "Position,Workers,Shifts,Hours,Tips,Alema,Regular Pay,Employer Cost\n";
      positionSummaryData.forEach(row => {
        csvContent += `"${row.position}",${row.workers_count},${row.total_shifts},${row.total_hours.toFixed(2)},${row.total_tips.toFixed(2)},${row.alema.toFixed(2)},${row.regular_pay.toFixed(2)},${row.total_cost.toFixed(2)}\n`;
      });
      csvContent += language === 'he' ? `"סה״כ","",${grandTotals.shifts},${grandTotals.hours.toFixed(2)},${grandTotals.tips.toFixed(2)},${grandTotals.alema.toFixed(2)},${grandTotals.regular_pay.toFixed(2)},${(grandTotals.cost - grandTotals.management_bonus).toFixed(2)}\n` : `"Total","",${grandTotals.shifts},${grandTotals.hours.toFixed(2)},${grandTotals.tips.toFixed(2)},${grandTotals.alema.toFixed(2)},${grandTotals.regular_pay.toFixed(2)},${(grandTotals.cost - grandTotals.management_bonus).toFixed(2)}\n`;
    } else if (reportType === "daily") {
      csvContent += language === 'he' ? "תאריך,משמרות,שעות,טיפים,השלמה,שכר בסיס,עלות למעסיק\n" : "Date,Shifts,Hours,Tips,Alema,Regular Pay,Employer Cost\n";
      dailySummaryData.forEach(row => {
        csvContent += `"${moment(row.date).format('DD/MM/YYYY')}",${row.total_shifts},${row.total_hours.toFixed(2)},${row.total_tips.toFixed(2)},${row.alema.toFixed(2)},${row.regular_pay.toFixed(2)},${row.total_cost.toFixed(2)}\n`;
      });
      csvContent += language === 'he' ? `"סה״כ",${grandTotals.shifts},${grandTotals.hours.toFixed(2)},${grandTotals.tips.toFixed(2)},${grandTotals.alema.toFixed(2)},${grandTotals.regular_pay.toFixed(2)},${(grandTotals.cost - grandTotals.management_bonus).toFixed(2)}\n` : `"Total",${grandTotals.shifts},${grandTotals.hours.toFixed(2)},${grandTotals.tips.toFixed(2)},${grandTotals.alema.toFixed(2)},${grandTotals.regular_pay.toFixed(2)},${(grandTotals.cost - grandTotals.management_bonus).toFixed(2)}\n`;
    } else {
      csvContent += language === 'he' ? "עובד,תאריך,תפקיד,התחלה,סיום,שעות,תעריף,טיפ מזומן,טיפ אשראי,סה״כ טיפים,השלמה,שכר רגיל,ברוטו,עלות כוללת\n" : "Worker,Date,Position,Start,End,Hours,Rate,Cash Tips,CC Tips,Total Tips,Alema,Regular Pay,Gross Pay,Employer Cost\n";
      detailedDataByWorker.forEach(w => {
        w.rows.forEach(r => {
          csvContent += `"${w.worker_name}","${moment(r.date).format('DD/MM/YYYY')}","${r.role}","${r.start}","${r.end}",${r.hours.toFixed(2)},${r.rate.toFixed(2)},${r.cash_tips.toFixed(2)},${r.cc_tips.toFixed(2)},${r.total_tips.toFixed(2)},${r.alema.toFixed(2)},${(r.regular_pay || 0).toFixed(2)},${r.pay.toFixed(2)},${r.employer_cost.toFixed(2)}\n`;
        });
        if (w.totals.management_bonus > 0) {
          csvContent += `"${w.worker_name} תוספת ניהול","",,,,0,,0,0,0,0,0,${w.totals.management_bonus.toFixed(2)},${(w.totals.management_bonus * 1.25).toFixed(2)}\n`;
        }
        // Worker subtotal
        csvContent += `"${w.worker_name} סה״כ","",,,,${w.totals.hours.toFixed(2)},,${w.totals.cash.toFixed(2)},${w.totals.credit.toFixed(2)},${w.totals.tips.toFixed(2)},${w.totals.alema.toFixed(2)},${w.totals.pay.toFixed(2)},${w.totals.cost.toFixed(2)}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `labor_report_${reportType}_${moment().format('YYYY-MM-DD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <CardTitle className={`text-lg sm:text-xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <FileText className="w-5 h-5 text-purple-600 shrink-0" />
              <span className="truncate">{language === 'he' ? 'דוחות שכר ונוכחות' : 'Labor & Attendance Reports'}</span>
            </CardTitle>
            <button 
              onClick={handleExportCSV}
              className={`flex items-center justify-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium w-full sm:w-auto shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Download className="w-4 h-4" />
              {language === 'he' ? 'ייצא נתונים' : 'Export'}
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="bg-gray-50 p-3 rounded-lg border flex flex-col md:flex-row gap-3 items-end">
            <div className="w-full md:w-1/4">
              <label className={`block text-xs text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'סוג דוח' : 'Report Type'}
              </label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className={`h-8 text-sm ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
                  <SelectItem value="summary" className="text-sm">{language === 'he' ? 'סיכום לפי עובד' : 'Summary by Worker'}</SelectItem>
                  <SelectItem value="summary_position" className="text-sm">{language === 'he' ? 'סיכום לפי תפקיד/מחלקה' : 'Summary by Position'}</SelectItem>
                  <SelectItem value="daily" className="text-sm">{language === 'he' ? 'סיכום יומי מפורט' : 'Daily Summary'}</SelectItem>
                  <SelectItem value="detailed" className="text-sm">{language === 'he' ? 'פירוט משמרות מלא' : 'Detailed Shifts'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-1/4">
              <label className={`block text-xs text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'תקופה' : 'Period'}
              </label>
              <Select value={periodType} onValueChange={handlePeriodChange}>
                <SelectTrigger className={`h-8 text-sm ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
                  <SelectItem value="current_week" className="text-sm">{language === 'he' ? 'שבוע נוכחי' : 'Current Week'}</SelectItem>
                  <SelectItem value="current_month" className="text-sm">{language === 'he' ? 'חודש נוכחי' : 'Current Month'}</SelectItem>
                  <SelectItem value="last_month" className="text-sm">{language === 'he' ? 'חודש שעבר' : 'Last Month'}</SelectItem>
                  <SelectItem value="custom" className="text-sm">{language === 'he' ? 'טווח מותאם אישית' : 'Custom Range'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-1/4">
              <label className={`block text-xs text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'מתאריך' : 'Start Date'}
              </label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => { setStartDate(e.target.value); setPeriodType('custom'); }} 
                className={`h-8 text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                dir="ltr"
              />
            </div>
            <div className="w-full md:w-1/4">
              <label className={`block text-xs text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'עד תאריך' : 'End Date'}
              </label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => { setEndDate(e.target.value); setPeriodType('custom'); }} 
                className={`h-8 text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                dir="ltr"
              />
            </div>
          </div>
          
          {(reportType === "summary" || reportType === "detailed") && (
            <div className="bg-gray-50 p-3 rounded-lg border">
              <label className={`block text-xs text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'חיפוש וסינון עובדים' : 'Search and filter workers'}
              </label>
              <div className="flex flex-col gap-2">
                <Input
                  type="text"
                  placeholder={language === 'he' ? 'הקלד שם עובד...' : 'Type worker name...'}
                  value={workerSearchTerm}
                  onChange={(e) => setWorkerSearchTerm(e.target.value)}
                  className={`h-8 text-sm ${isRTL ? 'text-right' : 'text-left'} bg-white`}
                />
                
                {workerSearchTerm.length > 0 && (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto mt-2">
                    {workers
                      .filter(w => w.full_name?.toLowerCase().includes(workerSearchTerm.toLowerCase()))
                      .map(w => (
                        <button
                          key={w.id}
                          onClick={() => {
                            const newSet = new Set(selectedWorkers);
                            if (newSet.has(w.id)) {
                              newSet.delete(w.id);
                            } else {
                              newSet.add(w.id);
                            }
                            setSelectedWorkers(newSet);
                          }}
                          className={`px-3 py-1 rounded-full text-xs transition-colors border ${
                            selectedWorkers.has(w.id) 
                              ? 'bg-purple-100 border-purple-300 text-purple-800 font-medium hover:bg-purple-200' 
                              : 'bg-white hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {w.full_name}
                        </button>
                      ))}
                  </div>
                )}

                {selectedWorkers.size > 0 && (
                  <div className="flex flex-wrap gap-2 items-center mt-2 pt-2 border-t border-gray-200">
                    <span className="text-xs font-medium text-gray-500">
                      {language === 'he' ? 'נבחרו:' : 'Selected:'}
                    </span>
                    {Array.from(selectedWorkers).map(id => {
                      const w = workers.find(worker => worker.id === id);
                      return w ? (
                        <span key={id} className="inline-flex items-center gap-1 bg-purple-600 text-white px-2 py-1 rounded-full text-xs">
                          {w.full_name}
                          <button
                            onClick={() => {
                              const newSet = new Set(selectedWorkers);
                              newSet.delete(id);
                              setSelectedWorkers(newSet);
                            }}
                            className="hover:text-purple-200 focus:outline-none"
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                    <button
                      onClick={() => setSelectedWorkers(new Set())}
                      className="text-xs text-red-500 hover:text-red-700 underline"
                    >
                      {language === 'he' ? 'נקה הכל' : 'Clear all'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 flex flex-col justify-center">
              <div className={`text-xs text-purple-800 font-medium leading-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'סה״כ עובדים' : 'Total Workers'}
              </div>
              <div className={`text-lg md:text-xl font-bold text-purple-900 mt-1 ${isRTL ? 'text-right' : 'text-left'} break-words`}>
                {summaryData.length}
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col justify-center">
              <div className={`text-xs text-blue-800 font-medium leading-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'סה״כ שעות' : 'Total Hours'}
              </div>
              <div className={`text-lg md:text-xl font-bold text-blue-900 mt-1 ${isRTL ? 'text-right' : 'text-left'} break-words`}>
                {grandTotals.hours.toFixed(1)}
              </div>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex flex-col justify-center">
              <div className={`text-xs text-emerald-800 font-medium leading-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'סה״כ טיפים' : 'Total Tips'}
              </div>
              <div className={`text-lg md:text-xl font-bold text-emerald-900 mt-1 ${isRTL ? 'text-right' : 'text-left'} break-words`}>
                {formatCurrency(grandTotals.tips)}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex flex-col justify-center">
              <div className={`text-xs text-green-800 font-medium leading-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'שכר (ללא טיפים)' : 'Wages (excl. tips)'}
              </div>
              <div className={`text-lg md:text-xl font-bold text-green-900 mt-1 ${isRTL ? 'text-right' : 'text-left'} break-words`}>
                {formatCurrency(grandTotals.payment)}
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex flex-col justify-center">
              <div className={`text-xs text-orange-800 font-medium leading-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'השלמה (המעסיק משלם)' : 'Employer Alema'}
              </div>
              <div className={`text-lg md:text-xl font-bold text-orange-900 mt-1 ${isRTL ? 'text-right' : 'text-left'} break-words`}>
                {formatCurrency(grandTotals.alema)}
              </div>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex flex-col justify-center">
              <div className={`text-xs text-amber-800 font-medium leading-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'עלות כוללת למעסיק' : 'Total Employer Cost'}
              </div>
              <div className={`text-lg md:text-xl font-bold text-amber-900 mt-1 ${isRTL ? 'text-right' : 'text-left'} break-words`}>
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
                {reportType === "summary" && (
                  <>
                    <thead className="bg-gray-100">
                      <tr>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'עובד' : 'Worker'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'שעות' : 'Hours'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'טיפים' : 'Tips'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'} text-orange-700`}>{language === 'he' ? 'השלמה' : 'Alema'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'} text-blue-700`}>{language === 'he' ? 'שכר עבודה' : 'Regular Pay'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'} text-purple-700`}>{language === 'he' ? 'תוספת ניהול' : 'Mgmt Bonus'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'} text-green-700`}>{language === 'he' ? 'ברוטו כולל' : 'Total Gross'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'} bg-amber-50/50 text-amber-800`}>{language === 'he' ? 'עלות כוללת' : 'Total Cost'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.map((row, idx) => (
                        <tr key={row.worker_id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <td className="p-3 font-medium">
                            <div>{row.worker_name}</div>
                            <div className="text-xs text-gray-400 truncate max-w-[150px]" title={row.positions_list}>{row.positions_list}</div>
                          </td>
                          <td className="p-3">{row.total_hours.toFixed(1)}</td>
                          <td className="p-3 text-emerald-600 font-medium">{row.total_tips > 0 ? formatCurrency(row.total_tips) : '-'}</td>
                          <td className="p-3 text-orange-600 font-medium">{row.alema > 0 ? formatCurrency(row.alema) : '-'}</td>
                          <td className="p-3 text-blue-700 font-medium">{row.regular_pay > 0 ? formatCurrency(row.regular_pay) : '-'}</td>
                          <td className="p-3 text-purple-700 font-medium">{row.management_bonus > 0 ? formatCurrency(row.management_bonus) : '-'}</td>
                          <td className="p-3 text-green-700 font-medium">{formatCurrency(row.total_gross)}</td>
                          <td className="p-3 text-amber-700 font-bold bg-amber-50/30">{formatCurrency(row.total_cost)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                        <td className="p-3">{language === 'he' ? 'סה״כ' : 'Total'}</td>
                        <td className="p-3">{grandTotals.hours.toFixed(1)}</td>
                        <td className="p-3 text-emerald-600">{formatCurrency(grandTotals.tips)}</td>
                        <td className="p-3 text-orange-600">{formatCurrency(grandTotals.alema)}</td>
                        <td className="p-3 text-blue-700">{formatCurrency(grandTotals.regular_pay)}</td>
                        <td className="p-3 text-purple-700">{formatCurrency(grandTotals.management_bonus)}</td>
                        <td className="p-3 text-green-700">{formatCurrency(grandTotals.payment)}</td>
                        <td className="p-3 text-amber-700">{formatCurrency(grandTotals.cost)}</td>
                      </tr>
                    </tbody>
                  </>
                )}
                {reportType === "summary_position" && (
                  <>
                    <thead className="bg-gray-100">
                      <tr>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'תפקיד' : 'Position'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'שעות' : 'Hours'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'טיפים' : 'Tips'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'} text-orange-700`}>{language === 'he' ? 'השלמה' : 'Alema'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'} text-blue-700`}>{language === 'he' ? 'שכר עבודה' : 'Regular Pay'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'} bg-amber-50/50 text-amber-800`}>{language === 'he' ? 'עלות למעסיק' : 'Employer Cost'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positionSummaryData.map((row, idx) => (
                        <tr key={row.position} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <td className="p-3 font-medium">
                            <div>{row.position}</div>
                            <div className="text-xs text-gray-400">{row.workers_count} {language === 'he' ? 'עובדים' : 'workers'}</div>
                          </td>
                          <td className="p-3">{row.total_hours.toFixed(1)}</td>
                          <td className="p-3 text-emerald-600 font-medium">{row.total_tips > 0 ? formatCurrency(row.total_tips) : '-'}</td>
                          <td className="p-3 text-orange-600 font-medium">{row.alema > 0 ? formatCurrency(row.alema) : '-'}</td>
                          <td className="p-3 text-blue-700 font-medium">{row.regular_pay > 0 ? formatCurrency(row.regular_pay) : '-'}</td>
                          <td className="p-3 text-amber-700 font-bold bg-amber-50/30">{formatCurrency(row.total_cost)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                        <td className="p-3">{language === 'he' ? 'סה״כ' : 'Total'}</td>
                        <td className="p-3">{grandTotals.hours.toFixed(1)}</td>
                        <td className="p-3 text-emerald-600">{formatCurrency(grandTotals.tips)}</td>
                        <td className="p-3 text-orange-600">{formatCurrency(grandTotals.alema)}</td>
                        <td className="p-3 text-blue-700">{formatCurrency(grandTotals.regular_pay)}</td>
                        <td className="p-3 text-amber-700">{formatCurrency(grandTotals.cost - grandTotals.management_bonus)}</td>
                      </tr>
                    </tbody>
                  </>
                )}
                {reportType === "daily" && (
                  <>
                    <thead className="bg-gray-100">
                      <tr>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'תאריך' : 'Date'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'שעות' : 'Hours'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'טיפים' : 'Tips'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'} text-orange-700`}>{language === 'he' ? 'השלמה' : 'Alema'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'} text-blue-700`}>{language === 'he' ? 'שכר עבודה' : 'Regular Pay'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'} bg-amber-50/50 text-amber-800`}>{language === 'he' ? 'עלות למעסיק' : 'Employer Cost'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySummaryData.map((row, idx) => {
                        const dayName = moment(row.date).locale(language === 'he' ? 'he' : 'en').format('dddd');
                        return (
                          <tr key={row.date} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                            <td className="p-3 text-gray-600">
                              <span className="font-medium text-gray-900">{moment(row.date).format('DD/MM/YYYY')}</span>
                              <span className="text-xs ml-2 rtl:mr-2 rtl:ml-0">{dayName}</span>
                            </td>
                            <td className="p-3">{row.total_hours.toFixed(1)}</td>
                            <td className="p-3 text-emerald-600 font-medium">{row.total_tips > 0 ? formatCurrency(row.total_tips) : '-'}</td>
                            <td className="p-3 text-orange-600 font-medium">{row.alema > 0 ? formatCurrency(row.alema) : '-'}</td>
                            <td className="p-3 text-blue-700 font-medium">{row.regular_pay > 0 ? formatCurrency(row.regular_pay) : '-'}</td>
                            <td className="p-3 text-amber-700 font-bold bg-amber-50/30">{formatCurrency(row.total_cost)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                        <td className="p-3">{language === 'he' ? 'סה״כ' : 'Total'}</td>
                        <td className="p-3">{grandTotals.hours.toFixed(1)}</td>
                        <td className="p-3 text-emerald-600">{formatCurrency(grandTotals.tips)}</td>
                        <td className="p-3 text-orange-600">{formatCurrency(grandTotals.alema)}</td>
                        <td className="p-3 text-blue-700">{formatCurrency(grandTotals.regular_pay)}</td>
                        <td className="p-3 text-amber-700">{formatCurrency(grandTotals.cost - grandTotals.management_bonus)}</td>
                      </tr>
                    </tbody>
                  </>
                )}
                {reportType === "detailed" && (
                  <>
                    <thead className="bg-gray-100">
                      <tr>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'תאריך' : 'Date'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'תפקיד' : 'Role'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'שעות' : 'Hours'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'טיפ מזומן' : 'Cash'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'טיפ אשראי' : 'Credit'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'he' ? 'סה״כ טיפים' : 'Total Tips'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'} text-orange-700`}>{language === 'he' ? 'השלמה' : 'Alema'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'} text-blue-700`}>{language === 'he' ? 'שכר עבודה' : 'Regular Pay'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'} text-green-700`}>{language === 'he' ? 'ברוטו' : 'Gross'}</th>
                        <th className={`p-3 font-semibold ${isRTL ? 'text-right' : 'text-left'} bg-amber-50/50 text-amber-800`}>{language === 'he' ? 'עלות כוללת' : 'Employer Cost'}</th>
                      </tr>
                    </thead>
                    {detailedDataByWorker.map((workerBlock) => (
                      <tbody key={workerBlock.worker_name} className="border-b-4 border-gray-300">
                        {/* Worker Header */}
                        <tr className="bg-purple-100/50">
                          <td colSpan={10} className="p-3 font-bold text-base text-purple-900">
                            {workerBlock.worker_name}
                            {workerBlock.totals.management_bonus > 0 && (
                              <span className="mr-3 rtl:ml-3 rtl:mr-0 text-purple-600 text-sm font-normal">
                                + {language === 'he' ? 'תוספת ניהול' : 'Mgmt bonus'}: {formatCurrency(workerBlock.totals.management_bonus)}
                              </span>
                            )}
                          </td>
                        </tr>
                        {/* Days */}
                        {workerBlock.rows.map((row, rIdx) => {
                          const dayName = moment(row.date).locale(language === 'he' ? 'he' : 'en').format('ddd');
                          const isTipped = isPositionTipped(row.role);
                          return (
                            <tr key={`${row.date}-${rIdx}`} className={`border-b ${row.isEmpty ? 'opacity-40 bg-gray-50' : (rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')} hover:opacity-100 hover:bg-gray-100 transition-colors`}>
                              <td className="p-3 text-gray-600 whitespace-nowrap">
                                <span className="font-medium text-gray-900">{moment(row.date).format('DD/MM')}</span>
                                <span className="text-xs ml-1 rtl:mr-1 rtl:ml-0 text-gray-400">{dayName}</span>
                              </td>
                              <td className="p-3 text-gray-600 text-xs">{row.role || '-'}</td>
                              <td className="p-3 font-medium">{row.hours > 0 ? row.hours.toFixed(2) : '-'}</td>
                              <td className="p-3 text-gray-600">{row.cash_tips > 0 ? formatCurrency(row.cash_tips) : '-'}</td>
                              <td className="p-3 text-gray-600">{row.cc_tips > 0 ? formatCurrency(row.cc_tips) : '-'}</td>
                              <td className="p-3 text-emerald-600 font-medium">{row.total_tips > 0 ? formatCurrency(row.total_tips) : '-'}</td>
                              <td className="p-3 text-orange-600 font-medium">{isTipped && row.alema > 0 ? formatCurrency(row.alema) : (isTipped ? '-' : <span className="text-gray-300 text-xs">N/A</span>)}</td>
                              <td className="p-3 text-blue-700 font-medium">{!isTipped && row.regular_pay > 0 ? formatCurrency(row.regular_pay) : (isTipped ? '-' : <span className="text-gray-300 text-xs">N/A</span>)}</td>
                              <td className="p-3 text-green-700 font-medium">{row.pay > 0 ? formatCurrency(row.pay) : '-'}</td>
                              <td className="p-3 text-amber-700 font-bold bg-amber-50/30">{row.employer_cost > 0 ? formatCurrency(row.employer_cost) : '-'}</td>
                            </tr>
                          );
                        })}
                        {/* Worker Totals */}
                        <tr className="bg-purple-50 font-bold border-t border-purple-200">
                          <td colSpan={2} className="p-3 text-purple-900 text-sm">
                            {language === 'he' ? 'סיכום' : 'Subtotal'}:
                          </td>
                          <td className="p-3 text-purple-900">{workerBlock.totals.hours.toFixed(2)}</td>
                          <td className="p-3 text-purple-900">{formatCurrency(workerBlock.totals.cash)}</td>
                          <td className="p-3 text-purple-900">{formatCurrency(workerBlock.totals.credit)}</td>
                          <td className="p-3 text-emerald-700">{formatCurrency(workerBlock.totals.tips)}</td>
                          <td className="p-3 text-orange-700">{formatCurrency(workerBlock.totals.alema)}</td>
                          <td className="p-3 text-blue-700">-</td>
                          <td className="p-3 text-green-800">{formatCurrency(workerBlock.totals.pay)}</td>
                          <td className="p-3 text-amber-800 bg-amber-50/50">{formatCurrency(workerBlock.totals.cost)}</td>
                        </tr>
                      </tbody>
                    ))}
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