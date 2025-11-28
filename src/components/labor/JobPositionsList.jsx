import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, X, Save } from "lucide-react";
import { useLanguage } from "../LanguageProvider";

export default function JobPositionsList({ positions, onAdd, onUpdate, onDelete }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    section: "other",
    default_payment_type: "monthly",
    default_payment_amount: 0,
    default_start_time: "09:00",
    default_end_time: "17:00",
    is_active: true
  });
  const { t } = useLanguage();

  const handleStartAdd = () => {
    setFormData({
      name: "",
      description: "",
      section: "other",
      default_payment_type: "monthly",
      default_payment_amount: 0,
      default_start_time: "09:00",
      default_end_time: "17:00",
      is_active: true
    });
    setIsAdding(true);
    setEditingId(null);
  };

  const handleStartEdit = (position) => {
    setFormData({
      name: position.name,
      description: position.description || "",
      section: position.section || "other",
      default_payment_type: position.default_payment_type || "monthly",
      default_payment_amount: position.default_payment_amount || 0,
      default_start_time: position.default_start_time || "09:00",
      default_end_time: position.default_end_time || "17:00",
      is_active: position.is_active !== false
    });
    setEditingId(position.id);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert(t('position_name') + ' ' + t('required_fields'));
      return;
    }

    if (editingId) {
      await onUpdate(editingId, formData);
    } else {
      await onAdd(formData);
    }

    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: "", description: "", section: "other", default_payment_type: "monthly", default_payment_amount: 0, default_start_time: "09:00", default_end_time: "17:00", is_active: true });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: "", description: "", section: "other", default_payment_type: "monthly", default_payment_amount: 0, default_start_time: "09:00", default_end_time: "17:00", is_active: true });
  };

  const sectionColors = {
    kitchen: "bg-orange-100 text-orange-800",
    service: "bg-blue-100 text-blue-800",
    bar: "bg-purple-100 text-purple-800",
    management: "bg-green-100 text-green-800",
    cleaning: "bg-gray-100 text-gray-800",
    other: "bg-slate-100 text-slate-800"
  };

  const paymentTypeLabels = {
    monthly: t('monthly_salary'),
    daily: t('daily_rate'),
    hourly: t('hourly_rate')
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">{t('job_positions')}</h3>
        {!isAdding && !editingId && (
          <Button onClick={handleStartAdd} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            {t('add_position')}
          </Button>
        )}
      </div>

      {(isAdding || editingId) && (
        <Card className="border-2 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {editingId ? t('edit_position') : t('new_position')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('position_name')} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('position_name')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('section_department')}</Label>
                <Select
                  value={formData.section}
                  onValueChange={(value) => setFormData({ ...formData, section: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kitchen">{t('kitchen')}</SelectItem>
                    <SelectItem value="service">{t('service')}</SelectItem>
                    <SelectItem value="bar">{t('bar')}</SelectItem>
                    <SelectItem value="management">{t('management')}</SelectItem>
                    <SelectItem value="cleaning">{t('cleaning')}</SelectItem>
                    <SelectItem value="other">{t('other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('payment_type')}</Label>
                <Select
                  value={formData.default_payment_type}
                  onValueChange={(value) => setFormData({ ...formData, default_payment_type: value })}
                >
                  <SelectTrigger>
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
                <Label>{t('payment_amount')}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.default_payment_amount}
                  onChange={(e) => setFormData({ ...formData, default_payment_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('default_start_time') || 'שעת התחלה ברירת מחדל'}</Label>
                <Input
                  type="time"
                  value={formData.default_start_time}
                  onChange={(e) => setFormData({ ...formData, default_start_time: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('default_end_time') || 'שעת סיום ברירת מחדל'}</Label>
                <Input
                  type="time"
                  value={formData.default_end_time}
                  onChange={(e) => setFormData({ ...formData, default_end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('job_description')}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('job_description')}
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
        {positions.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            <p className="text-lg">{t('no_positions_yet')}</p>
            <p className="text-sm">{t('create_position_first')}</p>
          </div>
        ) : (
          positions.map((position) => (
            <Card key={position.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-2">{position.name}</h4>
                    <Badge className={sectionColors[position.section] || sectionColors.other}>
                      {t(position.section)}
                    </Badge>
                    
                    {position.default_payment_amount > 0 && (
                      <div className="mt-3 p-2 bg-green-50 rounded-lg">
                        <p className="text-sm font-semibold text-green-800">
                          {paymentTypeLabels[position.default_payment_type]}
                        </p>
                        <p className="text-lg font-bold text-green-900">
                          {position.default_payment_amount.toLocaleString()} {t('currency')}
                        </p>
                      </div>
                    )}
                    
                    {(position.default_start_time || position.default_end_time) && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          {t('default_hours') || 'שעות ברירת מחדל'}: {position.default_start_time || '09:00'} - {position.default_end_time || '17:00'}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStartEdit(position)}
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(position.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                {position.description && (
                  <p className="text-sm text-gray-600 mt-2">{position.description}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}