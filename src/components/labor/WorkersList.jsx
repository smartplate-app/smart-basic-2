import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Edit, Trash2, X, Save, User, Phone, Mail, DollarSign, Wallet, FileText, Send, History, LayoutGrid, List } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import WorkerBankTransfer from "./WorkerBankTransfer";
import WorkerRateHistory from "./WorkerRateHistory";

export default function WorkersList({ workers, positions, onAdd, onUpdate, onDelete }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const { t, language } = useLanguage();

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const [showBankTransfer, setShowBankTransfer] = useState(null);
  const [showRateHistory, setShowRateHistory] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Helper function to calculate total cost
  const calculateTotalCost = (baseAmount, percentage, managementBonus = 0) => {
    const numericBaseAmount = parseFloat(baseAmount) || 0;
    const numericPercentage = parseFloat(percentage) || 0;
    const numericBonus = parseFloat(managementBonus) || 0;
    return (numericBaseAmount + numericBonus) * (1 + numericPercentage / 100);
  };

  const initialFormData = {
    full_name: "",
    phone: "",
    email: "",
    id_number: "",
    accounting_employee_id: "",
    job_position_id: "",
    job_position_name: "",
    secondary_job_position_id: "",
    secondary_job_position_name: "",
    job_position_ids: [], // Array of position IDs
    job_position_names: [], // Array of position names
    section: "",
    payment_type: "monthly",
    payment_amount: 0,
    management_bonus: 0,
    employer_cost_percentage: 25,
    total_cost_with_employer: 0,
    salary_includes_overtime: false,
    salary_includes_travel: false,
    bank_name: "",
    bank_branch: "",
    bank_account: "",
    tax_credit_points: 2.25,
    start_date: new Date().toISOString().split('T')[0],
    is_active: true,
    notes: "",
    position_rates: []
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleStartAdd = () => {
    setFormData(initialFormData);
    setIsAdding(true);
    setEditingId(null);
  };

  const handleStartEdit = (worker) => {
    const workerPaymentAmount = parseFloat(worker.payment_amount) || 0;
    const workerManagementBonus = parseFloat(worker.management_bonus) || 0;
    const workerEmployerCostPercentage = parseFloat(worker.employer_cost_percentage) || 25;
    const calculatedTotalCost = calculateTotalCost(workerPaymentAmount, workerEmployerCostPercentage, workerManagementBonus);

    setFormData({
      full_name: worker.full_name || "",
      phone: worker.phone || "",
      email: worker.email || "",
      id_number: worker.id_number || "",
      accounting_employee_id: worker.accounting_employee_id || "",
      job_position_id: worker.job_position_id || "",
      job_position_name: worker.job_position_name || "",
      secondary_job_position_id: worker.secondary_job_position_id || "",
      secondary_job_position_name: worker.secondary_job_position_name || "",
      job_position_ids: worker.job_position_ids || [],
      job_position_names: worker.job_position_names || [],
      section: worker.section || "",
      payment_type: worker.payment_type || "monthly",
      payment_amount: workerPaymentAmount,
      management_bonus: workerManagementBonus,
      employer_cost_percentage: workerEmployerCostPercentage,
      total_cost_with_employer: parseFloat(worker.total_cost_with_employer) || calculatedTotalCost,
      salary_includes_overtime: !!worker.salary_includes_overtime,
      salary_includes_travel: !!worker.salary_includes_travel,
      bank_name: worker.bank_name || "",
      bank_branch: worker.bank_branch || "",
      bank_account: worker.bank_account || "",
      tax_credit_points: parseFloat(worker.tax_credit_points) || 2.25,
      start_date: worker.start_date || new Date().toISOString().split('T')[0],
      is_active: worker.is_active !== false,
      notes: worker.notes || "",
      position_rates: worker.position_rates || []
    });
    setEditingId(worker.id);
    setIsAdding(false);

    // Scroll to top to show the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePositionChange = (positionId, isSecondary = false) => {
    const position = positions.find(p => p.id === positionId);

    if (isSecondary) {
      setFormData(prev => ({
        ...prev,
        secondary_job_position_id: positionId,
        secondary_job_position_name: position?.name || ""
      }));
      // ensure rate entry exists for secondary when selected
      setFormData(prev => {
        const existing = (prev.position_rates || []).slice();
        if (!existing.find(r => r.position_id === positionId)) {
          existing.push({ position_id: positionId, position_name: position?.name || "", amount: parseFloat(position?.default_payment_amount) || 0, payment_type: position?.default_payment_type || 'monthly' });
        }
        return { ...prev, position_rates: existing };
      });
    } else {
      const newPaymentAmount = parseFloat(position?.default_payment_amount) || 0;
      const totalCost = calculateTotalCost(newPaymentAmount, formData.employer_cost_percentage, formData.management_bonus);

      setFormData(prev => {
        const existing = (prev.position_rates || []).slice();
        const idx = existing.findIndex(r => r.position_id === positionId);
        const base = { position_id: positionId, position_name: position?.name || "", amount: newPaymentAmount, payment_type: position?.default_payment_type || 'monthly' };
        if (idx >= 0) existing[idx] = { ...existing[idx], ...base };
        else existing.push(base);
        return {
          ...prev,
          job_position_id: positionId,
          job_position_name: position?.name || "",
          section: position?.section || "",
          payment_type: position?.default_payment_type || "monthly",
          payment_amount: newPaymentAmount,
          total_cost_with_employer: totalCost,
          position_rates: existing
        };
      });
    }
  };

  const handleMultiplePositionsChange = (positionId) => {
    const position = positions.find(p => p.id === positionId);
    if (!position) return;

    setFormData(prev => {
      const currentIds = prev.job_position_ids || [];
      const currentNames = prev.job_position_names || [];
      const isSelected = currentIds.includes(positionId);

      let nextRates = (prev.position_rates || []).slice();

      if (isSelected) {
        nextRates = nextRates.filter(r => r.position_id !== positionId);
        return {
          ...prev,
          job_position_ids: currentIds.filter(id => id !== positionId),
          job_position_names: currentNames.filter(name => name !== position.name),
          position_rates: nextRates
        };
      } else {
        nextRates.push({ position_id: positionId, position_name: position.name, amount: parseFloat(position.default_payment_amount) || 0, payment_type: position.default_payment_type || 'monthly' });
        return {
          ...prev,
          job_position_ids: [...currentIds, positionId],
          job_position_names: [...currentNames, position.name],
          position_rates: nextRates
        };
      }
    });
  };

  const handlePaymentAmountChange = (value) => {
    const amount = parseFloat(value) || 0;
    const totalCost = calculateTotalCost(amount, formData.employer_cost_percentage, formData.management_bonus);

    setFormData({
      ...formData,
      payment_amount: amount,
      total_cost_with_employer: totalCost
    });
  };
  
  const handleManagementBonusChange = (value) => {
    const bonus = parseFloat(value) || 0;
    const totalCost = calculateTotalCost(formData.payment_amount, formData.employer_cost_percentage, bonus);

    setFormData({
      ...formData,
      management_bonus: bonus,
      total_cost_with_employer: totalCost
    });
  };

  const handleEmployerCostChange = (value) => {
    const percentage = parseFloat(value) || 0;
    const totalCost = calculateTotalCost(formData.payment_amount, percentage, formData.management_bonus);

    setFormData({
      ...formData,
      employer_cost_percentage: percentage,
      total_cost_with_employer: totalCost
    });
  };

  const handleSave = async () => {
    if (!formData.full_name || !formData.job_position_id) {
      alert(t('required_fields'));
      return;
    }

    // Build position_rates for all selected positions (primary + additional)
    const allIds = [formData.job_position_id, ...(formData.job_position_ids || [])].filter(Boolean);
    const comp = allIds.map(pid => {
      const p = positions.find(pp => pp.id === pid);
      const override = (formData.position_rates || []).find(r => r.position_id === pid);
      const amount = override?.amount ?? (parseFloat(p?.default_payment_amount) || 0);
      return {
        position_id: pid,
        position_name: p?.name || "",
        amount,
        payment_type: override?.payment_type || p?.default_payment_type || formData.payment_type
      };
    });

    const primary = comp.find(c => c.position_id === formData.job_position_id);
    const baseAmount = primary ? primary.amount : (formData.payment_amount || 0);
    const baseType = positions.find(p => p.id === formData.job_position_id)?.default_payment_type || formData.payment_type;

    // Ensure total_cost_with_employer is up-to-date before saving
    const finalTotalCost = calculateTotalCost(baseAmount, formData.employer_cost_percentage, formData.management_bonus);

    const dataToSave = {
      ...formData,
      payment_amount: baseAmount,
      management_bonus: formData.management_bonus || 0,
      payment_type: baseType,
      position_rates: comp,
      total_cost_with_employer: finalTotalCost
    };

    try {
      if (editingId) {
        await onUpdate(editingId, dataToSave);
      } else {
        await onAdd(dataToSave);
      }

      setIsAdding(false);
      setEditingId(null);

      // Reset form
      setFormData(initialFormData);
    } catch (error) {
      console.error("Error saving worker:", error);
      alert(t('error_saving'));
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  const paymentTypeLabels = {
    monthly: t('monthly_salary'),
    daily: t('daily_rate'),
    hourly: t('hourly_rate')
  };

  const paymentTypeSuffixes = {
    monthly: t('per_month'),
    daily: t('per_day'),
    hourly: t('per_hour')
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <h3 className="text-xl font-semibold">{t('workers')}</h3>
        <div className="flex items-center gap-2">
          <div className="flex bg-white rounded-lg shadow-sm border">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-100'}
              title={t('list') || 'List'}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-100'}
              title={t('grid') || 'Grid'}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
          {!isAdding && !editingId && (
            <Button onClick={handleStartAdd} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              {t('add_worker')}
            </Button>
          )}
        </div>
      </div>

      {(isAdding || editingId) && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {editingId ? t('edit_worker') : t('new_worker')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('full_name')} *</Label>
                <Input
                  id="fullName"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder={t('full_name')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idNumber">{t('id_number')}</Label>
                <Input
                  id="idNumber"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                  placeholder="123456789"
                  maxLength={9}
                  type="text" // Keep as text to allow leading zeros and specific formats if needed, but ensure numeric input only in mobile keyboards
                  inputMode="numeric"
                  pattern="[0-9]*" // Suggest numeric keyboard on devices that support it
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountingEmployeeId">{language === 'he' ? 'מספר עובד בהנח"ש' : 'Accounting ID'}</Label>
                <Input
                  id="accountingEmployeeId"
                  value={formData.accounting_employee_id}
                  onChange={(e) => setFormData({ ...formData, accounting_employee_id: e.target.value })}
                  placeholder={language === 'he' ? 'מספר עובד במערכת שכר...' : 'Employee ID for payroll...'}
                  type="text"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel" // Changed from 'numeric' to 'tel' for better iPhone numeric keyboard
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder={t('phone')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="worker@example.com"
                  type="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobPosition">{t('job_position')} * ({t('primary')})</Label>
                <Select
                  value={formData.job_position_id}
                  onValueChange={(value) => handlePositionChange(value, false)}
                >
                  <SelectTrigger id="jobPosition">
                    <SelectValue placeholder={t('select_position')} />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.name}
                        {position.default_payment_amount > 0 && (
                          <span className="text-xs text-gray-500 ml-2">
                            ({position.default_payment_amount} {language === 'he' ? '₪' : 'ILS'})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.job_position_id && (
                  <p className="text-xs text-blue-600">
                    {t('auto_calculated_from_price')}
                  </p>
                )}
              </div>

              {/* Multiple Job Positions */}
              <div className="space-y-2 md:col-span-2">
                <Label>{language === 'he' ? 'תפקידים נוספים - אופציונלי' : 'Additional Positions - Optional'}</Label>
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex flex-wrap gap-2" dir={language === 'he' ? 'rtl' : 'ltr'}>
                    {positions
                      .filter(p => p.id !== formData.job_position_id)
                      .map(position => {
                        const isSelected = (formData.job_position_ids || []).includes(position.id);
                        return (
                          <Badge
                            key={position.id}
                            variant={isSelected ? "default" : "outline"}
                            className={`cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'hover:bg-blue-100 hover:border-blue-400'
                            }`}
                            onClick={() => handleMultiplePositionsChange(position.id)}
                          >
                            {position.name}
                            {isSelected && <X className="w-3 h-3 ml-1" />}
                          </Badge>
                        );
                      })}
                  </div>
                  {(formData.job_position_ids || []).length > 0 && (
                    <p className="text-xs text-blue-600 mt-2">
                      {language === 'he' 
                        ? `נבחרו ${formData.job_position_ids.length} תפקידים נוספים`
                        : `${formData.job_position_ids.length} additional positions selected`}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentType">{t('payment_type')} *</Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(value) => setFormData({ ...formData, payment_type: value })}
                >
                  <SelectTrigger id="paymentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{t('monthly_salary')}</SelectItem>
                    <SelectItem value="daily">{t('daily_rate')}</SelectItem>
                    <SelectItem value="hourly">{t('hourly_rate')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentAmount">{t('payment_amount')} * ({t('excluding_employer_costs')})</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.payment_amount}
                  onChange={(e) => handlePaymentAmountChange(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500">
                  {language === 'he' ? 'שכר בסיס לפני עלויות מעסיק' : 'Base salary before employer costs'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="managementBonus">{language === 'he' ? 'תוספת ניהול (חודשית)' : 'Management Bonus (Monthly)'}</Label>
                <Input
                  id="managementBonus"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.management_bonus}
                  onChange={(e) => handleManagementBonusChange(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500">
                  {language === 'he' ? 'תוספת קבועה לשכר הנצבר בכל חודש' : 'Fixed bonus added to accumulated salary each month'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="travelExpenseType">{language === 'he' ? 'החזר נסיעות' : 'Travel Expenses'}</Label>
                <Select
                  value={formData.travel_expense_type || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, travel_expense_type: value })}
                >
                  <SelectTrigger id="travelExpenseType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{language === 'he' ? 'ללא (מגולם בשכר/לא זכאי)' : 'None'}</SelectItem>
                    <SelectItem value="daily">{language === 'he' ? 'יומי (22.60₪ ליום)' : 'Daily (22.60 ILS)'}</SelectItem>
                    <SelectItem value="monthly">{language === 'he' ? 'חודשי (226.00₪)' : 'Monthly (226 ILS)'}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {language === 'he' ? 'לפי חוק נסיעות' : 'By travel expense law'}
                </p>
              </div>

              <div className="space-y-4 md:col-span-2 bg-gray-50 border rounded-lg p-4">
                <h4 className="font-semibold text-gray-800">{language === 'he' ? 'הגדרות שכר מיוחדות' : 'Special Salary Settings'}</h4>
                
                <div className={`flex items-center gap-3 ${language === 'he' ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="checkbox"
                    id="salary_includes_overtime"
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    checked={formData.salary_includes_overtime}
                    onChange={(e) => setFormData({ ...formData, salary_includes_overtime: e.target.checked })}
                  />
                  <div className={language === 'he' ? 'text-right' : 'text-left'}>
                    <Label htmlFor="salary_includes_overtime" className="cursor-pointer font-medium block">
                      {language === 'he' ? 'השכר השעתי כולל שעות נוספות' : 'Hourly rate includes overtime'}
                    </Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {language === 'he' 
                        ? 'במידה ומסומן, יוצגו השעות הנוספות בדוחות לצורך מעקב, אך הן יחושבו לפי 100% ולא 125% או 150% (רלוונטי למנהלים, עובדים גלובליים או עובדי טיפים שמקבלים שכר קבוע).' 
                        : 'If checked, overtime hours will be displayed for tracking but will be calculated at 100% (relevant for global/tipped workers).'}
                    </p>
                  </div>
                </div>

                <div className={`flex items-center gap-3 mt-4 ${language === 'he' ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="checkbox"
                    id="salary_includes_travel"
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    checked={formData.salary_includes_travel}
                    onChange={(e) => setFormData({ ...formData, salary_includes_travel: e.target.checked })}
                  />
                  <div className={language === 'he' ? 'text-right' : 'text-left'}>
                    <Label htmlFor="salary_includes_travel" className="cursor-pointer font-medium block">
                      {language === 'he' ? 'השכר השעתי כולל נסיעות' : 'Hourly rate includes travel'}
                    </Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {language === 'he' 
                        ? 'במידה ומסומן, לא יתווסף תשלום נסיעות נוסף מעבר לשכר, וההשלמה תחשב ככוללת את עלות הנסיעות.' 
                        : 'If checked, travel expenses will not be added to the final payout, and the Alema includes travel.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="employerCostPercentage">
                  {language === 'he' ? 'אחוז עלויות מעסיק' : 'Employer Cost %'}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="employerCostPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.employer_cost_percentage}
                    onChange={(e) => handleEmployerCostChange(e.target.value)}
                    className="w-24"
                  />
                  <span className="flex items-center text-gray-600">%</span>
                  <div className="flex-1 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEmployerCostChange(20)}
                    >
                      20%
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEmployerCostChange(25)}
                      className={formData.employer_cost_percentage === 25 ? "bg-blue-50" : ""}
                    >
                      25%
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEmployerCostChange(30)}
                    >
                      30%
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {language === 'he'
                    ? 'כולל: ביטוח לאומי, מס בריאות, פנסיה, קרן השתלמות, פיצויים, חופשה וכו׳'
                    : 'Includes: National Insurance, Health Tax, Pension, Study Fund, Severance, Vacation, etc.'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">{t('start_date')}</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              {/* Position specific rates */}
              <div className="space-y-2 md:col-span-2">
                <Label>{language === 'he' ? 'תעריפים לפי תפקיד' : 'Rates per position'}</Label>
                <div className="space-y-2">
                  {([formData.job_position_id].filter(Boolean).concat(formData.job_position_ids || [])).map((pid) => {
                    const p = positions.find(pp => pp.id === pid);
                    if (!p) return null;
                    const defAmt = parseFloat(p.default_payment_amount) || 0;
                    const overrideObj = (formData.position_rates || []).find(r => r.position_id === pid);
                    const value = overrideObj?.amount ?? defAmt;
                    const isPrimary = formData.job_position_id === pid;
                    return (
                      <div key={pid} className="flex items-center gap-3">
                        <Badge className="bg-gray-100 text-gray-800">{p.name}</Badge>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={value}
                          onChange={(e) => {
                            const amt = parseFloat(e.target.value) || 0;
                            setFormData(prev => {
                              const existing = (prev.position_rates || []).slice();
                              const idx = existing.findIndex(r => r.position_id === pid);
                              const base = { position_id: pid, position_name: p.name, amount: amt, payment_type: p.default_payment_type || 'monthly' };
                              if (idx >= 0) existing[idx] = { ...existing[idx], ...base };
                              else existing.push(base);
                              const next = { ...prev, position_rates: existing };
                              if (isPrimary) {
                                next.payment_amount = amt;
                                next.payment_type = p.default_payment_type || prev.payment_type;
                                next.total_cost_with_employer = calculateTotalCost(amt, prev.employer_cost_percentage, prev.management_bonus);
                              }
                              return next;
                            });
                          }}
                          className="max-w-[140px]"
                        />
                        <span className="text-xs text-gray-500">{language === 'he' ? 'ברירת מחדל:' : 'Default:'} {defAmt.toLocaleString()} {language === 'he' ? '₪' : 'ILS'}</span>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setFormData(prev => {
                            const existing = (prev.position_rates || []).filter(r => r.position_id !== pid);
                            const next = { ...prev, position_rates: existing };
                            if (isPrimary) {
                              next.payment_amount = defAmt;
                              next.total_cost_with_employer = calculateTotalCost(defAmt, prev.employer_cost_percentage, prev.management_bonus);
                            }
                            return next;
                          });
                        }}>
                          {language === 'he' ? 'אתחל לברירת מחדל' : 'Reset'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {(formData.payment_amount > 0 || formData.management_bonus > 0) && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">
                      {language === 'he' ? 'שכר בסיס' : 'Base Salary'}
                    </p>
                    <p className="text-xl font-bold text-gray-800">
                      {formData.payment_amount.toLocaleString()} {language === 'he' ? '₪' : 'ILS'}
                    </p>
                    <p className="text-xs text-gray-500">{paymentTypeSuffixes[formData.payment_type]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">
                      {language === 'he' ? 'תוספת ניהול' : 'Mgmt Bonus'}
                    </p>
                    <p className="text-xl font-bold text-blue-700">
                      {(formData.management_bonus || 0).toLocaleString()} {language === 'he' ? '₪' : 'ILS'}
                    </p>
                    <p className="text-xs text-gray-500">{language === 'he' ? 'חודשי' : 'Monthly'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">
                      {language === 'he' ? 'עלות כוללת למעסיק' : 'Total Employer Cost'}
                    </p>
                    <p className="text-xl font-bold text-green-700">
                      {formData.total_cost_with_employer.toLocaleString()} {language === 'he' ? '₪' : 'ILS'}
                    </p>
                    <p className="text-xs text-green-600">
                      +{formData.employer_cost_percentage}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bank Details Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                {t('bank_details')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">{t('bank_name')}</Label>
                  <Input
                    id="bankName"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder={language === 'he' ? 'לאומי, דיסקונט, הפועלים...' : 'Bank name...'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankBranch">{t('bank_branch')}</Label>
                  <Input
                    id="bankBranch"
                    value={formData.bank_branch}
                    onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                    placeholder="123"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankAccount">{t('bank_account')}</Label>
                  <Input
                    id="bankAccount"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    placeholder="1234567"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="taxCreditPoints">{t('tax_credit_points')}</Label>
                  <Input
                    id="taxCreditPoints"
                    type="number"
                    step="0.25"
                    value={formData.tax_credit_points}
                    onChange={(e) => setFormData({ ...formData, tax_credit_points: parseFloat(e.target.value) || 2.25 })}
                  />
                  <p className="text-xs text-gray-500">
                    {language === 'he'
                      ? 'ברירת מחדל: 2.25 נקודות (יחיד)'
                      : 'Default: 2.25 points (single)'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('notes')}
                className="h-20"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                {t('cancel')}
              </Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                {t('save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {workers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">{t('no_workers_yet')}</p>
          <p className="text-sm">{t('add_first_worker')}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workers.map((worker) => (
            <div key={worker.id} className="bg-white rounded-xl border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-12 w-12 border bg-slate-50 text-slate-600 flex-shrink-0">
                      <AvatarFallback className="font-semibold">{getInitials(worker.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="font-bold text-lg text-slate-800 truncate">{worker.full_name}</h4>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                        {worker.phone && <span className="truncate">{worker.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-700" onClick={() => handleStartEdit(worker)} title={t('edit')}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-700" onClick={() => { if (window.confirm(t('confirm_delete_worker', { workerName: worker.full_name }))) { onDelete(worker.id); } }} title={t('delete')}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-5">
                  {worker.job_position_name && <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-none hover:bg-blue-100">{worker.job_position_name}</Badge>}
                  {worker.secondary_job_position_name && <Badge variant="outline" className="text-slate-600 font-normal">{worker.secondary_job_position_name}</Badge>}
                  {(worker.job_position_names || []).map((posName, idx) => (
                    <Badge key={idx} variant="outline" className="text-slate-600 font-normal">{posName}</Badge>
                  ))}
                </div>

                <div className="bg-slate-50 rounded-lg p-3 space-y-2 mb-4 border border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{language === 'he' ? 'שכר בסיס:' : 'Base:'}</span>
                    <span className="font-medium text-slate-700">{(parseFloat(worker.payment_amount) || 0).toLocaleString()} {language === 'he' ? '₪' : 'ILS'}{paymentTypeSuffixes[worker.payment_type]}</span>
                  </div>
                  {(worker.management_bonus > 0) && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{language === 'he' ? 'תוספת ניהול:' : 'Mgmt Bonus:'}</span>
                      <span className="font-medium text-slate-700">{(parseFloat(worker.management_bonus) || 0).toLocaleString()} {language === 'he' ? '₪' : 'ILS'}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200">
                    <span className="text-slate-700 font-semibold">{language === 'he' ? 'עלות כוללת מעסיק:' : 'Total Cost:'}</span>
                    <div className="text-right">
                      <span className="font-bold text-slate-800">{(parseFloat(worker.total_cost_with_employer) || calculateTotalCost(worker.payment_amount, worker.employer_cost_percentage || 25, worker.management_bonus || 0)).toLocaleString()} {language === 'he' ? '₪' : 'ILS'}</span>
                      <div className="text-[10px] text-emerald-600 leading-none">+{parseFloat(worker.employer_cost_percentage) || 25}%</div>
                    </div>
                  </div>
                </div>

                {worker.accounting_employee_id && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-2">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{language === 'he' ? 'מס\' עובד (שכר):' : 'Accounting ID:'} {worker.accounting_employee_id}</span>
                  </div>
                )}
                {worker.email && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{worker.email}</span>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-50 p-3 flex gap-2 border-t border-slate-100">
                <Button size="sm" variant="outline" onClick={() => setShowBankTransfer({ worker, month: selectedMonth })} className="flex-1 bg-white hover:bg-slate-100 text-slate-700" disabled={!worker.bank_account}>
                  <Send className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />{language === 'he' ? 'העברה' : 'Transfer'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowRateHistory(worker.id)} className="flex-1 bg-white hover:bg-slate-100 text-slate-700">
                  <History className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" />{language === 'he' ? 'תעריפים' : 'Rates'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {workers.map((worker) => (
            <div key={worker.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md hover:border-slate-300 transition-all">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <Avatar className="h-12 w-12 border bg-slate-50 text-slate-600 shrink-0">
                  <AvatarFallback className="font-semibold">{getInitials(worker.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800 text-lg truncate shrink-0 max-w-[200px] lg:max-w-xs">{worker.full_name}</span>
                    <div className="hidden md:flex items-center gap-1.5 flex-wrap">
                      {worker.job_position_name && <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none font-medium">{worker.job_position_name}</Badge>}
                      {worker.secondary_job_position_name && <Badge variant="outline" className="text-slate-600 font-normal bg-white">{worker.secondary_job_position_name}</Badge>}
                      {(worker.job_position_names || []).map((posName, idx) => (
                        <Badge key={idx} variant="outline" className="text-slate-600 font-normal bg-white">{posName}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {worker.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 opacity-70" />{worker.phone}</span>}
                    <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 opacity-70" />{(parseFloat(worker.payment_amount) || 0).toLocaleString()} {language === 'he' ? '₪' : 'ILS'} · +{parseFloat(worker.employer_cost_percentage) || 25}%</span>
                    {worker.accounting_employee_id && <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 opacity-70" />{worker.accounting_employee_id}</span>}
                  </div>
                  <div className="flex md:hidden items-center gap-1.5 mt-2 flex-wrap">
                      {worker.job_position_name && <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none font-medium">{worker.job_position_name}</Badge>}
                      {worker.secondary_job_position_name && <Badge variant="outline" className="text-slate-600 font-normal bg-white">{worker.secondary_job_position_name}</Badge>}
                      {(worker.job_position_names || []).map((posName, idx) => (
                        <Badge key={idx} variant="outline" className="text-slate-600 font-normal bg-white">{posName}</Badge>
                      ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 md:gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-purple-700 hover:bg-purple-50" onClick={() => setShowRateHistory(worker.id)} title={language === 'he' ? 'תעריפים' : 'Rates'}>
                  <History className="w-4 h-4 md:mr-1.5 rtl:md:mr-0 rtl:md:ml-1.5" />
                  <span className="hidden md:inline">{language === 'he' ? 'תעריפים' : 'Rates'}</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleStartEdit(worker)} title={t('edit')}>
                  <Edit className="w-4 h-4 md:mr-1.5 rtl:md:mr-0 rtl:md:ml-1.5" />
                  <span className="hidden md:inline">{t('edit')}</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-red-700 hover:bg-red-50" onClick={() => { if (window.confirm(t('confirm_delete_worker', { workerName: worker.full_name }))) { onDelete(worker.id); } }} title={t('delete')}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Modals */}
      {showBankTransfer && (
        <WorkerBankTransfer
          worker={showBankTransfer.worker}
          month={showBankTransfer.month}
          onComplete={() => {
            setShowBankTransfer(null);
            // Optionally refresh data here
          }}
          onClose={() => setShowBankTransfer(null)}
        />
      )}

      {showRateHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {language === 'he' ? 'היסטוריית תעריפים' : 'Rate History'}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowRateHistory(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4">
              <WorkerRateHistory workerId={showRateHistory} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}