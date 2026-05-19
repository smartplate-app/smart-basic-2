import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Plus, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  return (
    <DragDropContext onDragStart={() => setIsDraggingShift(true)} onDragEnd={(result) => { setIsDraggingShift(false); handleDragEnd(result); }}>
      <div ref={scheduleTableRef} className="overflow-x-auto bg-white p-4 rounded-lg -mx-4 md:mx-0" dir={isRTL ? 'rtl' : 'ltr'}>
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50">
              <th className={`border p-2 text-sm font-semibold ${isRTL ? 'text-right' : 'text-left'} min-w-[100px]`}>
                {t('position')}
              </th>
              {days.map(day => {
                const dayDate = moment(weekStartDate).day(days.indexOf(day));
                return (
                  <th key={day.key} className="border p-2 text-sm font-semibold min-w-[120px]">
                    <div className="flex flex-col gap-1">
                      <div>{day.label}</div>
                      <div className="text-xs text-gray-500 font-normal">
                        {dayDate.format('DD/MM')}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <Droppable droppableId="positions-list" type="POSITION">
            {(provided) => (
              <tbody ref={provided.innerRef} {...provided.droppableProps}>
                {(positionOrder.length > 0 ? positionOrder : positions.map(p => p.id))
                  .map((positionId, posIndex) => {
                    const position = positions.find(p => p.id === positionId);
                    if (!position) return null;
                    return (
                      <Draggable key={position.id} draggableId={`position-${position.id}`} index={posIndex}>
                        {(provided, snapshot) => (
                          <tr 
                            ref={provided.innerRef} 
                            {...provided.draggableProps}
                            className={snapshot.isDragging ? 'bg-purple-50' : ''}
                          >
                            <td className={`border p-2 font-medium ${isRTL ? 'text-right' : 'text-left'}`} style={{ backgroundColor: hexToRgba((position.color || '#E6F4FF'), 0.25) }}>
                              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div 
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: position.color || '#1E88E5' }} />
                                <span className={`text-[20px] font-extrabold ${['text-blue-800','text-gray-800'][posIndex % 2]}`}>{position.name}</span>
                                <Button size="icon" variant="ghost" className="h-7 w-7" title={language === 'he' ? 'הוסף שורת תפקיד' : 'Add position row'} onClick={() => addPositionRow(position.id)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                            {days.map(day => {
                              const dateStr = moment(weekStartDate).day(days.indexOf(day)).format('YYYY-MM-DD');
                              const positionRows = (schedule?.position_rows || []).filter(r => r.position_id === position.id);

                              return (
                                <td
                                  key={`${day.key}-${position.id}`}
                                  className={`border p-1 ${isRTL ? 'text-right' : 'text-left'}`}
                                >
                                  {[null, ...positionRows].map((row, rIdx) => {
                                    const rowId = row?.row_id;
                                    const droppableId = `${day.key}|${position.id}|${rowId || 'default'}`;
                                    const shiftsForCell = (schedule?.shifts || []).filter(s => s.day === day.key && s.job_position_id === position.id && ((rowId && s.position_row_id === rowId) || (!rowId && !s.position_row_id)));
                                    return (
                                      <div key={rIdx} className="mb-1">
                                        {row && (
                                          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <div className="text-[11px] font-semibold text-gray-600">
                                              {row.label}
                                            </div>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-6 w-6" title={language === 'he' ? 'עוד פעולות' : 'More actions'}>
                                                  <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align={isRTL ? 'start' : 'end'} dir={isRTL ? 'rtl' : 'ltr'}>
                                                <DropdownMenuItem onClick={() => openRowTimeDialog(row)}>
                                                  {language === 'he' ? 'קבע שעות לשורה' : 'Set row hours'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => {
                                                  const name = prompt(language === 'he' ? 'שם לשורה' : 'Row name', row.label || '');
                                                  if (name !== null) {
                                                    const updated = (schedule?.position_rows || []).map(rr => rr.row_id === row.row_id ? { ...rr, label: name } : rr);
                                                    setSchedule({ ...(schedule || {}), position_rows: updated });
                                                  }
                                                }}>
                                                  {language === 'he' ? 'שנה שם שורה' : 'Rename row'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleCellDoubleClick(day.key, dateStr, position.id, rowId)}>
                                                  {language === 'he' ? 'הוסף משמרת' : 'Add shift'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => removePositionRow(rowId)} className="text-red-600">
                                                  {language === 'he' ? 'מחק שורה' : 'Delete row'}
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        )}
                                        <Droppable droppableId={droppableId} type="SHIFT">
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.droppableProps}
                                              className={`space-y-1 rounded transition-colors min-h-[40px] group`}
                                              style={{ backgroundColor: hexToRgba((position.color || '#E6F4FF'), snapshot.isDraggingOver ? 0.25 : 0.08) }}
                                            >
                                              {shiftsForCell.length === 0 ? (
                                                <div className={`text-xs text-gray-400 py-2 ${isRTL ? 'text-right' : 'text-center'}`}>
                                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700" onClick={() => handleCellDoubleClick(day.key, dateStr, position.id, rowId)}>
                                                    {t('add')} +
                                                  </Button>
                                                </div>
                                              ) : (
                                                shiftsForCell.map((shift, idx) => (
                                                  <Draggable key={getShiftDraggableId(shift)} draggableId={getShiftDraggableId(shift)} index={idx}>
                                                    {(provided, snapshot) => (
                                                      <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`p-2 rounded border text-xs cursor-pointer group relative select-none touch-none ${snapshot.isDragging ? 'shadow-lg' : ''} ${isRTL ? 'text-right' : 'text-left'} ${snapshot.isDragging ? 'will-change-transform' : ''}`}
                                                        style={{
                                                          ...provided.draggableProps.style,
                                                          backgroundColor: hexToRgba((position.color || '#E6F4FF'), 0.2),
                                                          borderColor: hexToRgba((position.color || '#E6F4FF'), 0.5),
                                                          zIndex: snapshot.isDragging ? 1000 : 'auto'
                                                        }}
                                                        onClick={() => { if (isDraggingShift) return; setEditingShift({ ...shift, __originalKey: getShiftDraggableId(shift) }); setSelectedCell({ day: day.key, date: dateStr, positionId: position.id, rowId }); setShowShiftDialog(true); }}
                                                        data-drag-id={getShiftDraggableId(shift)}
                                                      >
                                                        <div className={`absolute top-1 ${isRTL ? 'right-1' : 'left-1'} cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 opacity-100 transition-opacity h-6 w-6 flex items-center justify-center`} {...provided.dragHandleProps} onMouseDown={(e) => e.preventDefault()} aria-label={t('drag')}>
                                                          <GripVertical className="h-4 w-4" />
                                                        </div>
                                                        <div className={`font-extrabold text-[16px] ${isRTL ? 'text-right pr-5' : 'text-left pl-5'}`}>{shift.worker_name}</div>
                                                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse pr-5' : 'pl-5'}`}>
                                                          <span className="text-[11px]">{shift.start_time}-{shift.end_time}</span>
                                                          <span className="shift-cost">{formatCurrency(shift.payment_for_shift || 0)}</span>
                                                        </div>
                                                        {shift.overtime_rate && shift.overtime_rate !== 'regular' && (
                                                          <Badge variant="secondary" className={`mt-1 ${isRTL ? 'mr-5' : 'ml-5'}`}>{shift.overtime_rate === '125' ? '125%' : (shift.overtime_rate === '150' ? '150%' : '')}</Badge>
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
                                </td>
                              );
                            })}
                          </tr>
                        )}
                      </Draggable>
                    );
                  })}
                {provided.placeholder}
              </tbody>
            )}
          </Droppable>
        </table>
      </div>
    </DragDropContext>
  );
}