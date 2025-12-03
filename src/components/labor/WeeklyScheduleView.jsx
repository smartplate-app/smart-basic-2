import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Save, Send, Trash2, Loader, Copy, FileText, Mail, X, AlertTriangle, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { useLanguage } from "../LanguageProvider";
import { toast } from "sonner";
import moment from "moment";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

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

  const days = [
    { key: 'monday', label: t('monday') },
    { key: 'tuesday', label: t('tuesday') },
    { key: 'wednesday', label: t('wednesday') },
    { key: 'thursday', label: t('thursday') },
    { key: 'friday', label: t('friday') },
    { key: 'saturday', label: t('saturday') },
    { key: 'sunday', label: t('sunday') }
  ];

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

  const calculatePayment = (worker, hoursWorked, overtimeRate) => {
    if (!worker) {
      return { basePayment: 0, totalPayment: 0, totalWithEmployerCost: 0 };
    }

    let basePaymentAmount = 0;
    if (worker.payment_type === 'hourly') {
      basePaymentAmount = hoursWorked * (worker.payment_amount || 0);
    } else if (worker.payment_type === 'daily') {
      basePaymentAmount = worker.payment_amount || 0;
    } else if (worker.payment_type === 'monthly') {
      const monthlyWorkingDays = 22; // This is a common assumption for monthly workers
      const dailyRate = (worker.payment_amount || 0) / monthlyWorkingDays;
      basePaymentAmount = dailyRate * (hoursWorked / 8); // Assuming an 8-hour workday for prorating monthly
    }

    let paymentForShift = basePaymentAmount;
    if (overtimeRate === '125') {
      paymentForShift = basePaymentAmount * 1.25;
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
    const totalCostWithEmployer = shifts.reduce((sum, s) => {
      const worker = workers.find(w => w.id === s.worker_id);
      const employerCostPercent = worker?.employer_cost_percentage || 25;
      const shiftPayment = s.payment_for_shift || 0;
      return sum + (shiftPayment * (1 + employerCostPercent / 100));
    }, 0);
    
    // Calculate weekly predicted sales from monthly (divide by 4.2 weeks)
    const weeklyPredictedSalesWithVAT = monthlyPredictedSales > 0 ? monthlyPredictedSales / 4.2 : 0;
    const weeklyPredictedSalesWithoutVAT = weeklyPredictedSalesWithVAT / 1.17;
    
    // Labor percentage is based on weekly sales excluding VAT - using total cost WITH employer costs
    const laborPercentage = weeklyPredictedSalesWithoutVAT > 0 ? (totalCostWithEmployer / weeklyPredictedSalesWithoutVAT) * 100 : 0;

    return { totalHours, totalBaseCost, totalCostWithEmployer, laborPercentage, weeklyPredictedSalesWithVAT, weeklyPredictedSalesWithoutVAT };
  };

  useEffect(() => {
    const fetchScheduleAndUser = async () => {
      setLoading(true);
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        const workingEmail = user.acting_as_store_email || user.email;

        // Load labor goals for the month
        const currentMonth = moment(weekStartDate).format('YYYY-MM');
        const dashboardData = await base44.entities.MonthlyDashboardData.filter({
          created_by: workingEmail,
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

        const weekNumber = moment(weekStartDate).isoWeek();
        const year = moment(weekStartDate).isoWeekYear();
        
        const schedulesRes = await base44.entities.WeeklySchedule.filter({ 
          week_number: String(weekNumber), // Ensure week_number is string
          year: String(year), // Ensure year is string
          created_by: user.email
        });

        if (schedulesRes && schedulesRes.length > 0) {
                    const fetchedSchedule = schedulesRes[0];
                    setSchedule(fetchedSchedule);
                    // Convert stored weekly sales back to monthly (multiply by 4.2)
                    setMonthlyPredictedSales((fetchedSchedule.predicted_weekly_sales || 0) * 4.2);
                  } else {
                    setSchedule(null);
                    setMonthlyPredictedSales(0);
                    loadDefaultTemplate();
                  }
      } catch (error) {
        console.error("Error loading schedule or user:", error);
        toast.error(t("error_loading_schedule"));
      } finally {
        setLoading(false);
      }
    };

    fetchScheduleAndUser(); 
    loadTemplates();
  }, [weekStartDate, t, language, workers, positions]);

  const loadTemplates = async () => {
    try {
      const user = currentUser || await base44.auth.me();
      setCurrentUser(user);
      const templatesData = await base44.entities.ScheduleTemplate.filter({ created_by: user.email }, "template_name");
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
      const defaultTemplate = await base44.entities.ScheduleTemplate.filter({ 
        created_by: user.email,
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
      const shiftDate = moment(weekStartDate).isoWeekday(dayIndex + 1).format('YYYY-MM-DD');
      return {
        ...s,
        date: shiftDate,
        id: undefined
      };
    });

    setSchedule({
      ...schedule,
      shifts: loadedShifts,
      total_hours: calculateTotals().totalHours, // These will be recalculated on save
      total_cost: calculateTotals().totalCost,   // These will be recalculated on save
      labor_cost_percentage: calculateTotals().laborPercentage // These will be recalculated on save
    });
    toast.success(t('template_loaded_successfully'));
  };

  const handleCellDoubleClick = (dayKey, dateStr, positionId) => {
    const position = positions.find(p => p.id === positionId);
    const defaultStartTime = position?.default_start_time || "09:00";
    const defaultEndTime = position?.default_end_time || "17:00";
    
    setSelectedCell({ day: dayKey, date: dateStr, positionId: positionId });
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
      overtime_rate: "regular",
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

    const { basePayment, totalPayment } = calculatePayment(worker, editingShift.hours_worked, editingShift.overtime_rate);

    setEditingShift({
      ...editingShift,
      worker_id: workerId,
      worker_name: worker.full_name,
      base_payment: basePayment,
      payment_for_shift: totalPayment
    });
  };

  const handleTimeChange = (field, value) => {
    const newStartTime = field === 'start_time' ? value : editingShift.start_time;
    const newEndTime = field === 'end_time' ? value : editingShift.end_time;
    const hours = calculateHours(newStartTime, newEndTime);

    const worker = workers.find(w => w.id === editingShift.worker_id);
    const { basePayment, totalPayment } = calculatePayment(worker, hours, editingShift.overtime_rate);

    setEditingShift({
      ...editingShift,
      [field]: value,
      hours_worked: hours,
      base_payment: basePayment,
      payment_for_shift: totalPayment
    });
  };

  const handleOvertimeChange = (overtimeRate) => {
    const worker = workers.find(w => w.id === editingShift.worker_id);
    if (!worker) return;

    let basePaymentAmount = 0;
    const hoursWorked = editingShift.hours_worked || 0;

    if (worker.payment_type === 'hourly') {
      basePaymentAmount = hoursWorked * (worker.payment_amount || 0);
    } else if (worker.payment_type === 'daily') {
      basePaymentAmount = worker.payment_amount || 0;
    } else {
      const monthlyWorkingDays = 22;
      const dailyRate = (worker.payment_amount || 0) / monthlyWorkingDays;
      basePaymentAmount = dailyRate * (hoursWorked / 8);
    }

    let paymentForShift = basePaymentAmount;
    if (overtimeRate === '125') {
      paymentForShift = basePaymentAmount * 1.25;
    }

    setEditingShift({
      ...editingShift,
      overtime_rate: overtimeRate,
      base_payment: basePaymentAmount,
      payment_for_shift: paymentForShift
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
      id: editingShift.id || undefined 
    };

    let updatedShifts;
    if (editingShift.id) {
      updatedShifts = (schedule?.shifts || []).map(s => s.id === editingShift.id ? updatedShift : s);
    } else {
      updatedShifts = [...(schedule?.shifts || []), updatedShift];
    }
    setSchedule({ ...schedule, shifts: updatedShifts });
    setShowShiftDialog(false);
    setEditingShift(null);
    setSelectedCell(null);
    setPendingShiftSave(null);
    setShowDoubleShiftWarning(false);
    toast.success(t("shift_saved_successfully"));
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
    toast.success(t("shift_deleted_successfully"));
  };

  const handleQuickDelete = (shift, e) => {
    e.stopPropagation();
    
    const confirmMessage = language === 'he' 
      ? `האם למחוק את המשמרת של ${shift.worker_name}?`
      : `Delete ${shift.worker_name}'s shift?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    let updatedShifts;
    if (shift.id) {
      updatedShifts = (schedule?.shifts || []).filter(s => s.id !== shift.id);
    } else {
      updatedShifts = (schedule?.shifts || []).filter(s => 
        !(s.day === shift.day && 
          s.date === shift.date && 
          s.worker_id === shift.worker_id &&
          s.job_position_id === shift.job_position_id &&
          s.start_time === shift.start_time &&
          s.end_time === shift.end_time)
      );
    }
    setSchedule({ ...schedule, shifts: updatedShifts });
    toast.success(t("shift_deleted_successfully"));
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      const { totalHours, totalCost, laborPercentage } = calculateTotals();
      const weekNumber = moment(weekStartDate).isoWeek();
      const year = moment(weekStartDate).isoWeekYear();

      const scheduleData = {
        week_start_date: moment(weekStartDate).format('YYYY-MM-DD'),
        week_number: String(weekNumber), // Convert to string
        year: String(year), // Convert to string
        predicted_weekly_sales: monthlyPredictedSales / 4.2, // Store weekly predicted sales (monthly / 4.2)
        shifts: schedule?.shifts || [],
        total_hours: totalHours,
        total_cost: totalCostWithEmployer, // Save total cost WITH employer costs
        labor_cost_percentage: laborPercentage,
        status: 'published' 
      };

      console.log("Saving schedule:", scheduleData);

      let savedSchedule;
      if (schedule && schedule.id) {
        savedSchedule = await base44.entities.WeeklySchedule.update(schedule.id, scheduleData);
        toast.success(t("schedule_updated_successfully"));
      } else {
        savedSchedule = await base44.entities.WeeklySchedule.create(scheduleData);
        toast.success(t("schedule_created_successfully"));
      }
      
      console.log("Schedule saved:", savedSchedule);
      setSchedule(savedSchedule); 
      onScheduleSaved(); 
      return savedSchedule;
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error(t("error_saving_schedule") + ": " + (error.message || "Unknown error"));
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
      const nextWeekStart = moment(weekStartDate).add(1, 'week').startOf('isoWeek');
      const nextWeekNumber = nextWeekStart.isoWeek();
      const nextWeekYear = nextWeekStart.isoWeekYear();

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

        return {
          ...shift,
          date: nextWeekShiftDate,
          id: undefined
        };
      });

      const user = currentUser || await base44.auth.me();

      const scheduleData = {
        week_start_date: nextWeekStart.format('YYYY-MM-DD'),
        week_number: String(nextWeekNumber), // Convert to string
        year: String(nextWeekYear), // Convert to string
        predicted_weekly_sales: monthlyPredictedSales / 4.2, // Copy weekly predicted sales to next week
        shifts: copiedShifts,
        total_hours: calculateTotals().totalHours, // Recalculated on save
        total_cost: calculateTotals().totalCost,   // Recalculated on save
        labor_cost_percentage: calculateTotals().laborPercentage, // Recalculated on save
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

  const handleSendWhatsApp = async () => {
    setSending(true);
    try {
      if (!schedule || !schedule.shifts || schedule.shifts.length === 0) {
        toast.info(t('no_shifts_scheduled'));
        setSending(false);
        return;
      }

      const workersWithPhone = workers.filter(w => 
        w.phone && 
        schedule.shifts.some(s => s.worker_id === w.id)
      );

      if (workersWithPhone.length === 0) {
        toast.info(t('no_workers_with_phone'));
        setSending(false);
        return;
      }

      const weekStartDisplay = moment(weekStartDate).format('DD/MM');
      const weekEndDisplay = moment(weekStartDate).add(6, 'days').format('DD/MM');

      const dayNames = {
        monday: t('monday'), tuesday: t('tuesday'), wednesday: t('wednesday'),
        thursday: t('thursday'), friday: t('friday'), saturday: t('saturday'), sunday: t('sunday')
      };

      for (const worker of workersWithPhone) {
        const workerShifts = schedule.shifts.filter(s => s.worker_id === worker.id);
        
        if (workerShifts.length === 0) continue;

        let shiftDetails = workerShifts.map(shift => {
          const dayName = dayNames[shift.day] || shift.day;
          const date = moment(shift.date).format('DD/MM');
          const positionLabel = shift.job_position ? ` (${shift.job_position})` : '';
          const overtimeLabel = shift.overtime_rate && shift.overtime_rate !== 'regular' ? ` (${shift.overtime_rate}%)` : '';
          return `📅 ${dayName} ${date}: ${shift.start_time}-${shift.end_time}${positionLabel}${overtimeLabel} (${shift.hours_worked?.toFixed(1)}h)`;
        }).join('\n');

        const totalHours = workerShifts.reduce((sum, s) => sum + (s.hours_worked || 0), 0);
        const totalPay = workerShifts.reduce((sum, s) => sum + (s.payment_for_shift || 0), 0);

        const message = `🍽️ *${t('weekly_schedule')}*\n\n` +
                       `${t('hello')} ${worker.full_name}! 👋\n\n` +
                       `${t('your_shifts_for_the_week')}:\n` +
                       `${weekStartDisplay} - ${weekEndDisplay}\n\n` +
                       `${shiftDetails}\n\n` +
                       `📊 ${t('total')}: ${totalHours.toFixed(1)} ${t('hrs')}\n` +
                       `💰 ${t('expected_payment')}: ${formatCurrency(totalPay)}\n\n` +
                       `${t('good_luck')}! 🙌`;

        const phone = worker.phone.replace(/\D/g, '');
        const formattedPhone = phone.startsWith('0') ? '972' + phone.substring(1) : 
                              phone.startsWith('972') ? phone : '972' + phone;

        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappUrl, '_blank');
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast.success(t('schedule_sent_successfully'));

    } catch (error) {
      console.error('Error sending schedule:', error);
      toast.error(`${t('error_sending_schedule')}: ${error.message}`);
    } finally {
      setSending(false);
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
      const weekNumber = moment(weekStartDate).isoWeek();
      const year = moment(weekStartDate).isoWeekYear();

      console.log('[WeeklyScheduleView] Clearing schedule for week', weekNumber, year);
      console.log('[WeeklyScheduleView] Week start date:', weekStartDate);

      // Fetch the schedule for THIS specific week
      const user = currentUser || await base44.auth.me();
      setCurrentUser(user);
      
      const schedulesRes = await base44.entities.WeeklySchedule.filter({ 
        week_number: String(weekNumber),
        year: String(year),
        created_by: user.email
      });

      if (schedulesRes && schedulesRes.length > 0) {
        const scheduleToDelete = schedulesRes[0];
        console.log('[WeeklyScheduleView] Found schedule to clear:', scheduleToDelete.id);
        
        // Update the schedule with empty shifts
        await base44.entities.WeeklySchedule.update(scheduleToDelete.id, {
          shifts: [],
          total_hours: 0,
          total_cost: 0,
          labor_cost_percentage: 0,
          predicted_weekly_sales: 0 // Reset predicted sales on clear
        });
        
        console.log('[WeeklyScheduleView] Schedule cleared in database');
        
        toast.success(language === 'he' ? 'לוח המשמרות נוקה בהצלחה' : 'Schedule cleared successfully');
      } else {
        console.log('[WeeklyScheduleView] No schedule found for this week');
        toast.info(language === 'he' ? 'אין משמרות לשבוע זה' : 'No schedule exists for this week');
      }
      
      // Clear local state
              setSchedule(null);
              setMonthlyPredictedSales(0);
      
      console.log('[WeeklyScheduleView] Calling onScheduleSaved to refresh');
      onScheduleSaved();
      
    } catch (error) {
      console.error('[WeeklyScheduleView] Error clearing schedule:', error);
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

    // Get all shifts from the source day
    const sourceDayShifts = (schedule?.shifts || []).filter(s => s.day === sourceDayKey);

    if (sourceDayShifts.length === 0) {
      toast.info(language === 'he' ? 'אין משמרות ליום זה' : 'No shifts for this day');
      return;
    }

    // Create new shifts for all days
    const newShifts = [];
    
    days.forEach(day => {
      const dayDate = moment(weekStartDate).isoWeekday(days.indexOf(day) + 1).format('YYYY-MM-DD');
      
      // For each shift in source day, create a copy for this day
      sourceDayShifts.forEach(sourceShift => {
        newShifts.push({
          ...sourceShift,
          day: day.key,
          date: dayDate,
          id: undefined // Remove ID so it's treated as a new shift
        });
      });
    });

    // Update schedule with new shifts
    setSchedule({
      ...schedule,
      shifts: newShifts
    });

    toast.success(language === 'he' 
      ? `המשמרות מיום ${days.find(d => d.key === sourceDayKey).label} הועתקו לכל השבוע`
      : `Shifts from ${days.find(d => d.key === sourceDayKey).label} copied to all week`);
  };

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a valid droppable
    if (!destination) return;

    // Dropped in the same place
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Parse the droppable IDs to get day and position
    const [sourceDay, sourcePositionId] = source.droppableId.split('|');
    const [destDay, destPositionId] = destination.droppableId.split('|');

    // Find the shift being moved
    const shiftsInSourceCell = (schedule?.shifts || []).filter(
      s => s.day === sourceDay && s.job_position_id === sourcePositionId
    );
    const movedShift = shiftsInSourceCell[source.index];

    if (!movedShift) return;

    // Get the destination position info
    const destPosition = positions.find(p => p.id === destPositionId);
    const destDateStr = moment(weekStartDate).isoWeekday(days.findIndex(d => d.key === destDay) + 1).format('YYYY-MM-DD');

    // Create updated shift with new day, position, and date
    const updatedShift = {
      ...movedShift,
      day: destDay,
      date: destDateStr,
      job_position_id: destPositionId,
      job_position: destPosition?.name || movedShift.job_position,
      id: movedShift.id // Keep the original ID if it exists
    };

    // Remove the shift from old position and add to new
    const updatedShifts = (schedule?.shifts || []).filter(s => {
      if (movedShift.id) {
        return s.id !== movedShift.id;
      }
      // For shifts without ID, match by properties
      return !(
        s.day === movedShift.day &&
        s.job_position_id === movedShift.job_position_id &&
        s.worker_id === movedShift.worker_id &&
        s.start_time === movedShift.start_time &&
        s.end_time === movedShift.end_time
      );
    });

    updatedShifts.push(updatedShift);

    setSchedule({ ...schedule, shifts: updatedShifts });
    toast.success(language === 'he' ? 'המשמרת הועברה בהצלחה' : 'Shift moved successfully');
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      // First save the schedule
      let savedSchedule = schedule;
      if (!savedSchedule || !savedSchedule.id) {
        toast.info(language === 'he' ? 'שומר לוח משמרות...' : 'Saving schedule...');
        savedSchedule = await handleSaveSchedule();
      }

      if (!savedSchedule || !savedSchedule.id) {
        toast.error(language === 'he' ? 'שגיאה בשמירת לוח משמרות' : 'Error saving schedule');
        return;
      }

      console.log("Calling sendScheduleEmail with:", {
        scheduleId: savedSchedule.id,
        additionalEmail: additionalEmail.trim() || undefined,
        language: language
      });

      const response = await base44.functions.invoke('sendScheduleEmail', {
        scheduleId: savedSchedule.id,
        additionalEmail: additionalEmail.trim() || undefined,
        language: language
      });

      console.log("Email response:", response);

      if (response && response.data && response.data.success) {
        const emailsSent = response.data.sentTo.join(', ');
        toast.success(`${language === 'he' ? 'לוח משמרות נשלח בהצלחה' : 'Schedule sent successfully'}\n${language === 'he' ? 'נשלח אל' : 'Sent to'}: ${emailsSent}`);
        setShowEmailDialog(false);
        setAdditionalEmail("");
      } else {
        throw new Error(response.data?.error || 'Failed to send email');
      }

    } catch (error) {
      console.error("Error sending email:", error);
      toast.error(`${language === 'he' ? 'שגיאה בשליחת אימייל' : 'Error sending email'}: ${error.message || 'Unknown error'}`);
    } finally {
      setSendingEmail(false);
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

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader>
          <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CardTitle className={`text-2xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Calendar className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('weekly_schedule')} - {moment(weekStartDate).format('DD/MM/YYYY')}
            </CardTitle>
            
            <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {/* Email Dialog Button */}
              <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Mail className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('send_email')}
                  </Button>
                </DialogTrigger>
                <DialogContent className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
                  <DialogHeader>
                    <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
                      {t('send_schedule_email')}
                    </DialogTitle>
                    <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
                      {t('schedule_will_be_emailed_to')} {currentUser?.email}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="additional-email" className={isRTL ? 'text-right block' : 'text-left block'}>
                        {t('additional_email')} ({t('optional')})
                      </Label>
                      <Input
                        id="additional-email"
                        type="email"
                        value={additionalEmail}
                        onChange={(e) => setAdditionalEmail(e.target.value)}
                        placeholder={t('email')}
                        className={isRTL ? 'text-right' : 'text-left'}
                        dir="ltr"
                      />
                      <p className={`text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('leave_empty_to_send_only_to_yourself')}
                      </p>
                    </div>
                    <DialogFooter className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2 justify-end`}>
                      <Button
                        onClick={() => setShowEmailDialog(false)}
                        variant="outline"
                        className="flex-1"
                      >
                        {t('cancel')}
                      </Button>
                      <Button
                        onClick={handleSendEmail}
                        disabled={sendingEmail || saving}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                      >
                        {sendingEmail ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {t('send')}
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                onClick={handleSendWhatsApp}
                variant="outline"
                className={`text-sm bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                disabled={sending || !schedule?.shifts?.length}
              >
                {sending ? <Loader className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" /> : <Send className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />}
                {t('send_schedule_whatsapp')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Monthly Predicted Sales Input */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className={`text-sm font-semibold text-green-800 ${isRTL ? 'text-right block' : 'text-left block'}`}>
                  {language === 'he' ? 'מכירות חודשיות צפויות (כולל מע״מ)' : 'Monthly Predicted Sales (incl. VAT)'}
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

          {/* Summary Stats */}
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
                {language === 'he' ? `שכר בסיס: ${formatCurrency(totalBaseCost)} + עלויות מעסיק` : `Base: ${formatCurrency(totalBaseCost)} + employer costs`}
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

          {/* Goal Comparison */}
          {laborGoals.shiftWorkersGoalWeekly > 0 && (
            <div className={`p-4 rounded-lg border-2 ${
              totalCostWithEmployer <= laborGoals.shiftWorkersGoalWeekly 
                ? 'bg-green-50 border-green-300' 
                : 'bg-red-50 border-red-300'
            }`}>
              <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                  <div className={`font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'יעד שבועי לעובדי משמרות:' : 'Weekly Shift Workers Goal:'}
                  </div>
                  <div className={`text-2xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
                    {formatCurrency(laborGoals.shiftWorkersGoalWeekly)}
                  </div>
                </div>
                <div className={`text-center px-6 py-3 rounded-lg ${
                  totalCostWithEmployer <= laborGoals.shiftWorkersGoalWeekly 
                    ? 'bg-green-100' 
                    : 'bg-red-100'
                }`}>
                  {totalCostWithEmployer <= laborGoals.shiftWorkersGoalWeekly ? (
                    <>
                      <div className="text-green-700 font-bold text-lg">
                        ✓ {language === 'he' ? 'בתוך היעד!' : 'Within Goal!'}
                      </div>
                      <div className="text-green-600 text-sm">
                        {language === 'he' ? 'חסכון:' : 'Savings:'} {formatCurrency(laborGoals.shiftWorkersGoalWeekly - totalCostWithEmployer)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-red-700 font-bold text-lg">
                        ⚠️ {language === 'he' ? 'מעל היעד!' : 'Over Goal!'}
                      </div>
                      <div className="text-red-600 text-sm">
                        {language === 'he' ? 'חריגה:' : 'Overage:'} {formatCurrency(totalCostWithEmployer - laborGoals.shiftWorkersGoalWeekly)}
                      </div>
                    </>
                  )}
                </div>
                <div className={isRTL ? 'text-left' : 'text-right'}>
                  <div className="text-gray-600 text-sm">
                    {language === 'he' ? 'עלות בפועל:' : 'Actual Cost:'}
                  </div>
                  <div className={`text-2xl font-bold ${
                    totalCostWithEmployer <= laborGoals.shiftWorkersGoalWeekly 
                      ? 'text-green-700' 
                      : 'text-red-700'
                  }`}>
                    {formatCurrency(totalCostWithEmployer)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className={`flex gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button onClick={() => setShowTemplateDialog(true)} variant="outline" size="sm" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <FileText className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('manage_templates')}
            </Button>
            <Button onClick={handleCopyToNextWeek} variant="outline" size="sm" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} disabled={!schedule?.shifts?.length}>
              <Copy className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('copy_to_next_week')}
            </Button>
            <Button 
              onClick={handleClearSchedule} 
              variant="outline" 
              size="sm" 
              className={`flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 ${isRTL ? 'flex-row-reverse' : ''}`}
              disabled={!schedule?.shifts?.length && !schedule?.id}
            >
              <X className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'he' ? 'נקה לוח משמרות' : 'Clear Schedule'}
            </Button>
            <Button
              onClick={handleSaveSchedule}
              className={`bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              disabled={saving}
            >
              {saving ? (
                <Loader className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              )}
              {t('save_schedule')}
            </Button>
          </div>

          <div className={`text-sm text-gray-600 bg-blue-50 p-3 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
            <strong>{t('tip')}:</strong> {t('shift_duplicate_tip')}
          </div>

          {/* Schedule Table with Drag & Drop */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="overflow-x-auto" dir={isRTL ? 'rtl' : 'ltr'}>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className={`border p-2 text-sm font-semibold ${isRTL ? 'text-right' : 'text-left'} w-32`}>
                      {t('position')}
                    </th>
                    {days.map(day => {
                        const dayDate = moment(weekStartDate).isoWeekday(days.indexOf(day) + 1);
                        const dayShiftsCount = (schedule?.shifts || []).filter(s => s.day === day.key).length;
                        
                        return (
                          <th key={day.key} className="border p-2 text-sm font-semibold min-w-[120px]">
                            <div className="flex flex-col gap-1">
                              <div>{day.label}</div>
                              <div className="text-xs text-gray-500 font-normal">
                                {dayDate.format('DD/MM')}
                              </div>
                              {dayShiftsCount > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-6 px-2 bg-blue-50 hover:bg-blue-100 border-blue-300"
                                  onClick={() => handleCopyDayToWeek(day.key)}
                                  title={language === 'he' ? 'העתק יום זה לכל השבוע' : 'Copy this day to all week'}
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  {language === 'he' ? 'העתק לשבוע' : 'Copy to week'}
                                </Button>
                              )}
                            </div>
                          </th>
                        );
                      })}
                  </tr>
                </thead>
                <tbody>
                  {positions.map(position => (
                    <tr key={position.id}>
                      <td className={`border p-2 font-medium bg-gray-50 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {position.name}
                      </td>
                      {days.map(day => {
                        const dateStr = moment(weekStartDate).isoWeekday(days.indexOf(day) + 1).format('YYYY-MM-DD');
                        const droppableId = `${day.key}|${position.id}`;
                        const shiftsForCell = schedule?.shifts?.filter(
                          s => s.day === day.key && s.job_position_id === position.id
                        ) || [];

                        return (
                          <td
                            key={`${day.key}-${position.id}`}
                            className={`border p-1 ${isRTL ? 'text-right' : 'text-left'}`}
                            onDoubleClick={() => handleCellDoubleClick(day.key, dateStr, position.id)}
                          >
                            <Droppable droppableId={droppableId}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`space-y-1 min-h-[60px] rounded transition-colors ${
                                    snapshot.isDraggingOver ? 'bg-blue-100' : 'hover:bg-blue-50'
                                  }`}
                                >
                                  {shiftsForCell.length === 0 ? (
                                    <div className={`text-xs text-gray-400 py-2 ${isRTL ? 'text-right' : 'text-center'}`}>
                                      {t('double_click_to_add')}
                                    </div>
                                  ) : (
                                    shiftsForCell.map((shift, idx) => (
                                      <Draggable
                                        key={shift.id || `${shift.day}-${shift.worker_id}-${shift.start_time}-${idx}`}
                                        draggableId={shift.id || `${shift.day}-${shift.worker_id}-${shift.start_time}-${idx}`}
                                        index={idx}
                                      >
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`bg-blue-100 p-2 rounded text-xs cursor-pointer group relative ${
                                              snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400' : 'hover:bg-blue-200'
                                            } ${isRTL ? 'text-right' : 'text-left'}`}
                                            onClick={() => {
                                              setEditingShift(shift);
                                              setSelectedCell({ day: day.key, date: dateStr, positionId: position.id });
                                              setShowShiftDialog(true);
                                            }}
                                          >
                                            <div 
                                              {...provided.dragHandleProps}
                                              className={`absolute top-1 ${isRTL ? 'right-1' : 'left-1'} cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600`}
                                            >
                                              <GripVertical className="h-4 w-4" />
                                            </div>
                                            <div className={`font-semibold ${isRTL ? 'text-right pr-5' : 'text-left pl-5'}`}>{shift.worker_name}</div>
                                            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse pr-5' : 'pl-5'}`}>
                                              <span>{shift.start_time}-{shift.end_time}</span>
                                              <span>{formatCurrency(shift.payment_for_shift || 0)}</span>
                                            </div>
                                            {shift.overtime_rate && shift.overtime_rate !== 'regular' && (
                                              <Badge variant="secondary" className={`mt-1 ${isRTL ? 'mr-5' : 'ml-5'}`}>
                                                {shift.overtime_rate === '125' ? '125%' : ''}
                                              </Badge>
                                            )}
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className={`absolute top-1 ${isRTL ? 'left-1' : 'right-1'} h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-white hover:bg-red-50`}
                                              onClick={(e) => handleQuickDelete(shift, e)}
                                              title={t('delete')}
                                            >
                                              <Trash2 className="h-3 w-3 text-red-600" />
                                            </Button>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))
                                  )}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DragDropContext>

        </CardContent>
      </Card>

      {/* Shift Dialog */}
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
                <Select
                  value={editingShift.worker_id}
                  onValueChange={handleWorkerChange}
                >
                  <SelectTrigger id="worker_id" className={isRTL ? 'text-right' : 'text-left'}>
                    <SelectValue placeholder={t('select_worker')} />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Show workers assigned to this position first */}
                    {workers
                      .filter(w => 
                        w.job_position_id === editingShift.job_position_id || 
                        w.secondary_job_position_id === editingShift.job_position_id ||
                        (w.job_position_ids || []).includes(editingShift.job_position_id)
                      )
                      .map(worker => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.full_name}
                          <span className="text-xs text-gray-500 ml-2">
                            ({t(worker.payment_type)}: {worker.payment_amount} {t('currency_ILS')})
                          </span>
                        </SelectItem>
                    ))}
                    {/* Separator if there are other workers */}
                    {workers.filter(w => 
                      w.job_position_id !== editingShift.job_position_id && 
                      w.secondary_job_position_id !== editingShift.job_position_id &&
                      !(w.job_position_ids || []).includes(editingShift.job_position_id)
                    ).length > 0 && (
                      <div className="px-2 py-1 text-xs text-gray-400 border-t mt-1 pt-1">
                        {language === 'he' ? '── עובדים אחרים ──' : '── Other Workers ──'}
                      </div>
                    )}
                    {/* Show other workers */}
                    {workers
                      .filter(w => 
                        w.job_position_id !== editingShift.job_position_id && 
                        w.secondary_job_position_id !== editingShift.job_position_id &&
                        !(w.job_position_ids || []).includes(editingShift.job_position_id)
                      )
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
                  <Label htmlFor="start_time" className={isRTL ? 'text-right block' : 'text-left block'}>
                    {t('start')} *
                  </Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={editingShift.start_time}
                    onChange={(e) => handleTimeChange('start_time', e.target.value)}
                    className={isRTL ? 'text-right' : 'text-left'}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time" className={isRTL ? 'text-right block' : 'text-left block'}>
                    {t('end')} *
                  </Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={editingShift.end_time}
                    onChange={(e) => handleTimeChange('end_time', e.target.value)}
                    className={isRTL ? 'text-right' : 'text-left'}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="overtime_rate" className={isRTL ? 'text-right block' : 'text-left block'}>
                  {t('overtime_rate')}
                </Label>
                <Select
                  value={editingShift.overtime_rate || 'regular'}
                  onValueChange={handleOvertimeChange}
                >
                  <SelectTrigger id="overtime_rate" className={isRTL ? 'text-right' : 'text-left'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">{t('regular_rate')}</SelectItem>
                    <SelectItem value="125">{t('overtime_125')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={`bg-blue-50 p-3 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="text-sm space-y-1">
                  <div><strong>{t('hours')}:</strong> {editingShift.hours_worked?.toFixed(1)}</div>
                  {editingShift.base_payment > 0 && (
                    <>
                      <div><strong>{t('base_payment')}:</strong> {editingShift.base_payment.toFixed(2)} {t('currency_ILS')}</div>
                      <div className="text-lg font-bold text-blue-700">
                        <strong>{t('total')}:</strong> {(editingShift.payment_for_shift || 0).toFixed(2)} {t('currency_ILS')}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className={isRTL ? 'text-right block' : 'text-left block'}>
                  {t('notes')}
                </Label>
                <Input
                  id="notes"
                  value={editingShift.notes || ''}
                  onChange={(e) => setEditingShift({...editingShift, notes: e.target.value})}
                  placeholder={t('notes')}
                  className={isRTL ? 'text-right' : 'text-left'}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2 justify-end mt-4`}>
            <Button type="button" variant="outline" onClick={() => {
              setShowShiftDialog(false);
              setEditingShift(null);
              setSelectedCell(null);
            }}>
              {t('cancel')}
            </Button>
            {editingShift && ( // Only show delete button if editing an existing shift
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleShiftDelete} 
                className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Trash2 className="w-4 h-4" />
                {t('delete')}
              </Button>
            )}
            <Button type="submit" onClick={handleShiftSave} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Save className="w-4 h-4" />
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Double Shift Warning Dialog */}
      <Dialog open={showDoubleShiftWarning} onOpenChange={setShowDoubleShiftWarning}>
        <DialogContent className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 text-orange-600 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <AlertTriangle className="w-5 h-5" />
              {language === 'he' ? 'אזהרת משמרת כפולה' : 'Double Shift Warning'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className={`bg-orange-50 border border-orange-200 rounded-lg p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-orange-800 font-medium mb-2">
                {language === 'he' 
                  ? `לעובד ${pendingShiftSave?.worker?.full_name} כבר יש משמרת ביום זה:`
                  : `${pendingShiftSave?.worker?.full_name} already has a shift on this day:`}
              </p>
              <div className="space-y-2">
                {pendingShiftSave?.existingShifts?.map((shift, idx) => (
                  <div key={idx} className="bg-white rounded p-2 border border-orange-100">
                    <span className="font-medium">{shift.job_position}</span>
                    <span className="text-gray-600 mx-2">|</span>
                    <span>{shift.start_time} - {shift.end_time}</span>
                  </div>
                ))}
              </div>
              <p className="text-orange-700 mt-3">
                {language === 'he' 
                  ? `האם ברצונך להוסיף משמרת נוספת בתפקיד ${pendingShiftSave?.position?.name}?`
                  : `Do you want to add another shift as ${pendingShiftSave?.position?.name}?`}
              </p>
            </div>
          </div>
          
          <DialogFooter className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} gap-2 justify-end mt-4`}>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancelDoubleShift}
            >
              {t('cancel')}
            </Button>
            <Button 
              type="button" 
              onClick={handleConfirmDoubleShift}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {language === 'he' ? 'כן, הוסף משמרת' : 'Yes, Add Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>{t('manage_templates')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <h3 className="font-semibold">{t('save_current_as_template')}</h3>
            <div className="space-y-2">
              <Label htmlFor="template_name_input" className={isRTL ? 'text-right block' : 'text-left block'}>{t('template_name')}</Label>
              <Input
                id="template_name_input"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={t('template_name')}
                className={isRTL ? 'text-right' : 'text-left'}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button
                onClick={() => handleSaveAsTemplate(false)}
                className={`flex-1 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                disabled={saving || !schedule?.shifts?.length}
              >
                {saving ? <Loader className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" /> : <Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />}
                {t('save')}
              </Button>
              <Button
                onClick={() => handleSaveAsTemplate(true)}
                variant="outline"
                className={`flex-1 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                disabled={saving || !schedule?.shifts?.length}
              >
                <Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t('set_as_default')}
              </Button>
            </div>

            <h3 className="font-semibold pt-4 border-t mt-4">{t('load_existing_template')}</h3>
            {templates.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <p>{t('no_templates_saved')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Select
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                >
                  <SelectTrigger className={isRTL ? 'text-right' : 'text-left'}>
                    <SelectValue placeholder={t('select_template_to_load')} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.template_name} {template.is_default && `(${t('default')})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Button onClick={handleLoadTemplate} disabled={!selectedTemplate || saving} className={`flex-1 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {saving ? <Loader className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" /> : null}
                    {t('load_template')}
                  </Button>
                  {selectedTemplate && (
                    <Button
                      onClick={() => handleDeleteTemplate(selectedTemplate)}
                      variant="destructive"
                      className={`flex-1 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                      disabled={saving}
                    >
                      <Trash2 className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                      {t('delete_template')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}