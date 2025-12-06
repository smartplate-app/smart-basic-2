import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader, Plus, Trash2, Sparkles } from 'lucide-react';
import { useLanguage } from '../LanguageProvider';
import moment from 'moment';

export default function WorkerRequestManager({ weekStartDate, workers, positions }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAIForm, setShowAIForm] = useState(false);
  const [aiRequest, setAiRequest] = useState('');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [formData, setFormData] = useState({
    worker_id: '',
    worker_name: '',
    job_position_id: '',
    job_position_name: '',
    day_of_week: 'monday',
    start_time: '09:00',
    end_time: '17:00',
    notes: ''
  });
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  useEffect(() => {
    loadRequests();
  }, [weekStartDate]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      const workingEmail = user.acting_as_store_email || user.email;
      const data = await base44.entities.WorkerRequest.filter({
        created_by: workingEmail,
        week_start_date: weekStartDate
      });
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = (start, end) => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return ((endMinutes - startMinutes) / 60).toFixed(2);
  };

  const handleSubmit = async () => {
    try {
      const worker = workers.find(w => w.id === formData.worker_id);
      const position = positions.find(p => p.id === formData.job_position_id);
      
      const hours = calculateHours(formData.start_time, formData.end_time);
      
      await base44.entities.WorkerRequest.create({
        ...formData,
        worker_name: worker?.full_name || formData.worker_name,
        job_position_name: position?.name || formData.job_position_name,
        hours: parseFloat(hours),
        week_start_date: weekStartDate
      });

      setFormData({
        worker_id: '',
        worker_name: '',
        job_position_id: '',
        job_position_name: '',
        day_of_week: 'monday',
        start_time: '09:00',
        end_time: '17:00',
        notes: ''
      });
      setShowForm(false);
      await loadRequests();
    } catch (error) {
      console.error('Error saving request:', error);
      alert(t('error_saving'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(language === 'he' ? 'למחוק בקשה?' : 'Delete request?')) return;
    try {
      await base44.entities.WorkerRequest.delete(id);
      await loadRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  const handleAIRequest = async () => {
    if (!aiRequest.trim()) return;
    
    setAiProcessing(true);
    try {
      const workerNames = workers.map(w => w.full_name).join(', ');
      const positionNames = positions.map(p => p.name).join(', ');
      
      const prompt = `Parse this worker schedule request and extract the information.

Available workers: ${workerNames}
Available positions: ${positionNames}

Request: "${aiRequest}"

Return a JSON array of shift requests. Each request should have:
- worker_name: exact name from available workers (or as written if new)
- position_name: exact name from available positions
- day: one of [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
- start_time: HH:mm format (24h)
- end_time: HH:mm format (24h)

Example output:
[
  {"worker_name": "David", "position_name": "Waiter", "day": "monday", "start_time": "09:00", "end_time": "17:00"},
  {"worker_name": "David", "position_name": "Waiter", "day": "tuesday", "start_time": "09:00", "end_time": "17:00"}
]`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            requests: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  worker_name: { type: "string" },
                  position_name: { type: "string" },
                  day: { type: "string" },
                  start_time: { type: "string" },
                  end_time: { type: "string" }
                }
              }
            }
          }
        }
      });

      const parsedRequests = response.requests || [];
      
      // Create all requests
      for (const req of parsedRequests) {
        const worker = workers.find(w => w.full_name.toLowerCase() === req.worker_name.toLowerCase());
        const position = positions.find(p => p.name.toLowerCase() === req.position_name.toLowerCase());
        
        const hours = calculateHours(req.start_time, req.end_time);
        
        await base44.entities.WorkerRequest.create({
          worker_id: worker?.id || '',
          worker_name: req.worker_name,
          job_position_id: position?.id || '',
          job_position_name: req.position_name,
          day_of_week: req.day.toLowerCase(),
          start_time: req.start_time,
          end_time: req.end_time,
          hours: parseFloat(hours),
          week_start_date: weekStartDate,
          notes: aiRequest
        });
      }

      setAiRequest('');
      setShowAIForm(false);
      await loadRequests();
    } catch (error) {
      console.error('Error processing AI request:', error);
      alert(language === 'he' ? 'שגיאה בעיבוד הבקשה' : 'Error processing request');
    } finally {
      setAiProcessing(false);
    }
  };

  // Generate schedule from requests
  const generateSchedule = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const schedule = {};

    days.forEach(day => {
      schedule[day] = requests
        .filter(r => r.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return schedule;
  };

  const dayLabels = {
    monday: language === 'he' ? 'שני' : 'Monday',
    tuesday: language === 'he' ? 'שלישי' : 'Tuesday',
    wednesday: language === 'he' ? 'רביעי' : 'Wednesday',
    thursday: language === 'he' ? 'חמישי' : 'Thursday',
    friday: language === 'he' ? 'שישי' : 'Friday',
    saturday: language === 'he' ? 'שבת' : 'Saturday',
    sunday: language === 'he' ? 'ראשון' : 'Sunday'
  };

  const schedule = generateSchedule();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h2 className={`text-2xl font-bold text-gray-900 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Sparkles className="w-6 h-6 text-purple-600" />
            {language === 'he' ? 'בקשות עובדים' : 'Worker Requests'}
          </h2>
          <p className={`text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {language === 'he' ? 'הזן בקשות ובנה לוח משמרות אוטומטי' : 'Enter requests and build automatic schedule'}
          </p>
        </div>
        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button onClick={() => setShowAIForm(!showAIForm)} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            <Sparkles className="w-4 h-4 mr-2" />
            {language === 'he' ? 'AI - הזן בשפה חופשית' : 'AI - Free Text'}
          </Button>
          <Button onClick={() => setShowForm(!showForm)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            {language === 'he' ? 'הוסף ידנית' : 'Add Manual'}
          </Button>
        </div>
      </div>

      {/* AI Form */}
      {showAIForm && (
        <Card className="border-pink-200 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <Sparkles className="w-5 h-5" />
              {language === 'he' ? 'הזן בקשה בשפה חופשית' : 'Enter Request in Free Text'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label className={`text-base font-semibold mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'תאר את הבקשה' : 'Describe the request'}
              </Label>
              <Textarea
                value={aiRequest}
                onChange={(e) => setAiRequest(e.target.value)}
                placeholder={language === 'he' 
                  ? 'לדוגמה: "דוד רוצה לעבוד ימים א-ה, משמרות בוקר 9:00-17:00 כמלצר"\nאו: "שרה ביקשה שלישי ורביעי ערב 17:00-23:00 בבר"'
                  : 'Example: "David wants to work Sun-Thu, morning shifts 9:00-17:00 as waiter"\nOr: "Sarah requested Tuesday and Wednesday evening 17:00-23:00 at the bar"'
                }
                rows={5}
                className={`text-base ${isRTL ? 'text-right' : 'text-left'}`}
                disabled={aiProcessing}
              />
              <p className={`text-xs text-gray-500 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' 
                  ? '💡 כתוב בשפה חופשית - AI יפרק את הבקשה ויצור את כל המשמרות אוטומטית'
                  : '💡 Write in free text - AI will parse the request and create all shifts automatically'
                }
              </p>
            </div>

            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button 
                onClick={handleAIRequest} 
                disabled={aiProcessing || !aiRequest.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {aiProcessing ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'he' ? 'מעבד...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {language === 'he' ? 'צור משמרות' : 'Create Shifts'}
                  </>
                )}
              </Button>
              <Button onClick={() => setShowAIForm(false)} variant="outline" disabled={aiProcessing}>
                {language === 'he' ? 'ביטול' : 'Cancel'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      {showForm && (
        <Card className="border-purple-200 shadow-lg">
          <CardHeader className="bg-purple-50">
            <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
              {language === 'he' ? 'בקשה חדשה' : 'New Request'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className={isRTL ? 'text-right block' : 'text-left block'}>
                  {language === 'he' ? 'עובד' : 'Worker'}
                </Label>
                <Select value={formData.worker_id} onValueChange={(v) => setFormData({...formData, worker_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'he' ? 'בחר עובד' : 'Select worker'} />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className={isRTL ? 'text-right block' : 'text-left block'}>
                  {language === 'he' ? 'תפקיד' : 'Position'}
                </Label>
                <Select value={formData.job_position_id} onValueChange={(v) => setFormData({...formData, job_position_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'he' ? 'בחר תפקיד' : 'Select position'} />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className={isRTL ? 'text-right block' : 'text-left block'}>
                  {language === 'he' ? 'יום' : 'Day'}
                </Label>
                <Select value={formData.day_of_week} onValueChange={(v) => setFormData({...formData, day_of_week: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(dayLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className={isRTL ? 'text-right block' : 'text-left block'}>
                    {language === 'he' ? 'התחלה' : 'Start'}
                  </Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  />
                </div>
                <div>
                  <Label className={isRTL ? 'text-right block' : 'text-left block'}>
                    {language === 'he' ? 'סיום' : 'End'}
                  </Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className={isRTL ? 'text-right block' : 'text-left block'}>
                {language === 'he' ? 'הערות' : 'Notes'}
              </Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder={language === 'he' ? 'פרטים נוספים...' : 'Additional details...'}
                rows={2}
              />
            </div>

            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700">
                {language === 'he' ? 'שמור' : 'Save'}
              </Button>
              <Button onClick={() => setShowForm(false)} variant="outline">
                {language === 'he' ? 'ביטול' : 'Cancel'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-Generated Schedule */}
      <Card className="border-purple-300 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
            <Sparkles className="w-5 h-5" />
            {language === 'he' ? 'לוח משמרות אוטומטי' : 'Auto-Generated Schedule'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {requests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>{language === 'he' ? 'אין בקשות עדיין. הוסף בקשה כדי לראות את הלוח האוטומטי' : 'No requests yet. Add a request to see the auto schedule'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(schedule).map(([day, dayRequests]) => (
                dayRequests.length > 0 && (
                  <div key={day} className="border-b pb-4 last:border-b-0">
                    <h3 className={`font-bold text-lg text-purple-700 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {dayLabels[day]} - {moment(weekStartDate).day(day === 'sunday' ? 0 : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day) + 1).format('DD/MM')}
                    </h3>
                    <div className="space-y-2">
                      {dayRequests.map((req) => (
                        <div
                          key={req.id}
                          className={`flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className="font-semibold text-gray-900">{req.worker_name}</div>
                            <div className="text-sm text-purple-700">{req.job_position_name}</div>
                            <div className="text-sm text-gray-600">
                              {req.start_time} - {req.end_time} ({req.hours} {language === 'he' ? 'שעות' : 'hours'})
                            </div>
                            {req.notes && (
                              <div className="text-xs text-gray-500 mt-1">{req.notes}</div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(req.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}