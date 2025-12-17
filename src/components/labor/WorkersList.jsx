import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, X, Save, User, Phone, Mail, DollarSign, Wallet, FileText, Send, History } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import WorkerBankTransfer from "./WorkerBankTransfer";
import WorkerRateHistory from "./WorkerRateHistory";

export default function WorkersList({ workers, positions, onAdd, onUpdate, onDelete }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const { t, language } = useLanguage();

  const [showBankTransfer, setShowBankTransfer] = useState(null);
  const [showRateHistory, setShowRateHistory] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Helper function to calculate total cost
  const calculateTotalCost = (baseAmount, percentage) => {
    const numericBaseAmount = parseFloat(baseAmount) || 0;
    const numericPercentage = parseFloat(percentage) || 0;
    return numericBaseAmount * (1 + numericPercentage / 100);
  };

  const initialFormData = {
    full_name: "",
    phone: "",
    email: "",
    id_number: "",
    job_position_id: "",
    job_position_name: "",
    secondary_job_position_id: "",
    secondary_job_position_name: "",
    job_position_ids: [], // Array of position IDs
    job_position_names: [], // Array of position names
    section: "",
    payment_type: "monthly",
    payment_amount: 0,
    employer_cost_percentage: 25,
    total_cost_with_employer: 0,
    bank_name: "",
    bank_branch: "",
    bank_account: "",
    tax_credit_points: 2.25,
    start_date: new Date().toISOString().split('T')[0],
    is_active: true,
    notes: ""
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleStartAdd = () => {
    setFormData(initialFormData);
    setIsAdding(true);
    setEditingId(null);
  };

  const handleStartEdit = (worker) => {
    const workerPaymentAmount = parseFloat(worker.payment_amount) || 0;
    const workerEmployerCostPercentage = parseFloat(worker.employer_cost_percentage) || 25;
    const calculatedTotalCost = calculateTotalCost(workerPaymentAmount, workerEmployerCostPercentage);

    setFormData({
      full_name: worker.full_name || "",
      phone: worker.phone || "",
      email: worker.email || "",
      id_number: worker.id_number || "",
      job_position_id: worker.job_position_id || "",
      job_position_name: worker.job_position_name || "",
      secondary_job_position_id: worker.secondary_job_position_id || "",
      secondary_job_position_name: worker.secondary_job_position_name || "",
      job_position_ids: worker.job_position_ids || [],
      job_position_names: worker.job_position_names || [],
      section: worker.section || "",
      payment_type: worker.payment_type || "monthly",
      payment_amount: workerPaymentAmount,
      employer_cost_percentage: workerEmployerCostPercentage,
      total_cost_with_employer: parseFloat(worker.total_cost_with_employer) || calculatedTotalCost,
      bank_name: worker.bank_name || "",
      bank_branch: worker.bank_branch || "",
      bank_account: worker.bank_account || "",
      tax_credit_points: parseFloat(worker.tax_credit_points) || 2.25,
      start_date: worker.start_date || new Date().toISOString().split('T')[0],
      is_active: worker.is_active !== false,
      notes: worker.notes || ""
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
    } else {
      const newPaymentAmount = parseFloat(position?.default_payment_amount) || 0;
      const totalCost = calculateTotalCost(newPaymentAmount, formData.employer_cost_percentage);

      setFormData(prev => ({
        ...prev,
        job_position_id: positionId,
        job_position_name: position?.name || "",
        section: position?.section || "",
        payment_type: position?.default_payment_type || "monthly",
        payment_amount: newPaymentAmount,
        total_cost_with_employer: totalCost
      }));
    }
  };

  const handleMultiplePositionsChange = (positionId) => {
    const position = positions.find(p => p.id === positionId);
    if (!position) return;

    setFormData(prev => {
      const currentIds = prev.job_position_ids || [];
      const currentNames = prev.job_position_names || [];
      
      // Check if already selected
      const isSelected = currentIds.includes(positionId);
      
      if (isSelected) {
        // Remove position
        return {
          ...prev,
          job_position_ids: currentIds.filter(id => id !== positionId),
          job_position_names: currentNames.filter(name => name !== position.name)
        };
      } else {
        // Add position
        return {
          ...prev,
          job_position_ids: [...currentIds, positionId],
          job_position_names: [...currentNames, position.name]
        };
      }
    });
  };

  const handlePaymentAmountChange = (value) => {
    const amount = parseFloat(value) || 0;
    const totalCost = calculateTotalCost(amount, formData.employer_cost_percentage);

    setFormData({
      ...formData,
      payment_amount: amount,
      total_cost_with_employer: totalCost
    });
  };

  const handleEmployerCostChange = (value) => {
    const percentage = parseFloat(value) || 0;
    const totalCost = calculateTotalCost(formData.payment_amount, percentage);

    setFormData({
      ...formData,
      employer_cost_percentage: percentage,
      total_cost_with_employer: totalCost
    });
  };

  const handleSave = async () => {
    if (!formData.full_name || !formData.job_position_id || !formData.payment_amount) {
      alert(t('required_fields'));
      return;
    }

    // Ensure total_cost_with_employer is up-to-date before saving
    const finalTotalCost = calculateTotalCost(formData.payment_amount, formData.employer_cost_percentage);

    const dataToSave = {
      ...formData,
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
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">{t('workers')}</h3>
        {!isAdding && !editingId && (
          <Button onClick={handleStartAdd} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            {t('add_worker')}
          </Button>
        )}
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
                            ({position.default_payment_amount} {t('currency')})
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
                <Label>{language === 'he' ? 'תפקידים נוספים' : 'Additional Positions'} - {t('optional')}</Label>
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex flex-wrap gap-2">
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
            </div>

            {formData.payment_amount > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">
                      {language === 'he' ? 'שכר בסיס' : 'Base Salary'}
                    </p>
                    <p className="text-xl font-bold text-gray-800">
                      {formData.payment_amount.toLocaleString()} {t('currency')}
                    </p>
                    <p className="text-xs text-gray-500">{paymentTypeSuffixes[formData.payment_type]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">
                      {language === 'he' ? 'עלות כוללת למעסיק' : 'Total Employer Cost'}
                    </p>
                    <p className="text-xl font-bold text-green-700">
                      {formData.total_cost_with_employer.toLocaleString()} {t('currency')}
                    </p>
                    <p className="text-xs text-green-600">
                      +{formData.employer_cost_percentage}% ({(formData.total_cost_with_employer - formData.payment_amount).toLocaleString()} {t('currency')})
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workers.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            <p className="text-lg">{t('no_workers_yet')}</p>
            <p className="text-sm">{t('add_first_worker')}</p>
          </div>
        ) : (
          workers.map((worker) => (
            <Card key={worker.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-5 h-5 text-blue-600" />
                      <h4 className="font-bold text-lg">{worker.full_name}</h4>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge className="bg-purple-100 text-purple-800">
                        {worker.job_position_name}
                      </Badge>
                      {worker.secondary_job_position_name && (
                        <Badge className="bg-blue-100 text-blue-800">
                          {worker.secondary_job_position_name}
                        </Badge>
                      )}
                      {(worker.job_position_names || []).map((posName, idx) => (
                        <Badge key={idx} className="bg-green-100 text-green-800">
                          {posName}
                        </Badge>
                      ))}
                    </div>
                    {worker.id_number && (
                      <p className="text-xs text-gray-500 mt-1">
                        {t('id_number')}: {worker.id_number}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStartEdit(worker)}
                      title={t('edit')}
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (window.confirm(t('confirm_delete_worker', { workerName: worker.full_name }))) {
                          onDelete(worker.id);
                        }
                      }}
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {worker.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{worker.phone}</span>
                    </div>
                  )}
                  {worker.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{worker.email}</span>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-3 mt-3">
                    <div className="flex items-center gap-2 text-gray-700 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold">
                        {language === 'he' ? 'שכר בסיס:' : 'Base:'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowRateHistory(worker.id)}
                        className="underline decoration-dotted hover:text-blue-700"
                        title={language === 'he' ? 'צפה בהיסטוריית תעריפים' : 'View rate history'}
                      >
                        {(parseFloat(worker.payment_amount) || 0).toLocaleString()} {t('currency')}
                        {paymentTypeSuffixes[worker.payment_type]}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-green-700 font-bold">
                      <span className="text-xs">
                        {language === 'he' ? 'עלות כוללת:' : 'Total Cost:'}
                      </span>
                      <span>
                        {(parseFloat(worker.total_cost_with_employer) || calculateTotalCost(worker.payment_amount, worker.employer_cost_percentage || 25)).toLocaleString()} {t('currency')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      +{parseFloat(worker.employer_cost_percentage) || 25}% {language === 'he' ? 'עלויות מעסיק' : 'employer costs'}
                    </p>
                  </div>

                  {/* Bank Details Display */}
                  {(worker.bank_name || worker.bank_account) && (
                    <div className="bg-blue-50 rounded-lg p-3 mt-2 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-blue-900 text-xs">
                          {t('bank_details')}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-700">
                        {worker.bank_name && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('bank_name')}:</span>
                            <span className="font-medium">{worker.bank_name}</span>
                          </div>
                        )}
                        {worker.bank_branch && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('bank_branch')}:</span>
                            <span className="font-medium">{worker.bank_branch}</span>
                          </div>
                        )}
                        {worker.bank_account && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('bank_account')}:</span>
                            <span className="font-medium">{worker.bank_account}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowBankTransfer({ worker, month: selectedMonth })}
                    className="text-green-700 hover:bg-green-50"
                    disabled={!worker.bank_account}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    {language === 'he' ? 'העבר' : 'Transfer'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRateHistory(worker.id)}
                    className="text-purple-700 hover:bg-purple-50"
                  >
                    <History className="w-4 h-4 mr-1" />
                    {language === 'he' ? 'תעריפים' : 'Rates'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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