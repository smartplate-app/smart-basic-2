import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Plus, MoreHorizontal, MessageCircle, Trash, Copy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import moment from "moment";

export default function WeeklyScheduleTable({
  schedule,
  setSchedule,
  positions,
  positionOrder,
  days,
  weekStartDate,
  isDraggingShift,
  setIsDraggingShift,
  handleDragEnd,
  hexToRgba,
  t,
  language,
  isRTL,
  addPositionRow,
  openRowTimeDialog,
  removePositionRow,
  handleCellDoubleClick,
  getShiftDraggableId,
  setEditingShift,
  setSelectedCell,
  setShowShiftDialog,
  formatCurrency,
  scheduleTableRef
}) {
  const sections = schedule?.sections?.length > 0 
    ? schedule.sections 
    : [{ id: 'default', name: '' }];

  const addSection = () => {
    const name = prompt(language === 'he' ? 'שם למשמרת (לדוגמה: בוקר, ערב)' : 'Shift section name (e.g. Morning, Evening)');
    if (!name) return;
    const newSection = { id: `sec_${Date.now()}`, name };
    setSchedule({
      ...(schedule || {}),
      sections: [...(schedule?.sections || []), newSection]
    });
  };

  const removeSection = (sectionId) => {
    if (confirm(language === 'he' ? 'האם אתה בטוח? פעולה זו תמחק גם את כל השיבוצים במשמרת זו.' : 'Are you sure? This will also delete all shifts in this section.')) {
      setSchedule({
        ...schedule,
        sections: (schedule.sections || []).filter(s => s.id !== sectionId),
        shifts: (schedule.shifts || []).filter(s => s.section_id !== sectionId)
      });
    }
  };

  const renameSection = (sectionId, currentName) => {
    const name = prompt(language === 'he' ? 'שם חדש:' : 'New name:', currentName);
    if (!name) return;
    setSchedule({
      ...schedule,
      sections: (schedule.sections || []).map(s => s.id === sectionId ? { ...s, name } : s)
    });
  };

  return (
    <DragDropContext 
      onDragStart={() => setIsDraggingShift(true)} 
      onDragEnd={(result) => { 
        setIsDraggingShift(false); 
        handleDragEnd(result); 
      }}
    >
      <div ref={scheduleTableRef} className="flex flex-col gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
        {sections.map((section, sIdx) => {
          const isDefaultSection = section.id === 'default';

          return (
            <div key={section.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
              {/* Section Header */}
              <div className="flex items-center justify-between p-3 border-b bg-gray-100 min-w-[800px]">
                <div className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  {section.name || (language === 'he' ? 'משמרת כללית' : 'General Shift')}
                  {!isDefaultSection && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                        <DropdownMenuItem onClick={() => renameSection(section.id, section.name)}>
                          {language === 'he' ? 'שנה שם' : 'Rename'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => removeSection(section.id)} className="text-red-600">
                          {language === 'he' ? 'מחק חלק זה' : 'Delete section'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {sIdx === 0 && (
                  <Button variant="outline" size="sm" onClick={addSection} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {language === 'he' ? 'הוסף משמרת (בוקר/ערב)' : 'Add Shift Section'}
                  </Button>
                )}
              </div>

              <div className="flex flex-col min-w-[800px]">
                {/* Table Header */}
                <div className="flex bg-gray-50 border-b">
                  <div className={`w-[140px] shrink-0 border-x p-2 text-xs font-semibold ${isRTL ? 'border-r-0' : 'border-l-0'} flex items-center`}>
                    {t('position')}
                  </div>
                  {days.map(day => {
                    const dayDate = moment(weekStartDate).day(days.indexOf(day));
                    return (
                      <div key={day.key} className="flex-1 min-w-[100px] border-r p-2 text-xs font-semibold flex flex-col justify-center items-center">
                        <div>{day.label}</div>
                        <div className="text-gray-500 font-normal">{dayDate.format('DD/MM')}</div>
                      </div>
                    );
                  })}
                </div>

                <Droppable droppableId={`positions-list-${section.id}`} type={`POSITION`}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col">
                      {(positionOrder.length > 0 ? positionOrder : positions.map(p => p.id))
                        .map((positionId, posIndex) => {
                          const position = positions.find(p => p.id === positionId);
                          if (!position) return null;
                          const positionRows = (schedule?.position_rows || []).filter(r => r.position_id === position.id);
                          const allRowsForPos = [null, ...positionRows];

                          return (
                            <Draggable key={`${section.id}-${position.id}`} draggableId={`${section.id}-pos-${position.id}`} index={posIndex}>
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef} 
                                  {...provided.draggableProps}
                                  className={`flex flex-col border-b last:border-b-0 ${snapshot.isDragging ? 'shadow-xl bg-blue-50/50 z-50 ring-1 ring-blue-200' : 'bg-white'}`}
                                >
                                  {allRowsForPos.map((row, rIdx) => {
                                    const rowId = row?.row_id;
                                    const isDefaultRow = rIdx === 0;

                                    return (
                                      <div key={rowId || 'default'} className={`flex w-full ${!isDefaultRow ? 'border-t border-gray-100' : ''}`}>
                                        {/* Position Column */}
                                        <div 
                                          className={`w-[140px] shrink-0 border-x ${isRTL ? 'border-r-0' : 'border-l-0'} p-1.5 flex items-center justify-between group/row relative`}
                                          style={{ backgroundColor: hexToRgba((position.color || '#E6F4FF'), isDefaultRow ? 0.25 : 0.1) }}
                                        >
                                          <div className={`flex items-center gap-1.5 w-full ${isRTL ? 'pr-1' : 'pl-1'}`}>
                                            {isDefaultRow ? (
                                              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0">
                                                <GripVertical className="h-4 w-4" />
                                              </div>
                                            ) : (
                                              <div className="w-4 shrink-0" /> // Spacer
                                            )}
                                            
                                            {isDefaultRow && (
                                              <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: position.color || '#1E88E5' }} />
                                            )}
                                            
                                            <span className={`text-[12px] leading-tight font-extrabold truncate ${['text-blue-800','text-gray-800'][posIndex % 2]}`}>
                                              {row?.label || position.name}
                                            </span>
                                          </div>

                                          {/* Actions Menu */}
                                          <div className="opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-6 w-6">
                                                  <MoreHorizontal className="h-3 w-3" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align={isRTL ? 'start' : 'end'} dir={isRTL ? 'rtl' : 'ltr'}>
                                                {isDefaultRow ? (
                                                  <>
                                                    <DropdownMenuItem onClick={async () => {
                                                      const name = prompt(language === 'he' ? 'ערוך שם תפקיד' : 'Edit role name', position.name);
                                                      if (name && name !== position.name) {
                                                        try {
                                                          const { base44 } = await import('@/api/base44Client');
                                                          await base44.entities.JobPosition.update(position.id, { name });
                                                          window.location.reload();
                                                        } catch (err) {}
                                                      }
                                                    }}>
                                                      {language === 'he' ? 'ערוך שם תפקיד' : 'Edit role name'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                      openRowTimeDialog({ row_id: null, position_id: position.id, default_start_time: position.default_start_time, default_end_time: position.default_end_time });
                                                    }}>
                                                      {language === 'he' ? 'קבע שעות לתפקיד' : 'Set role hours'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => addPositionRow(position.id)}>
                                                      <Plus className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                                      {language === 'he' ? 'שכפל שורת תפקיד' : 'Duplicate role row'}
                                                    </DropdownMenuItem>
                                                  </>
                                                ) : (
                                                  <>
                                                    <DropdownMenuItem onClick={() => {
                                                      const name = prompt(language === 'he' ? 'שם לתפקיד (שורה)' : 'Role name (row)', row.label || '');
                                                      if (name !== null) {
                                                        const updated = (schedule?.position_rows || []).map(rr => rr.row_id === row.row_id ? { ...rr, label: name } : rr);
                                                        setSchedule({ ...(schedule || {}), position_rows: updated });
                                                      }
                                                    }}>
                                                      {language === 'he' ? 'ערוך שם תפקיד' : 'Edit role name'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openRowTimeDialog(row)}>
                                                      {language === 'he' ? 'קבע שעות לשורה' : 'Set row hours'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => removePositionRow(rowId)} className="text-red-600">
                                                      <Trash className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                                      {language === 'he' ? 'מחק שורה' : 'Delete row'}
                                                    </DropdownMenuItem>
                                                  </>
                                                )}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </div>

                                        {/* Day Columns */}
                                        {days.map(day => {
                                          const dateStr = moment(weekStartDate).day(days.indexOf(day)).format('YYYY-MM-DD');
                                          // Add section_id to droppableId
                                          const droppableId = `${day.key}|${position.id}|${rowId || 'default'}|${section.id}`;
                                          
                                          // Filter shifts that match day, position, row, AND section
                                          const shiftsForCell = (schedule?.shifts || []).filter(s => 
                                            s.day === day.key && 
                                            s.job_position_id === position.id && 
                                            ((rowId && s.position_row_id === rowId) || (!rowId && !s.position_row_id)) &&
                                            (s.section_id === section.id || (isDefaultSection && !s.section_id))
                                          );

                                          return (
                                            <div key={day.key} className="flex-1 min-w-[100px] border-r p-1 relative">
                                              <Droppable droppableId={droppableId} type="SHIFT">
                                                {(provided, snapshot) => (
                                                  <div
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    className={`h-full min-h-[44px] space-y-1 rounded transition-colors group/cell`}
                                                    style={{ backgroundColor: snapshot.isDraggingOver ? hexToRgba((position.color || '#E6F4FF'), 0.2) : 'transparent' }}
                                                  >
                                                    {shiftsForCell.length === 0 ? (
                                                      <div className="flex items-center justify-center h-full min-h-[30px] opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                                        <Button 
                                                          variant="ghost" 
                                                          size="sm" 
                                                          className="h-6 text-[11px] text-gray-500 hover:text-gray-800" 
                                                          onClick={() => handleCellDoubleClick(day.key, dateStr, position.id, rowId, section.id)}
                                                        >
                                                          <Plus className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
                                                          {t('add')}
                                                        </Button>
                                                      </div>
                                                    ) : (
                                                      shiftsForCell.map((shift, idx) => (
                                                        <Draggable key={getShiftDraggableId(shift)} draggableId={getShiftDraggableId(shift)} index={idx}>
                                                          {(provided, snapshot) => (
                                                            <div
                                                              ref={provided.innerRef}
                                                              {...provided.draggableProps}
                                                              className={`p-1.5 rounded border text-xs cursor-pointer relative select-none touch-none ${snapshot.isDragging ? 'shadow-xl z-50' : 'hover:shadow-md'} ${isRTL ? 'text-right' : 'text-left'}`}
                                                              style={{
                                                                ...provided.draggableProps.style,
                                                                backgroundColor: hexToRgba((position.color || '#E6F4FF'), 0.2),
                                                                borderColor: hexToRgba((position.color || '#E6F4FF'), 0.5)
                                                              }}
                                                              onClick={() => { 
                                                                if (isDraggingShift) return; 
                                                                setEditingShift({ ...shift, __originalKey: getShiftDraggableId(shift) }); 
                                                                setSelectedCell({ day: day.key, date: dateStr, positionId: position.id, rowId, sectionId: section.id }); 
                                                                setShowShiftDialog(true); 
                                                              }}
                                                              data-drag-id={getShiftDraggableId(shift)}
                                                            >
                                                              <div className={`absolute top-0.5 ${isRTL ? 'right-0' : 'left-0'} cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 h-5 w-5 flex items-center justify-center`} {...provided.dragHandleProps} onMouseDown={(e) => e.preventDefault()}>
                                                                <GripVertical className="h-3 w-3" />
                                                              </div>
                                                              <div className={`font-bold text-[11px] leading-tight mb-0.5 ${isRTL ? 'pr-4' : 'pl-4'} ${!shift.worker_id ? 'text-gray-500 italic' : ''}`}>
                                                                {shift.worker_name || (language === 'he' ? 'ללא שיבוץ' : 'Unassigned')}
                                                              </div>
                                                              <div className={`flex items-center justify-between text-[10px] ${isRTL ? 'pr-4' : 'pl-4'}`}>
                                                                <span className="font-medium text-gray-700 bg-white/50 px-1 rounded">{shift.start_time}-{shift.end_time}</span>
                                                                {shift.worker_id && <span className="shift-cost opacity-80">{formatCurrency(shift.payment_for_shift || 0)}</span>}
                                                              </div>
                                                              {shift.notes && (
                                                                <div className={`flex items-center gap-1 mt-1 text-[10px] text-gray-700 font-medium ${isRTL ? 'pr-4' : 'pl-4'}`}>
                                                                  <MessageCircle className="h-3 w-3 shrink-0 text-gray-500" />
                                                                  <span className="truncate">{shift.notes}</span>
                                                                </div>
                                                              )}
                                                              {shift.overtime_rate && shift.overtime_rate !== 'regular' && (
                                                                <Badge variant="secondary" className={`mt-0.5 text-[9px] px-1 py-0 h-4 ${isRTL ? 'mr-4' : 'ml-4'}`}>
                                                                  {shift.overtime_rate === '125' ? '125%' : '150%'}
                                                                </Badge>
                                                              )}
                                                            </div>
                                                          )}
                                                        </Draggable>
                                                      ))
                                                    )}
                                                    {provided.placeholder}
                                                  </div>
                                                )}
                                              </Droppable>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}