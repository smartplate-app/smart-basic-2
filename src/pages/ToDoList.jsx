import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Plus, CheckCircle, Circle, Trash2, ChevronLeft, ChevronRight, Edit } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addWeeks, addMonths, subWeeks, subMonths } from "date-fns";
import { useLanguage } from "../components/LanguageProvider";

export default function ToDoListPage() {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list"); // month, list, schedule
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [viewingTodo, setViewingTodo] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    category: "food_cost",
    priority: "medium",
    image_url: ""
  });

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      // Support admin controlling a sub-user
      const workingEmail = user.acting_as_store_email || user.acting_as_user_email || user.email;

      // Determine owner (head) account if this user is a store manager/worker
      let ownerEmail = user.store_user_owner_email || null;
      if (!ownerEmail) {
        try {
          const records = await base44.entities.StoreUser.filter({ user_email: workingEmail, is_active: true });
          if (records.length > 0) ownerEmail = records[0].owner_email || null;
        } catch (_) {}
      }

      if (ownerEmail) {
        // Show BOTH the owner's tasks and the sub-user's tasks
        const [ownerTodos, myTodos] = await Promise.all([
          base44.entities.ToDo.filter({ created_by: ownerEmail }, "-date"),
          base44.entities.ToDo.filter({ created_by: workingEmail }, "-date")
        ]);
        const merged = [...ownerTodos, ...myTodos];
        // De-duplicate by id
        const uniq = [];
        const seen = new Set();
        for (const t of merged) { if (t?.id && !seen.has(t.id)) { seen.add(t.id); uniq.push(t); } }
        setTodos(uniq);
      } else {
        const data = await base44.entities.ToDo.filter({ created_by: workingEmail }, "-date");
        setTodos(data);
      }
    } catch (error) {
      console.error("Error loading todos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTodo) {
        await base44.entities.ToDo.update(editingTodo.id, formData);
      } else {
        await base44.entities.ToDo.create(formData);
      }
      await loadTodos();
      setShowForm(false);
      setEditingTodo(null);
      setFormData({
        title: "",
        description: "",
        date: format(new Date(), 'yyyy-MM-dd'),
        category: "food_cost",
        priority: "medium",
        image_url: ""
      });
    } catch (error) {
      console.error("Error saving todo:", error);
    }
  };

  const handleEdit = (todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description || "",
      date: todo.date,
      category: todo.category,
      priority: todo.priority,
      image_url: todo.image_url || ""
    });
    setShowForm(true);
  };

  const toggleComplete = async (todo) => {
    try {
      await base44.entities.ToDo.update(todo.id, {
        completed: !todo.completed,
        completed_at: !todo.completed ? new Date().toISOString() : null
      });
      await loadTodos();
    } catch (error) {
      console.error("Error updating todo:", error);
    }
  };

  const deleteTodo = async (id) => {
    if (!confirm(isRTL ? 'למחוק משימה?' : 'Delete task?')) return;
    try {
      await base44.entities.ToDo.delete(id);
      await loadTodos();
    } catch (error) {
      console.error("Error deleting todo:", error);
    }
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  };

  const getMonthDays = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    
    // Add empty cells before the first day to align with the correct day of week
    const firstDayOfWeek = start.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const emptyDays = Array(firstDayOfWeek).fill(null);
    
    return [...emptyDays, ...days];
  };

  const getTodosForDate = (date) => {
    return todos.filter(todo => isSameDay(new Date(todo.date), date));
  };

  const getMonthlySchedule = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const completedTodos = todos.filter(todo => 
      todo.completed && 
      new Date(todo.completed_at) >= start && 
      new Date(todo.completed_at) <= end
    );
    
    const byCategory = {};
    completedTodos.forEach(todo => {
      if (!byCategory[todo.category]) {
        byCategory[todo.category] = [];
      }
      byCategory[todo.category].push(todo);
    });
    
    return byCategory;
  };

  const categoryColors = {
    food_cost: "bg-orange-100 text-orange-800",
    labor_cost: "bg-blue-100 text-blue-800",
    buildup: "bg-purple-100 text-purple-800",
    money_flow: "bg-green-100 text-green-800"
  };

  const categoryLabels = {
    food_cost: isRTL ? 'עלות מזון' : 'Food Cost',
    labor_cost: isRTL ? 'עלות עבודה' : 'Labor Cost',
    buildup: isRTL ? 'בנייה' : 'Buildup',
    money_flow: isRTL ? 'תזרים כספי' : 'Money Flow'
  };

  const priorityColors = {
    low: "border-l-green-500",
    medium: "border-l-yellow-500",
    high: "border-l-red-500"
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full">
        {/* Header */}
        <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h1 className="text-3xl font-bold">{isRTL ? 'רשימת משימות' : 'To-Do List'}</h1>
          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">{isRTL ? 'לוח שנה' : 'Calendar'}</SelectItem>
                <SelectItem value="list">{isRTL ? 'רשימה' : 'List'}</SelectItem>
                <SelectItem value="schedule">{isRTL ? 'סיכום חודשי' : 'Monthly Summary'}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowForm(!showForm)} className="bg-gray-900 hover:bg-gray-800">
              <Plus className="w-4 h-4 mr-2" />
              {isRTL ? 'משימה חדשה' : 'New Task'}
            </Button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingTodo ? (isRTL ? 'עריכת משימה' : 'Edit Task') : (isRTL ? 'משימה חדשה' : 'New Task')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder={isRTL ? 'כותרת' : 'Title'}
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
                <Textarea
                  placeholder={isRTL ? 'תיאור' : 'Description'}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                  <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food_cost">{isRTL ? 'עלות מזון' : 'Food Cost'}</SelectItem>
                      <SelectItem value="labor_cost">{isRTL ? 'עלות עבודה' : 'Labor Cost'}</SelectItem>
                      <SelectItem value="buildup">{isRTL ? 'בנייה' : 'Buildup'}</SelectItem>
                      <SelectItem value="money_flow">{isRTL ? 'תזרים כספי' : 'Money Flow'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{isRTL ? 'נמוך' : 'Low'}</SelectItem>
                      <SelectItem value="medium">{isRTL ? 'בינוני' : 'Medium'}</SelectItem>
                      <SelectItem value="high">{isRTL ? 'גבוה' : 'High'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Image upload */}
                <div className="space-y-2">
                  <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'תמונה (אופציונלי)' : 'Image (optional)'}
                  </div>
                  {formData.image_url && (
                    <img src={formData.image_url} alt="preview" className="h-24 w-24 object-cover rounded border" />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const { file_url } = await base44.integrations.Core.UploadFile({ file });
                      setFormData((prev) => ({ ...prev, image_url: file_url }));
                    }}
                  />
                </div>

                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Button type="submit">{editingTodo ? (isRTL ? 'עדכן' : 'Update') : (isRTL ? 'שמור' : 'Save')}</Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setShowForm(false);
                    setEditingTodo(null);
                  }}>
                    {isRTL ? 'ביטול' : 'Cancel'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        {viewMode === 'month' && (
          <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="outline"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-bold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button
              variant="outline"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {['food_cost', 'labor_cost', 'buildup', 'money_flow'].map(category => {
              const categoryTodos = todos.filter(t => t.category === category);
              if (categoryTodos.length === 0) return null;
              return (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className={`px-3 py-1 rounded text-sm ${categoryColors[category]}`}>
                        {categoryLabels[category]}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({categoryTodos.filter(t => t.completed).length}/{categoryTodos.length})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {categoryTodos.map(todo => (
                      <div
                        key={todo.id}
                        className={`p-4 rounded border-l-4 ${priorityColors[todo.priority]} bg-white cursor-pointer hover:shadow-md transition-shadow`}
                        onClick={() => toggleComplete(todo)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setViewingTodo(todo);
                        }}
                      >
                        <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {todo.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className={`font-medium ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                              {todo.title}
                            </p>
                            {todo.description && (
                              <p className="text-sm text-gray-600 mt-1">{todo.description}</p>
                            )}
                            <div className={`flex items-center gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <span className="text-xs text-gray-500">
                                {format(new Date(todo.date), 'MMM d, yyyy')}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                todo.priority === 'high' ? 'bg-red-100 text-red-800' :
                                todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {todo.priority}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTodo(todo.id);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Month View */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-bold text-sm py-2">
                {day}
              </div>
            ))}
            {getMonthDays().map((day, index) => {
              // Empty cell for alignment
              if (day === null) {
                return <div key={`empty-${index}`} className="min-h-[100px]" />;
              }
              
              const dayTodos = getTodosForDate(day);
              const completedCount = dayTodos.filter(t => t.completed).length;
              return (
                <Card 
                  key={day.toISOString()} 
                  className="min-h-[100px] p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                  onDoubleClick={(e) => {
                    // Only trigger if not clicking on a task
                    if (e.target === e.currentTarget || e.target.closest('.day-number')) {
                      setFormData({
                        title: "",
                        description: "",
                        date: format(day, 'yyyy-MM-dd'),
                        category: "food_cost",
                        priority: "medium"
                      });
                      setEditingTodo(null);
                      setShowForm(true);
                    }
                  }}
                >
                  <div className="text-sm font-bold mb-1 day-number">{format(day, 'd')}</div>
                  <div className="space-y-1">
                    {dayTodos.slice(0, 3).map(todo => (
                      <div
                        key={todo.id}
                        className={`text-xs p-1 rounded truncate cursor-pointer ${categoryColors[todo.category]}`}
                        onClick={() => toggleComplete(todo)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setViewingTodo(todo);
                        }}
                      >
                        {todo.completed ? '✓ ' : ''}{todo.title}
                      </div>
                    ))}
                    {dayTodos.length > 3 && (
                      <div className="text-xs text-gray-500">+{dayTodos.length - 3} more</div>
                    )}
                  </div>
                  {dayTodos.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {completedCount}/{dayTodos.length} done
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Monthly Schedule Summary */}
        {viewMode === 'schedule' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">
              {isRTL ? 'סיכום חודשי' : 'Monthly Summary'} - {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="space-y-6">
              {Object.entries(getMonthlySchedule()).map(([category, categoryTodos]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className={`px-3 py-1 rounded ${categoryColors[category]}`}>
                        {categoryLabels[category]}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({categoryTodos.length} {isRTL ? 'משימות הושלמו' : 'tasks completed'})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {categoryTodos.map(todo => (
                        <div key={todo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                            <p className="font-medium">{todo.title}</p>
                            {todo.description && (
                              <p className="text-sm text-gray-600">{todo.description}</p>
                            )}
                          </div>
                          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="text-sm text-gray-500">
                              {format(new Date(todo.completed_at), 'MMM d')}
                            </span>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {Object.keys(getMonthlySchedule()).length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    {isRTL ? 'אין משימות שהושלמו החודש' : 'No completed tasks this month'}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* View Todo Modal */}
        <Dialog open={!!viewingTodo} onOpenChange={(open) => !open && setViewingTodo(null)}>
          <DialogContent className="max-w-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle className={isRTL ? 'text-right' : ''}>{isRTL ? 'פרטי משימה' : 'Task Details'}</DialogTitle>
            </DialogHeader>
            {viewingTodo && (
              <div className="space-y-4">
                <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="flex-1">
                    <h3 className={`text-2xl font-bold mb-2 ${isRTL ? 'text-right' : ''}`}>{viewingTodo.title}</h3>
                    <div className={`flex gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className={`px-3 py-1 rounded text-sm ${categoryColors[viewingTodo.category]}`}>
                        {categoryLabels[viewingTodo.category]}
                      </span>
                      <span className={`px-3 py-1 rounded text-sm ${
                        viewingTodo.priority === 'high' ? 'bg-red-100 text-red-800' :
                        viewingTodo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {viewingTodo.priority}
                      </span>
                      {viewingTodo.completed && (
                        <span className="px-3 py-1 rounded text-sm bg-green-100 text-green-800 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          {isRTL ? 'הושלם' : 'Completed'}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleEdit(viewingTodo);
                      setViewingTodo(null);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {isRTL ? 'ערוך' : 'Edit'}
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className={`text-sm font-semibold text-gray-600 block mb-1 ${isRTL ? 'text-right' : ''}`}>
                      {isRTL ? 'תיאור' : 'Description'}
                    </label>
                    <p className={`text-gray-800 ${isRTL ? 'text-right' : ''}`}>
                      {viewingTodo.description || (isRTL ? 'אין תיאור' : 'No description')}
                    </p>
                  </div>

                  <div>
                    <label className={`text-sm font-semibold text-gray-600 block mb-1 ${isRTL ? 'text-right' : ''}`}>
                      {isRTL ? 'תאריך' : 'Date'}
                    </label>
                    <p className={`text-gray-800 ${isRTL ? 'text-right' : ''}`}>
                      {format(new Date(viewingTodo.date), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>

                  {viewingTodo.completed && viewingTodo.completed_at && (
                    <div>
                      <label className={`text-sm font-semibold text-gray-600 block mb-1 ${isRTL ? 'text-right' : ''}`}>
                        {isRTL ? 'הושלם בתאריך' : 'Completed On'}
                      </label>
                      <p className={`text-gray-800 ${isRTL ? 'text-right' : ''}`}>
                        {format(new Date(viewingTodo.completed_at), 'EEEE, MMMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}
                </div>

                {viewingTodo.image_url && (
                  <div>
                    <label className={`text-sm font-semibold text-gray-600 block mb-1 ${isRTL ? 'text-right' : ''}`}>
                      {isRTL ? 'תמונה' : 'Image'}
                    </label>
                    <img src={viewingTodo.image_url} alt="todo" className="max-h-64 rounded border" />
                  </div>
                )}

                <div className={`flex gap-3 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Button
                    onClick={() => {
                      toggleComplete(viewingTodo);
                      setViewingTodo(null);
                    }}
                    className={viewingTodo.completed ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}
                  >
                    {viewingTodo.completed ? (isRTL ? 'סמן כלא הושלם' : 'Mark Incomplete') : (isRTL ? 'סמן כהושלם' : 'Mark Complete')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      deleteTodo(viewingTodo.id);
                      setViewingTodo(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isRTL ? 'מחק' : 'Delete'}
                  </Button>
                  <Button variant="outline" onClick={() => setViewingTodo(null)}>
                    {isRTL ? 'סגור' : 'Close'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}