import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, CheckCircle, Circle, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addWeeks, addMonths, subWeeks, subMonths } from "date-fns";
import { useLanguage } from "../components/LanguageProvider";

export default function ToDoListPage() {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("month"); // month, list, schedule
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    category: "food_cost",
    priority: "medium"
  });

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      const data = await base44.entities.ToDo.filter({ created_by: user.email }, "-date");
      setTodos(data);
    } catch (error) {
      console.error("Error loading todos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await base44.entities.ToDo.create(formData);
      await loadTodos();
      setShowForm(false);
      setFormData({
        title: "",
        description: "",
        date: format(new Date(), 'yyyy-MM-dd'),
        category: "food_cost",
        priority: "medium"
      });
    } catch (error) {
      console.error("Error creating todo:", error);
    }
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
    return eachDayOfInterval({ start, end });
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
      <div className="max-w-7xl mx-auto">
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
              <CardTitle>{isRTL ? 'משימה חדשה' : 'New Task'}</CardTitle>
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
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Button type="submit">{isRTL ? 'שמור' : 'Save'}</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
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
            {getMonthDays().map(day => {
              const dayTodos = getTodosForDate(day);
              const completedCount = dayTodos.filter(t => t.completed).length;
              return (
                <Card key={day.toISOString()} className="min-h-[100px] p-2">
                  <div className="text-sm font-bold mb-1">{format(day, 'd')}</div>
                  <div className="space-y-1">
                    {dayTodos.slice(0, 3).map(todo => (
                      <div
                        key={todo.id}
                        className={`text-xs p-1 rounded truncate cursor-pointer ${categoryColors[todo.category]}`}
                        onClick={() => toggleComplete(todo)}
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
      </div>
    </div>
  );
}