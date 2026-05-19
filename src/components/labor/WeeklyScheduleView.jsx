import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Save, Send, Trash2, Loader, Copy, FileText, Mail, X, AlertTriangle, Download, Plus, MoreHorizontal, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "../LanguageProvider";
import { toast } from "sonner";
import moment from "moment";
import html2canvas from "html2canvas";
import RowTimeDialog from "./RowTimeDialog";
import { offlineQueue } from "../offline/offlineQueue";
import { notifyOS } from "../notifications/notify";
import WeeklyScheduleTable from "./WeeklyScheduleTable";

// Set week to start on Sunday (Israel standard)
moment.updateLocale('en', {
  week: {
    dow: 0, // Sunday is the first day of the week
  }
});

// Helper: convert hex color to rgba with alpha
const hexToRgba = (hex, alpha = 1) => {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  let c = hex.trim();
  if (c[0] === '#') c = c.substring(1);
  if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function WeeklyScheduleView({ weekStartDate, positions, workers, onScheduleSaved }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [monthlyPredictedSales, setMonthlyPredictedSales] = useState(0); // Monthly predicted sales including VAT
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [additionalEmail, setAdditionalEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDoubleShiftWarning, setShowDoubleShiftWarning] = useState(false);
  const [pendingShiftSave, setPendingShiftSave] = useState(null);
  const [laborGoals, setLaborGoals] = useState({ shiftWorkersGoal: 0, managementSalary: 0, laborGoalPercent: 25 });
  const [positionOrder, setPositionOrder] = useState([]);
  const scheduleTableRef = useRef(null);
  const lastSavedDataRef = useRef(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showWorkerSidebar, setShowWorkerSidebar] = useState(true);
  const [showRowTimeDialog, setShowRowTimeDialog] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [rowTime, setRowTime] = useState({ start: "", end: "", mode: "all", dayFrom: "sunday", dayTo: "saturday" });
  const [isDraggingShift, setIsDraggingShift] = useState(false);

  const days = [
    { key: 'sunday', label: t('sunday') },
    { key: 'monday', label: t('monday') },
    { key: 'tuesday', label: t('tuesday') },
    { key: 'wednesday', label: t('wednesday') },
    { key: 'thursday', label: t('thursday') },
    { key: 'friday', label: t('friday') },
    { key: 'saturday', label: t('saturday') }
  ];

  // Stable draggable id for shifts (works also before DB id exists)
  const getShiftDraggableId = (s) => (
    s.id || `${s.day}|${s.date}|${s.job_position_id}|${s.position_row_id || 'default'}|${s.worker_id}|${s.start_time}|${s.end_time}`
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(language === 'he' ? 'he-IL' : 'en-US', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateHours = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }
    return totalMinutes / 60;
  };

  const calculatePayment = (worker, hoursWorked, overtimeRate, shiftPositionId) => {
            if (!worker) {
              return { basePayment: 0, totalPayment: 0, totalWithEmployerCost: 0 };
            }

            let paymentAmount = worker.payment_amount || 0;
            let paymentType = worker.payment_type || 'hourly';

            if (shiftPositionId && worker.position_rates && worker.position_rates.length > 0) {
              const rateOverride = worker.position_rates.find(r => r.position_id === shiftPositionId);
              if (rateOverride) {
                paymentAmount = rateOverride.amount;
                paymentType = rateOverride.payment_type || paymentType;
              }
            }

            let basePaymentAmount = 0;
            if (paymentType === 'hourly') {
              basePaymentAmount = hoursWorked * paymentAmount;
            } else if (paymentType === 'daily') {
              basePaymentAmount = paymentAmount;
            } else if (paymentType === 'monthly') {
              const monthlyWorkingDays = 22; // This is a common assumption for monthly workers
              const dailyRate = paymentAmount / monthlyWorkingDays;
              basePaymentAmount = dailyRate * (hoursWorked / 8); // Assuming an 8-hour workday for prorating monthly
            }

            let paymentForShift = basePaymentAmount;
            if (overtimeRate === '125') {
              paymentForShift = basePaymentAmount * 1.25;
            } else if (overtimeRate === '150') {
              paymentForShift = basePaymentAmount * 1.5;
            }

            // Calculate total cost including employer cost percentage (default 25%)
            const employerCostPercent = worker.employer_cost_percentage || 25;
            const totalWithEmployerCost = paymentForShift * (1 + employerCostPercent / 100);

            return { basePayment: basePaymentAmount, totalPayment: paymentForShift, totalWithEmployerCost };
          };

  const calculateTotals = () => {
    const shifts = schedule?.shifts || [];
    const totalHours = shifts.reduce((sum, s) => sum + (s.hours_worked || 0), 0);
    const totalBaseCost = shifts.reduce((sum, s) => sum + (s.payment_for_shift || 0), 0);
    
    // Calculate total cost including employer costs for each shift
    let totalCostWithEmployer = shifts.reduce((sum, s) => {
      const worker = workers.find(w => w.id === s.worker_id);
      const employerCostPercent = worker?.employer_cost_percentage || 25;
      const shiftPayment = s.payment_for_shift || 0;
      return sum + (shiftPayment * (1 + employerCostPercent / 100));
    }, 0);

    // Calculate relative management bonus for workers in the schedule
    const daysInMonth = moment(weekStartDate).daysInMonth() || 30;
    const uniqueWorkerIds = [...new Set(shifts.map(s => s.worker_id))];
    let totalManagementBonusWithEmployer = 0;
    
    uniqueWorkerIds.forEach(workerId => {
      const worker = workers.find(w => w.id === workerId);
      if (worker && parseFloat(worker.management_bonus) > 0) {
        const bonus = parseFloat(worker.management_bonus);
        const relativeBonus = (bonus / daysInMonth) * 7;
        const employerCostPercent = worker.employer_cost_percentage || 25;
        totalManagementBonusWithEmployer += relativeBonus * (1 + employerCostPercent / 100);
      }
    });

    totalCostWithEmployer += totalManagementBonusWithEmployer;
    
    // Calculate weekly predicted sales from monthly (divide by 4.2 weeks)
    const weeklyPredictedSalesWithVAT = monthlyPredictedSales > 0 ? monthlyPredictedSales / 4.2 : 0;
    const weeklyPredictedSalesWithoutVAT = weeklyPredictedSalesWithVAT / 1.17;
    
    // Labor percentage is based on weekly sales excluding VAT - using total cost WITH employer costs
    const laborPercentage = weeklyPredictedSalesWithoutVAT > 0 ? (totalCostWithEmployer / weeklyPredictedSalesWithoutVAT) * 100 : 0;

    return { totalHours, totalBaseCost, totalCostWithEmployer, laborPercentage, weeklyPredictedSalesWithVAT, weeklyPredictedSalesWithoutVAT };
  };

  // Auto-save effect
  useEffect(() => {
    if (loading || !schedule) return;
    
    const currentDataStr = JSON.stringify({
      shifts: schedule.shifts || [],
      position_rows: schedule.position_rows || [],
      position_order: positionOrder || [],
      monthlyPredictedSales: monthlyPredictedSales || 0
    });

    if (lastSavedDataRef.current === null) {
      lastSavedDataRef.current = currentDataStr;
      return;
    }

    if (currentDataStr !== lastSavedDataRef.current) {
      const timer = setTimeout(() => {
        performAutoSave(currentDataStr);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [schedule, positionOrder, monthlyPredictedSales, loading]);

  const performAutoSave = async (currentDataStr) => {
    setIsAutoSaving(true);
    try {
      const weekNumber = moment(weekStartDate).week();
      const year = moment(weekStartDate).year();
      const { totalHours, totalCostWithEmployer, laborPercentage } = calculateTotals();
      
      const scheduleData = {
        week_start_date: moment(weekStartDate).format('YYYY-MM-DD'),
        week_number: String(weekNumber),
        year: String(year),
        predicted_weekly_sales: monthlyPredictedSales / 4.2,
        shifts: schedule?.shifts || [],
        position_rows: schedule?.position_rows || [],
        total_hours: totalHours,
        total_cost: totalCostWithEmployer,
        labor_cost_percentage: laborPercentage,
        position_order: positionOrder,
        status: schedule?.status || 'draft'
      };

      if (!navigator.onLine) {
        setIsAutoSaving(false);
        return;
      }

      const user = currentUser || await base44.auth.me();

      if (schedule && schedule.id) {
        await base44.entities.WeeklySchedule.update(schedule.id, scheduleData);
      } else {
        scheduleData.created_by = user.email;
        const saved = await base44.entities.WeeklySchedule.create(scheduleData);
        setSchedule(prev => ({ ...prev, id: saved.id }));
      }
      
      lastSavedDataRef.current = currentDataStr;
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  // OS notification if weekly labor % exceeds goal (moved before early return)
  useEffect(() => {
    const lp = calculateTotals().laborPercentage;
    const goalPercent = laborGoals?.laborGoalPercent || 25;
    if (lp > goalPercent) {
      const key = `notif_week_over_goal_${weekStartDate || ''}`;
      if (!localStorage.getItem(key)) {
        const title = language === 'he' ? 'סידור שבועי מעל היעד' : 'Weekly schedule over goal';
        const body = language === 'he'
          ? `עלות עבודה שבועית ${lp.toFixed(1)}% גבוהה מהיעד ${goalPercent}%`
          : `Weekly labor ${lp.toFixed(1)}% is above goal ${goalPercent}%`;
        notifyOS({ title, body, tag: 'weekly-over-goal' });
        localStorage.setItem(key, '1');
      }
    }
  }, [schedule, monthlyPredictedSales, laborGoals?.laborGoalPercent, weekStartDate, language]);

  useEffect(() => {
    const fetchScheduleAndUser = async () => {
      setLoading(true);
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        const effectiveEmail = user.acting_as_user_email || user.acting_as_store_email || user.email;

        // Load labor goals for the month
        const currentMonth = moment(weekStartDate).format('YYYY-MM');
        const dashboardData = await base44.entities.MonthlyDashboardData.filter({
          created_by: effectiveEmail,
          month: currentMonth
        });
        
        if (dashboardData.length > 0) {
          const data = dashboardData[0];
          const predictedSalesExVAT = (data.predicted_sales || 0) / 1.17;
          const totalLaborGoalAmount = predictedSalesExVAT * ((data.labor_goal_percent || 25) / 100);
          const managementSalary = data.management_salary || 0;
          // Monthly shift workers goal = total labor goal minus management salary
          const monthlyShiftWorkersGoal = Math.max(0, totalLaborGoalAmount - managementSalary);
          // Calculate weeks in this month
          const weeksInMonth = moment(currentMonth).daysInMonth() / 7;
          // Weekly goal = monthly shift workers goal / weeks in month
          const weeklyShiftWorkersGoal = monthlyShiftWorkersGoal / weeksInMonth;
          
          setLaborGoals({
            shiftWorkersGoalWeekly: weeklyShiftWorkersGoal,
            monthlyShiftWorkersGoal: monthlyShiftWorkersGoal,
            managementSalary: managementSalary,
            laborGoalPercent: data.labor_goal_percent || 25
          });
        }

        const weekNumber = moment(weekStartDate).week();
        const year = moment(weekStartDate).year();
        
        let schedulesRes = await base44.entities.WeeklySchedule.filter({ 
          week_number: String(weekNumber), // Ensure week_number is string
          year: String(year), // Ensure year is string
          created_by: effectiveEmail
        });

        // Fallback: if admin is controlling and data was saved under admin's email
        if ((!schedulesRes || schedulesRes.length === 0) && user?.admin_original_email) {
          try {
            const alt = await base44.entities.WeeklySchedule.filter({
              week_number: String(weekNumber),
              year: String(year),
              created_by: user.admin_original_email
            });
            if (alt && alt.length > 0) schedulesRes = alt;
          } catch {}
        }

        if (schedulesRes && schedulesRes.length > 0) {
          const fetchedSchedule = schedulesRes[0];
          setSchedule(fetchedSchedule);
          // Convert stored weekly sales back to monthly (multiply by 4.2)
          setMonthlyPredictedSales((fetchedSchedule.predicted_weekly_sales || 0) * 4.2);
          // Load saved position order if exists
          if (fetchedSchedule.position_order && fetchedSchedule.position_order.length > 0) {
            // Merge saved order with any new positions
            const newPositionIds = positions.map(p => p.id).filter(id => !fetchedSchedule.position_order.includes(id));
            setPositionOrder([...fetchedSchedule.position_order, ...newPositionIds]);
          } else {
            setPositionOrder(positions.map(p => p.id));
          }
        } else {
          setSchedule(null);
          setMonthlyPredictedSales(0);
          setPositionOrder(positions.map(p => p.id));
          loadDefaultTemplate();
        }
      } catch (error) {
        console.error("Error loading schedule or user:", error);
        toast.error(t("error_loading_schedule"));
      } finally {
        lastSavedDataRef.current = null;
        setLoading(false);
      }
    };

    fetchScheduleAndUser(); 
    loadTemplates();
  }, [weekStartDate, t, language, workers, positions]);

  // Offline sync for schedules
  useEffect(() => {
    const processor = async (item) => {
      const { action, payload } = item || {};
      if (!payload?.data) return;
      let saved;
      if (action === 'update_schedule' && payload.id) {
        saved = await base44.entities.WeeklySchedule.update(payload.id, payload.data);
      } else if (action === 'create_schedule') {
        saved = await base44.entities.WeeklySchedule.create(payload.data);
      }
      if (saved) {
        setSchedule(saved);
        if (typeof onScheduleSaved === 'function') onScheduleSaved();
      }
    };
    return offlineQueue.onOnline('schedules', processor);
  }, [weekStartDate]);

  const loadTemplates = async () => {
    try {
      const user = currentUser || await base44.auth.me();
      setCurrentUser(user);
      const effectiveEmail = user.acting_as_user_email || user.acting_as_store_email || user.email;
      const templatesData = await base44.entities.ScheduleTemplate.filter({ created_by: effectiveEmail }, "template_name");
      setTemplates(templatesData);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error(t("error_loading_templates"));
    }
  };

  const loadDefaultTemplate = async () => {
    try {
      const user = currentUser || await base44.auth.me();
      setCurrentUser(user);
      const effectiveEmail = user.acting_as_user_email || user.acting_as_store_email || user.email;
      const defaultTemplate = await base44.entities.ScheduleTemplate.filter({ 
        created_by: effectiveEmail,
        is_default: true 
      });
      
      if (defaultTemplate.length > 0) {
        applyTemplateShifts(defaultTemplate[0]);
      }
    } catch (error) {
      console.error("Error loading default template:", error);
    }
  };

  const applyTemplateShifts = (template) => {
    const loadedShifts = template.shifts.map(s => {
      const dayIndex = days.findIndex(d => d.key === s.day);
      const shiftDate = moment(weekStartDate).day(dayIndex).format('YYYY-MM-DD');
      
      let basePayment = s.base_payment;
      let paymentForShift = s.payment_for_shift;
      
      // Recalculate payment to ensure up-to-date worker rates
      const worker = workers.find(w => w.id === s.worker_id);
      if (worker) {
        const calc = calculatePayment(worker, s.hours_worked, s.overtime_rate, s.job_position_id);
        basePayment = calc.basePayment;
        paymentForShift = calc.totalPayment;
      }

      return {
        ...s,
        date: shiftDate,
        base_payment: basePayment,
        payment_for_shift: paymentForShift,
        id: undefined
      };
    });

    setSchedule({
      ...schedule,
      shifts: loadedShifts,
      total_hours: calculateTotals().totalHours,
      total_cost: calculateTotals().totalCost,
      labor_cost_percentage: calculateTotals().laborPercentage
    });
    toast.success(t('template_loaded_successfully'));
  };

  const handleCellDoubleClick = (dayKey, dateStr, positionId, rowId) => {
    const position = positions.find(p => p.id === positionId);
    let defaultStartTime = position?.default_start_time || "09:00";
      let defaultEndTime = position?.default_end_time || "17:00";
      if (rowId) {
        const row = (schedule?.position_rows || []).find(r => r.row_id === rowId);
        const perDay = row?.per_day_times?.[dayKey];
        if (perDay?.start) defaultStartTime = perDay.start;
        if (perDay?.end) defaultEndTime = perDay.end;
        if (!perDay && row?.default_start_time) defaultStartTime = row.default_start_time;
        if (!perDay && row?.default_end_time) defaultEndTime = row.default_end_time;
      }
    
    setSelectedCell({ day: dayKey, date: dateStr, positionId: positionId, rowId });
    setEditingShift({
      day: dayKey,
      date: dateStr,
      worker_id: "",
      worker_name: "",
      job_position_id: positionId,
      job_position: position?.name || "",
      start_time: defaultStartTime,
      end_time: defaultEndTime,
      hours_worked: calculateHours(defaultStartTime, defaultEndTime),
      overtime_rate: "regular", // Default to regular 100%
      payment_for_shift: 0,
      base_payment: 0,
      notes: ""
    });
    setShowShiftDialog(true);
  };

  const handleWorkerChange = (workerId) => {
            const worker = workers.find(w => w.id === workerId);
            if (!worker) {
              setEditingShift({
                ...editingShift,
                worker_id: "",
                worker_name: "",
                base_payment: 0,
                payment_for_shift: 0
              });
              return;
            }

            const effectiveRate = 'regular'; // overtime selection removed; fixed at 100%
            
            const { basePayment, totalPayment } = calculatePayment(worker, editingShift.hours_worked, effectiveRate, editingShift.job_position_id);

            setEditingShift({
              ...editingShift,
              worker_id: workerId,
              worker_name: worker.full_name,
              overtime_rate: effectiveRate, // Update to effective rate
              base_payment: basePayment,
              payment_for_shift: totalPayment
            });
          };

  const handleTimeChange = (field, value) => {
            const newStartTime = field === 'start_time' ? value : editingShift.start_time;
            const newEndTime = field === 'end_time' ? value : editingShift.end_time;
            const hours = calculateHours(newStartTime, newEndTime);

            const worker = workers.find(w => w.id === editingShift.worker_id);
            const effectiveRate = 'regular'; // overtime selection removed; fixed at 100%
            
            const { basePayment, totalPayment } = calculatePayment(worker, hours, effectiveRate, editingShift.job_position_id);

            setEditingShift({
              ...editingShift,
              [field]: value,
              hours_worked: hours,
              overtime_rate: effectiveRate, // Update to effective rate
              base_payment: basePayment,
              payment_for_shift: totalPayment
            });
          };

  const checkForDoubleShift = (workerId, dayKey, currentShiftId) => {
    // Check if this worker already has a shift on the same day (in any position)
    const existingShiftsForWorkerOnDay = (schedule?.shifts || []).filter(s => 
      s.worker_id === workerId && 
      s.day === dayKey &&
      s.id !== currentShiftId // Exclude the current shift being edited
    );
    return existingShiftsForWorkerOnDay;
  };

  const handleShiftSave = () => {
    if (!editingShift.worker_id || !editingShift.job_position_id || !editingShift.start_time || !editingShift.end_time) {
      toast.error(t('all_shift_fields_required'));
      return;
    }

    const worker = workers.find(w => w.id === editingShift.worker_id);
    if (!worker) {
      toast.error(t('worker_not_found'));
      return;
    }

    const position = positions.find(p => p.id === editingShift.job_position_id);
    if (!position) {
        toast.error(t('position_not_found'));
        return;
    }

    // Check for double shift on the same day
    const existingShifts = checkForDoubleShift(editingShift.worker_id, selectedCell.day, editingShift.id);
    
    if (existingShifts.length > 0 && !pendingShiftSave) {
      // Worker already has a shift on this day - show warning
      setPendingShiftSave({
        worker,
        position,
        existingShifts
      });
      setShowDoubleShiftWarning(true);
      return;
    }

    // Proceed with saving
    saveShiftToSchedule(worker, position);
  };

  const saveShiftToSchedule = (worker, position) => {
    const updatedShift = {
      ...editingShift,
      worker_name: worker.full_name,
      job_position: position.name,
      date: selectedCell.date,
      day: selectedCell.day,
      id: editingShift.id || undefined,
      position_row_id: selectedCell?.rowId || editingShift.position_row_id 
    };

    const prevKey = editingShift.__originalKey;
    let updatedShifts;
    if (editingShift.id) {
      updatedShifts = (schedule?.shifts || []).map(s => s.id === editingShift.id ? updatedShift : s);
    } else if (prevKey) {
      let replaced = false;
      updatedShifts = (schedule?.shifts || []).map(s => {
        if (!replaced && getShiftDraggableId(s) === prevKey) { replaced = true; return updatedShift; }
        return s;
      });
      if (!replaced) {
        updatedShifts = [...updatedShifts, updatedShift];
      }
    } else {
      updatedShifts = [...(schedule?.shifts || []), updatedShift];
    }
    setSchedule({ ...schedule, shifts: updatedShifts });
    setShowShiftDialog(false);
    setEditingShift(null);
    setSelectedCell(null);
    setPendingShiftSave(null);
    setShowDoubleShiftWarning(false);
  };

  const handleConfirmDoubleShift = () => {
    if (pendingShiftSave) {
      saveShiftToSchedule(pendingShiftSave.worker, pendingShiftSave.position);
    }
  };

  const handleCancelDoubleShift = () => {
    setPendingShiftSave(null);
    setShowDoubleShiftWarning(false);
  };

  const handleShiftDelete = () => {
    if (!editingShift) {
      return;
    }

    const confirmMessage = language === 'he' 
      ? `האם אתה בטוח שברצונך למחוק את המשמרת של ${editingShift.worker_name}?`
      : `Are you sure you want to delete ${editingShift.worker_name}'s shift?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // If editing existing shift with ID, filter it out
    if (editingShift.id) {
      const updatedShifts = (schedule?.shifts || []).filter(s => s.id !== editingShift.id);
      setSchedule({ ...schedule, shifts: updatedShifts });
    } else {
      // If it's a new shift (no ID yet), find and remove by matching properties
      // This is a robust way to remove a newly added shift from state if it hasn't been saved yet.
      const updatedShifts = (schedule?.shifts || []).filter(s => 
        !(s.day === editingShift.day && 
          s.date === editingShift.date && 
          s.worker_id === editingShift.worker_id &&
          s.job_position_id === editingShift.job_position_id &&
          s.start_time === editingShift.start_time &&
          s.end_time === editingShift.end_time)
      );
      setSchedule({ ...schedule, shifts: updatedShifts });
    }

    setShowShiftDialog(false);
    setEditingShift(null);
    setSelectedCell(null);
  };

  const handlePublishSchedule = async () => {
    setSaving(true);
    try {
      const weekNumber = moment(weekStartDate).week();
      const year = moment(weekStartDate).year();
      const { totalHours, totalCostWithEmployer, laborPercentage } = calculateTotals();
      
      const scheduleData = {
        week_start_date: moment(weekStartDate).format('YYYY-MM-DD'),
        week_number: String(weekNumber),
        year: String(year),
        predicted_weekly_sales: monthlyPredictedSales / 4.2,
        shifts: schedule?.shifts || [],
        position_rows: schedule?.position_rows || [],
        total_hours: totalHours,
        total_cost: totalCostWithEmployer,
        labor_cost_percentage: laborPercentage,
        position_order: positionOrder,
        status: 'published'
      };

      console.log("Publishing schedule:", scheduleData);

      if (!navigator.onLine) {
        offlineQueue.enqueue('schedules', { action: schedule && schedule.id ? 'update_schedule' : 'create_schedule', payload: { id: schedule?.id, data: scheduleData } });
        setSchedule({ ...(schedule || {}), ...scheduleData, id: schedule?.id, __offline: true });
        toast.success(language === 'he' ? 'נשמר ללא אינטרנט - יפורסם אוטומטית' : 'Saved offline — will be published automatically');
        setSaving(false);
        return { ...schedule, ...scheduleData };
      }

      const user = currentUser || await base44.auth.me();
      let savedSchedule;
      if (schedule && schedule.id) {
        savedSchedule = await base44.entities.WeeklySchedule.update(schedule.id, scheduleData);
        toast.success(language === 'he' ? 'הסידור פורסם בהצלחה' : 'Schedule published successfully');
      } else {
        scheduleData.created_by = user.email;
        savedSchedule = await base44.entities.WeeklySchedule.create(scheduleData);
        toast.success(language === 'he' ? 'הסידור פורסם בהצלחה' : 'Schedule published successfully');
      }
      
      lastSavedDataRef.current = JSON.stringify({
        shifts: savedSchedule.shifts || [],
        position_rows: savedSchedule.position_rows || [],
        position_order: savedSchedule.position_order || [],
        monthlyPredictedSales: (savedSchedule.predicted_weekly_sales || 0) * 4.2
      });

      console.log("Schedule published:", savedSchedule);
      setSchedule(savedSchedule); 
      onScheduleSaved(); 
      return savedSchedule;
    } catch (error) {
      console.error('Error publishing schedule:', error);
      toast.error((language === 'he' ? 'שגיאה בפרסום' : 'Error publishing') + ": " + (error.message || "Unknown error"));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleCopyToNextWeek = async () => {
    if (!schedule || schedule.shifts.length === 0) {
      toast.info(t('no_shifts_to_copy'));
      return;
    }
    if (!confirm(t('confirm_copy_to_next_week'))) {
      return;
    }

    setSaving(true);
    try {
      const nextWeekStart = moment(weekStartDate).add(1, 'week').startOf('week');
      const nextWeekNumber = nextWeekStart.week();
      const nextWeekYear = nextWeekStart.year();

      const existingNextWeekSchedule = await base44.entities.WeeklySchedule.filter({
        week_number: String(nextWeekNumber), // Convert to string
        year: String(nextWeekYear) // Convert to string
      });

      if (existingNextWeekSchedule && existingNextWeekSchedule.length > 0) {
        toast.error(t('schedule_already_exists_for_next_week'));
        setSaving(false);
        return;
      }

      const copiedShifts = schedule.shifts.map(shift => {
        const originalShiftDate = moment(shift.date);
        const nextWeekShiftDate = originalShiftDate.add(1, 'week').format('YYYY-MM-DD');

        let basePayment = shift.base_payment;
        let paymentForShift = shift.payment_for_shift;
        
        // Recalculate payment to ensure up-to-date worker rates
        const worker = workers.find(w => w.id === shift.worker_id);
        if (worker) {
          const calc = calculatePayment(worker, shift.hours_worked, shift.overtime_rate, shift.job_position_id);
          basePayment = calc.basePayment;
          paymentForShift = calc.totalPayment;
        }

        return {
          ...shift,
          date: nextWeekShiftDate,
          base_payment: basePayment,
          payment_for_shift: paymentForShift,
          id: undefined
        };
      });

      const user = currentUser || await base44.auth.me();

      const scheduleData = {
        week_start_date: nextWeekStart.format('YYYY-MM-DD'),
        week_number: String(nextWeekNumber),
        year: String(nextWeekYear),
        predicted_weekly_sales: monthlyPredictedSales / 4.2,
        shifts: copiedShifts,
        position_rows: schedule?.position_rows || [],
        total_hours: calculateTotals().totalHours,
        total_cost: calculateTotals().totalCost,
        labor_cost_percentage: calculateTotals().laborPercentage,
        status: 'draft',
        created_by: user.email
      };

      await base44.entities.WeeklySchedule.create(scheduleData);
      toast.success(t('schedule_copied_to_next_week_successfully'));
      onScheduleSaved(); 
    } catch (error) {
      console.error('Error copying to next week:', error);
      toast.error(`${t('error_copying_schedule')}: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsTemplate = async (setAsDefault = false) => {
    if (!schedule || schedule.shifts.length === 0) {
      toast.info(t('no_shifts_to_save_as_template'));
      return;
    }
    if (!templateName.trim()) {
      toast.error(t('template_name_required'));
      return;
    }

    setSaving(true); 
    try {
      const user = currentUser || await base44.auth.me();

      if (setAsDefault) {
        const existingDefaultTemplates = await base44.entities.ScheduleTemplate.filter({
          created_by: user.email,
          is_default: true
        });
        for (const tmpl of existingDefaultTemplates) {
          await base44.entities.ScheduleTemplate.update(tmpl.id, { is_default: false });
        }
      }

      const templateShifts = schedule.shifts.map(s => ({
        day: s.day,
        job_position_id: s.job_position_id,
        job_position: s.job_position,
        worker_id: s.worker_id,
        worker_name: s.worker_name,
        start_time: s.start_time,
        end_time: s.end_time,
        hours_worked: s.hours_worked,
        overtime_rate: s.overtime_rate,
        base_payment: s.base_payment,
        payment_for_shift: s.payment_for_shift,
        notes: s.notes || ''
      }));

      await base44.entities.ScheduleTemplate.create({
        template_name: templateName,
        shifts: templateShifts,
        is_default: setAsDefault,
        created_by: user.email
      });

      toast.success(t('template_saved_successfully'));
      setShowTemplateDialog(false);
      setTemplateName('');
      await loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(t('error_saving_template'));
    } finally {
      setSaving(false);
    }
  };

  const handleLoadTemplate = async () => {
    if (!selectedTemplate) {
      toast.info(t('select_template_to_load'));
      return;
    }
    setSaving(true); 
    try {
      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) {
        toast.error(t('template_not_found'));
        return;
      }
      
      applyTemplateShifts(template);
      setShowTemplateDialog(false);
      setSelectedTemplate("");
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error(t('error_loading_template'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm(t('confirm_delete_template'))) return;

    try {
      await base44.entities.ScheduleTemplate.delete(templateId);
      toast.success(t('template_deleted_successfully'));
      await loadTemplates();
      setSelectedTemplate("");
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error(t('error_deleting_template'));
    }
  };

  const handleClearSchedule = async () => {
    const confirmMessage = language === 'he'
      ? 'האם אתה בטוח שברצונך למחוק את כל המשמרות בשבוע זה? פעולה זו לא ניתנת לביטול!'
      : 'Are you sure you want to clear all shifts for this week? This action cannot be undone!';
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const weekNumber = moment(weekStartDate).week();
      const year = moment(weekStartDate).year();

      const user = currentUser || await base44.auth.me();
      setCurrentUser(user);
      const effectiveEmail = user.acting_as_user_email || user.acting_as_store_email || user.email;

      const schedulesRes = await base44.entities.WeeklySchedule.filter({ 
        week_number: String(weekNumber),
        year: String(year),
        created_by: effectiveEmail
      });

      if (schedulesRes && schedulesRes.length > 0) {
        const scheduleToDelete = schedulesRes[0];
        
        await base44.entities.WeeklySchedule.update(scheduleToDelete.id, {
          shifts: [],
          total_hours: 0,
          total_cost: 0,
          labor_cost_percentage: 0,
          predicted_weekly_sales: 0 // Reset predicted sales on clear
        });
        
        toast.success(language === 'he' ? 'לוח המשמרות נוקה בהצלחה' : 'Schedule cleared successfully');
      } else {
        toast.info(language === 'he' ? 'אין משמרות לשבוע זה' : 'No schedule exists for this week');
      }
      
      // Clear local state
      setSchedule(null);
      setMonthlyPredictedSales(0);
      
      onScheduleSaved();
      
    } catch (error) {
      console.error('Error clearing schedule:', error);
      toast.error(language === 'he' ? 'שגיאה בניקוי לוח המשמרות' : 'Error clearing schedule');
    }
  };

  const handleCopyDayToWeek = (sourceDayKey) => {
    const confirmMessage = language === 'he'
      ? `האם להעתיק את כל המשמרות מיום ${days.find(d => d.key === sourceDayKey).label} לכל ימי השבוע?`
      : `Copy all shifts from ${days.find(d => d.key === sourceDayKey).label} to all days of the week?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    const sourceDayShifts = (schedule?.shifts || []).filter(s => s.day === sourceDayKey);

    if (sourceDayShifts.length === 0) {
      toast.info(language === 'he' ? 'אין משמרות ליום זה' : 'No shifts for this day');
      return;
    }

    const newShifts = [];
    
    days.forEach(day => {
      const dayDate = moment(weekStartDate).day(days.indexOf(day)).format('YYYY-MM-DD');
      
      sourceDayShifts.forEach(sourceShift => {
        newShifts.push({
          ...sourceShift,
          day: day.key,
          date: dayDate,
          id: undefined
        });
      });
    });

    setSchedule({
      ...schedule,
      shifts: newShifts
    });

    toast.success(language === 'he' 
      ? `המשמרות מיום ${days.find(d => d.key === sourceDayKey).label} הועתקו לכל השבוע`
      : `Shifts from ${days.find(d => d.key === sourceDayKey).label} copied to all week`);
  };

  // Position rows helpers
  const getRowsForPosition = (positionId) => (schedule?.position_rows || []).filter(r => r.position_id === positionId);
  const addPositionRow = (positionId, label) => {
    const row = { row_id: `${positionId}-${Date.now()}`, position_id: positionId, label: label || (language === 'he' ? 'שורה חדשה' : 'New row'), default_start_time: '', default_end_time: '', per_day_times: {} };
    const next = { ...(schedule || {}), position_rows: [...(schedule?.position_rows || []), row] };
    setSchedule(next);
  };
  const openRowTimeDialog = (row) => { setEditingRow(row); setRowTime({ start: row.default_start_time || '', end: row.default_end_time || '', mode: 'all', dayFrom: 'sunday', dayTo: 'saturday' }); setShowRowTimeDialog(true); };
  const applyRowTimes = (cfg) => {
    const daysOrder = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const updated = (schedule?.position_rows || []).map(r => {
      if (!editingRow || r.row_id !== editingRow.row_id) return r;
      const next = { ...r };
      if (cfg.mode === 'all') {
        next.default_start_time = cfg.start;
        next.default_end_time = cfg.end;
        next.per_day_times = {};
        daysOrder.forEach(d => { next.per_day_times[d] = { start: cfg.start, end: cfg.end }; });
      } else {
        next.per_day_times = next.per_day_times || {};
        const fromIdx = daysOrder.indexOf(cfg.dayFrom);
        const toIdx = daysOrder.indexOf(cfg.dayTo);
        const [a,b] = fromIdx <= toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        daysOrder.slice(a, b+1).forEach(d => { next.per_day_times[d] = { start: cfg.start, end: cfg.end }; });
      }
      return next;
    });
    setSchedule({ ...(schedule || {}), position_rows: updated });
  };

  const removePositionRow = (rowId) => {
    const confirmMessage = language === 'he'
      ? 'למחוק את שורת התפקיד וכל המשמרות השייכות לה?'
      : 'Delete this position row and all its shifts?';
    if (!window.confirm(confirmMessage)) return;

    const nextRows = (schedule?.position_rows || []).filter(r => r.row_id !== rowId);
    const nextShifts = (schedule?.shifts || []).filter(s => s.position_row_id !== rowId);
    setSchedule({ ...(schedule || {}), position_rows: nextRows, shifts: nextShifts });
    toast.success(language === 'he' ? 'השורה נמחקה' : 'Row deleted');
  };

  const handleDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Positions reorder
    if (type === 'POSITION') {
      const newOrder = Array.from(positionOrder);
      const [moved] = newOrder.splice(source.index, 1);
      newOrder.splice(destination.index, 0, moved);
      setPositionOrder(newOrder);
      return;
    }

    // Shifts: reorder within cell or move across cells
    const parse = (id) => {
      const [day, positionId, rowRaw] = id.split('|');
      return { day, positionId, rowId: rowRaw && rowRaw !== 'default' ? rowRaw : undefined };
    };
    const src = parse(source.droppableId);
    const dst = parse(destination.droppableId);

    const matchCell = (s, cell) => (
      s.day === cell.day &&
      s.job_position_id === cell.positionId &&
      ((cell.rowId && s.position_row_id === cell.rowId) || (!cell.rowId && !s.position_row_id))
    );

    const list = (schedule?.shifts || []);
    const srcIndices = list.map((s, i) => ({ s, i })).filter(({ s }) => matchCell(s, src)).map(({ i }) => i);
    if (srcIndices.length <= source.index) return;
    const from = srcIndices[source.index];

    const newShifts = [...list];
    const movedOriginal = newShifts[from];
    if (!movedOriginal) return;
    newShifts.splice(from, 1);

    let updated = { ...movedOriginal };
    if (src.day !== dst.day || src.positionId !== dst.positionId || src.rowId !== dst.rowId) {
      const destDateStr = moment(weekStartDate).day(days.findIndex(d => d.key === dst.day)).format('YYYY-MM-DD');
      const destPosition = positions.find(p => p.id === dst.positionId);
      
      let newPaymentForShift = updated.payment_for_shift;
      let newBasePayment = updated.base_payment;
      
      // If position changed, recalculate payment
      if (src.positionId !== dst.positionId) {
        const worker = workers.find(w => w.id === updated.worker_id);
        if (worker) {
          const { basePayment, totalPayment } = calculatePayment(worker, updated.hours_worked, updated.overtime_rate, dst.positionId);
          newBasePayment = basePayment;
          newPaymentForShift = totalPayment;
        }
      }

      updated = {
        ...updated,
        day: dst.day,
        date: destDateStr,
        job_position_id: dst.positionId,
        job_position: destPosition?.name || updated.job_position,
        position_row_id: dst.rowId,
        base_payment: newBasePayment,
        payment_for_shift: newPaymentForShift
      };
    }

    const destIndices = newShifts.map((s, i) => ({ s, i })).filter(({ s }) => matchCell(s, dst)).map(({ i }) => i);
    let to = destIndices[destination.index];
    if (typeof to !== 'number') {
      to = destIndices.length > 0 ? destIndices[destIndices.length - 1] + 1 : newShifts.length;
    }
    if (to > newShifts.length) to = newShifts.length;
    newShifts.splice(to, 0, updated);

    setSchedule({ ...schedule, shifts: newShifts });
  };

  const handleDownloadJPG = async () => {
    const element = scheduleTableRef.current;
    if (!element) return;

    try {
      toast.info(language === 'he' ? 'מכין תמונה...' : 'Preparing image...');
      const costElements = element.querySelectorAll('.shift-cost');
      costElements.forEach(el => el.style.display = 'none');
      
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        windowWidth: 1920,
        windowHeight: 1080
      });
      
      costElements.forEach(el => el.style.display = '');
      
      const image = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = image;
      link.download = 'AJ.jpg';
      link.click();
      
      toast.success(language === 'he' ? 'הלוח הורד בהצלחה' : 'Schedule downloaded successfully');
    } catch (error) {
      toast.error(language === 'he' ? 'שגיאה בהורדת התמונה' : 'Error downloading image');
      const costElements = element.querySelectorAll('.shift-cost');
      costElements.forEach(el => el.style.display = '');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const { totalHours, totalBaseCost, totalCostWithEmployer, laborPercentage, weeklyPredictedSalesWithVAT, weeklyPredictedSalesWithoutVAT } = calculateTotals();

  const workerShiftCounts = workers.map(worker => {
    const shiftCount = (schedule?.shifts || []).filter(s => s.worker_id === worker.id).length;
    return {
      id: worker.id,
      name: worker.full_name,
      count: shiftCount
    };
  }).filter(w => w.count > 0).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div className={`${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader>
          <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CardTitle className={`text-xl md:text-2xl font-bold flex items-center flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Calendar className="w-5 h-5 shrink-0 mr-2 rtl:ml-2 rtl:mr-0" />
              <span>{t('weekly_schedule')} - {moment(weekStartDate).format('DD/MM/YYYY')}</span>
              {schedule?.status === 'draft' && (
                <Badge variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-200 ml-2 rtl:mr-2 rtl:ml-0">
                  {language === 'he' ? 'טיוטה' : 'Draft'}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className={`text-sm font-semibold text-green-800 ${isRTL ? 'text-right block' : 'text-left block'}`}>
                  {language === 'he' ? 'מכירות חודשיות (כולל מע"מ)' : 'Monthly Sales (incl. VAT)'}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={monthlyPredictedSales}
                  onChange={(e) => setMonthlyPredictedSales(parseFloat(e.target.value) || 0)}
                  className="text-lg font-bold"
                  placeholder="0"
                />
              </div>

              <div className="space-y-1">
                <Label className={`text-sm text-gray-600 ${isRTL ? 'text-right block' : 'text-left block'}`}>
                  {language === 'he' ? 'מכירות שבועיות (כולל מע״מ)' : 'Weekly Sales (incl. VAT)'}
                </Label>
                <div className={`text-xl font-bold text-green-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {formatCurrency(weeklyPredictedSalesWithVAT)}
                </div>
                <p className={`text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'he' ? 'חודשי / 4.2 שבועות' : 'Monthly / 4.2 weeks'}
                </p>
              </div>

              <div className="space-y-1">
                <Label className={`text-sm text-gray-600 ${isRTL ? 'text-right block' : 'text-left block'}`}>
                  {language === 'he' ? 'מכירות שבועיות (ללא מע״מ)' : 'Weekly Sales (excl. VAT)'}
                </Label>
                <div className={`text-xl font-bold text-green-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {formatCurrency(weeklyPredictedSalesWithoutVAT)}
                </div>
                <p className={`text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'he' ? 'בסיס לחישוב אחוז עלות עבודה' : 'Base for labor cost %'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
            <div className="space-y-1">
              <Label className={`text-sm text-gray-600 ${isRTL ? 'text-right block' : 'text-left block'}`}>
                {t('total_hours')}
              </Label>
              <div className={`text-2xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
                {totalHours.toFixed(1)} {t('hrs')}
              </div>
            </div>

            <div className="space-y-1">
              <Label className={`text-sm text-gray-600 ${isRTL ? 'text-right block' : 'text-left block'}`}>
                {t('total_labor_cost')}
              </Label>
              <div className={`text-2xl font-bold text-blue-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                {formatCurrency(totalCostWithEmployer)}
              </div>
              <p className={`text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? `כולל תוספות ניהול יחסיות לשבוע זה` : `Includes proportional management bonuses for this week`}
              </p>
            </div>

            <div className="space-y-1">
                <Label className={`text-sm text-gray-600 ${isRTL ? 'text-right block' : 'text-left block'}`}>
                  {t('weekly_labor_cost_percentage')}
                </Label>
              <div className={`text-2xl font-bold ${laborPercentage > 30 ? 'text-red-600' : 'text-green-600'} ${isRTL ? 'text-right' : 'text-left'}`}>
                {laborPercentage.toFixed(1)}%
              </div>
              <p className={`text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'עלות עבודה / מכירות (ללא מע״מ)' : 'Labor Cost / Sales (excl. VAT)'}
              </p>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-3">
            <div className={`text-[12px] font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
              {language === 'he' ? 'מספר משמרות לכל עובד' : 'Shifts per worker'}
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {workerShiftCounts.length > 0 ? (
                workerShiftCounts.map(w => (
                  <div key={w.id} className="min-w-[120px] bg-gray-50 border border-gray-200 rounded-md p-2">
                    <div className="font-semibold text-[11px] truncate">{w.name}</div>
                    <div className="text-[11px] text-gray-600">
                      {language === 'he' ? `${w.count} משמרות` : `${w.count} shifts`}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-gray-500">
                  {language === 'he' ? 'אין משמרות לשבוע זה' : 'No shifts this week'}
                </div>
              )}
            </div>
          </div>

          <div className={`flex gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button onClick={() => setShowTemplateDialog(true)} variant="outline" size="sm" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <FileText className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('manage_templates')}
            </Button>
            <Button onClick={handleDownloadJPG} variant="outline" size="sm" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Download className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'הורד AJ.jpg' : 'Download AJ.jpg'}
            </Button>
            <Button onClick={handleCopyToNextWeek} variant="outline" size="sm" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} disabled={!schedule?.shifts?.length}>
              <Copy className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('copy_to_next_week')}
            </Button>
            <Button onClick={handleClearSchedule} variant="outline" size="sm" className={`flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 ${isRTL ? 'flex-row-reverse' : ''}`} disabled={!schedule?.shifts?.length && !schedule?.id}>
              <X className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'נקה לוח משמרות' : 'Clear Schedule'}
            </Button>
            <Button onClick={handlePublishSchedule} className={`bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} disabled={saving || isAutoSaving}>
              {saving || isAutoSaving ? (
                <Loader className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              )}
              {language === 'he' 
                ? (schedule?.status === 'published' ? 'עדכן סידור מפורסם' : 'פרסם סידור עבודה') 
                : (schedule?.status === 'published' ? 'Update Published' : 'Publish Schedule')}
            </Button>
            {isAutoSaving && (
              <span className={`text-xs text-gray-400 flex items-center ${isRTL ? 'mr-2' : 'ml-2'}`}>
                {language === 'he' ? 'שומר שינויים...' : 'Saving changes...'}
              </span>
            )}
          </div>

          <div className={`text-sm text-gray-600 bg-blue-50 p-3 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
            <strong>{t('tip')}:</strong> {t('shift_duplicate_tip')}
          </div>

          <WeeklyScheduleTable
            schedule={schedule} setSchedule={setSchedule} positions={positions} positionOrder={positionOrder}
            days={days} weekStartDate={weekStartDate} isDraggingShift={isDraggingShift} setIsDraggingShift={setIsDraggingShift}
            handleDragEnd={handleDragEnd} hexToRgba={hexToRgba} t={t} language={language} isRTL={isRTL}
            addPositionRow={addPositionRow} openRowTimeDialog={openRowTimeDialog} removePositionRow={removePositionRow}
            handleCellDoubleClick={handleCellDoubleClick} getShiftDraggableId={getShiftDraggableId} setEditingShift={setEditingShift}
            setSelectedCell={setSelectedCell} setShowShiftDialog={setShowShiftDialog} formatCurrency={formatCurrency}
            scheduleTableRef={scheduleTableRef}
          />
        </CardContent>
      </Card>

      <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
        <DialogContent className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
              {editingShift?.id ? t('edit_shift') : t('add_shift')}
            </DialogTitle>
          </DialogHeader>
          
          {editingShift && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="worker_id" className={isRTL ? 'text-right block' : 'text-left block'}>
                  {t('worker')} *
                </Label>
                <Select value={editingShift.worker_id} onValueChange={handleWorkerChange}>
                  <SelectTrigger id="worker_id" className={isRTL ? 'text-right' : 'text-left'}>
                    <SelectValue placeholder={t('select_worker')} />
                  </SelectTrigger>
                  <SelectContent>
                    {workers
                      .filter(w => w.job_position_id === editingShift.job_position_id || w.secondary_job_position_id === editingShift.job_position_id || (w.job_position_ids || []).includes(editingShift.job_position_id))
                      .map(worker => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.full_name}
                          <span className="text-xs text-gray-500 ml-2">
                            ({t(worker.payment_type)}: {worker.payment_amount} {t('currency_ILS')})
                          </span>
                        </SelectItem>
                    ))}
                    {workers.filter(w => w.job_position_id !== editingShift.job_position_id && w.secondary_job_position_id !== editingShift.job_position_id && !(w.job_position_ids || []).includes(editingShift.job_position_id)).length > 0 && (
                      <div className="px-2 py-1 text-xs text-gray-400 border-t mt-1 pt-1">
                        {language === 'he' ? '── עובדים אחרים ──' : '── Other Workers ──'}
                      </div>
                    )}
                    {workers
                      .filter(w => w.job_position_id !== editingShift.job_position_id && w.secondary_job_position_id !== editingShift.job_position_id && !(w.job_position_ids || []).includes(editingShift.job_position_id))
                      .map(worker => (
                        <SelectItem key={worker.id} value={worker.id} className="text-gray-500">
                          {worker.full_name}
                          <span className="text-xs text-gray-400 ml-2">
                            ({worker.job_position_name})
                          </span>
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time" className={isRTL ? 'text-right block' : 'text-left block'}>{t('start')} *</Label>
                  <Input id="start_time" type="time" value={editingShift.start_time} onChange={(e) => handleTimeChange('start_time', e.target.value)} className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'} />
                </div>
                <div>
                  <Label htmlFor="end_time" className={isRTL ? 'text-right block' : 'text-left block'}>{t('end')} *</Label>
                  <Input id="end_time" type="time" value={editingShift.end_time} onChange={(e) => handleTimeChange('end_time', e.target.value)} className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'} />
                </div>
              </div>

              <div className={`bg-blue-50 p-3 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="text-sm space-y-1">
                  <div><strong>{t('hours')}:</strong> {editingShift.hours_worked?.toFixed(1)}</div>
                  {editingShift.base_payment > 0 && (
                    <>
                      <div><strong>{t('base_payment')}:</strong> {editingShift.base_payment.toFixed(2)} {t('currency_ILS')}</div>
                      <div className="text-xs text-gray-600">
                        {editingShift.overtime_rate === '150' ? (t('overtime_150_note') || '150% allowed only Friday 18:00+ and Saturday') : null}
                      </div>
                      <div className="text-lg font-bold text-blue-700">
                        <strong>{t('total')}:</strong> {(editingShift.payment_for_shift || 0).toFixed(2)} {t('currency_ILS')}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className={isRTL ? 'text-right block' : 'text-left block'}>{t('notes')}</Label>
                <Input id="notes" value={editingShift.notes || ''} onChange={(e) => setEditingShift({...editingShift, notes: e.target.value})} placeholder={t('notes')} className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'} />
              </div>
            </div>
          )}
          
          <DialogFooter className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2 justify-end mt-4`}>
            <Button type="button" variant="outline" onClick={() => { setShowShiftDialog(false); setEditingShift(null); setSelectedCell(null); }}>{t('cancel')}</Button>
            {editingShift && (
              <Button type="button" variant="destructive" onClick={handleShiftDelete} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Trash2 className="w-4 h-4" />{t('delete')}
              </Button>
            )}
            <Button type="submit" onClick={handleShiftSave} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Save className="w-4 h-4" />{t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDoubleShiftWarning} onOpenChange={setShowDoubleShiftWarning}>
        <DialogContent className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 text-orange-600 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <AlertTriangle className="w-5 h-5" />{language === 'he' ? 'אזהרת משמרת כפולה' : 'Double Shift Warning'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className={`bg-orange-50 border border-orange-200 rounded-lg p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-orange-800 font-medium mb-2">{language === 'he' ? `לעובד ${pendingShiftSave?.worker?.full_name} כבר יש משמרת ביום זה:` : `${pendingShiftSave?.worker?.full_name} already has a shift on this day:`}</p>
              <div className="space-y-2">
                {pendingShiftSave?.existingShifts?.map((shift, idx) => (
                  <div key={idx} className="bg-white rounded p-2 border border-orange-100">
                    <span className="font-medium">{shift.job_position}</span><span className="text-gray-600 mx-2">|</span><span>{shift.start_time} - {shift.end_time}</span>
                  </div>
                ))}
              </div>
              <p className="text-orange-700 mt-3">{language === 'he' ? `האם ברצונך להוסיף משמרת נוספת בתפקיד ${pendingShiftSave?.position?.name}?` : `Do you want to add another shift as ${pendingShiftSave?.position?.name}?`}</p>
            </div>
          </div>
          
          <DialogFooter className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2 justify-end mt-4`}>
            <Button type="button" variant="outline" onClick={handleCancelDoubleShift}>{t('cancel')}</Button>
            <Button type="button" onClick={handleConfirmDoubleShift} className="bg-orange-600 hover:bg-orange-700">{language === 'he' ? 'כן, הוסף משמרת' : 'Yes, Add Shift'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RowTimeDialog open={showRowTimeDialog} onClose={() => setShowRowTimeDialog(false)} initial={rowTime} onApply={(cfg) => { setShowRowTimeDialog(false); applyRowTimes(cfg); }} isRTL={isRTL} language={language} />

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader><DialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t('manage_templates')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <h3 className="font-semibold">{t('save_current_as_template')}</h3>
            <div className="space-y-2"><Label htmlFor="template_name_input" className={isRTL ? 'text-right block' : 'text-left block'}>{t('template_name')}</Label><Input id="template_name_input" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder={t('template_name')} className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'} /></div>
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}><Button onClick={() => handleSaveAsTemplate(false)} className={`flex-1 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} disabled={saving || !schedule?.shifts?.length}>{saving ? <Loader className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" /> : <Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />}{t('save')}</Button><Button onClick={() => handleSaveAsTemplate(true)} variant="outline" className={`flex-1 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} disabled={saving || !schedule?.shifts?.length}><Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />{t('set_as_default')}</Button></div>
            <h3 className="font-semibold pt-4 border-t mt-4">{t('load_existing_template')}</h3>
            {templates.length === 0 ? <div className="text-center py-4 text-gray-500"><p>{t('no_templates_saved')}</p></div> : (<div className="space-y-2"><Select value={selectedTemplate} onValueChange={setSelectedTemplate}><SelectTrigger className={isRTL ? 'text-right' : 'text-left'}><SelectValue placeholder={t('select_template_to_load')} /></SelectTrigger><SelectContent>{templates.map(template => (<SelectItem key={template.id} value={template.id}>{template.template_name} {template.is_default && `(${t('default')})`}</SelectItem>))}</SelectContent></Select><div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}><Button onClick={handleLoadTemplate} disabled={!selectedTemplate || saving} className={`flex-1 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>{saving ? <Loader className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" /> : null}{t('load_template')}</Button>{selectedTemplate && <Button onClick={() => handleDeleteTemplate(selectedTemplate)} variant="destructive" className={`flex-1 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} disabled={saving}><Trash2 className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />{t('delete_template')}</Button>}</div></div>)}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}