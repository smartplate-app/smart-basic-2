import React, { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, User, Check, ChevronDown } from "lucide-react";

export default function WorkerSelector({ 
  workers, 
  positions, 
  selectedWorkerId, 
  onSelectWorker, 
  targetPositionId,
  isRTL,
  language
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupByDepartment, setGroupByDepartment] = useState(true);

  const selectedWorker = workers.find(w => w.id === selectedWorkerId);

  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      if (!searchQuery) return true;
      return w.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [workers, searchQuery]);

  const groupedWorkers = useMemo(() => {
    const isTarget = (w) => w.job_position_id === targetPositionId || w.secondary_job_position_id === targetPositionId || (w.job_position_ids || []).includes(targetPositionId);
    
    if (!groupByDepartment) {
      const sorted = [...filteredWorkers].sort((a, b) => {
        const aIsTarget = isTarget(a);
        const bIsTarget = isTarget(b);
        if (aIsTarget && !bIsTarget) return -1;
        if (!aIsTarget && bIsTarget) return 1;
        return 0;
      });
      return { all: sorted };
    }
    
    const groups = {};
    const targetPositionName = positions?.find(p => p.id === targetPositionId)?.name;
    
    filteredWorkers.forEach(w => {
      const isTargetPos = isTarget(w);
      let groupName = w.job_position_name || (language === 'he' ? 'כללי' : 'General');
      
      if (isTargetPos && targetPositionName) {
        groupName = targetPositionName;
      }
      
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(w);
    });
    
    const sortedGroups = {};
    if (targetPositionName && groups[targetPositionName]) {
      sortedGroups[targetPositionName] = groups[targetPositionName];
    }
    Object.keys(groups).sort().forEach(key => {
      if (key !== targetPositionName) {
        sortedGroups[key] = groups[key];
      }
    });
    return sortedGroups;
  }, [filteredWorkers, groupByDepartment, language, targetPositionId, positions]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          role="combobox" 
          aria-expanded={open}
          className={`w-full h-11 justify-between bg-white border-gray-300 hover:bg-gray-50 focus:ring-[#d4a373] ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          {selectedWorker ? (
            <span className="truncate">{selectedWorker.full_name}</span>
          ) : (
            <span className="text-gray-500">{language === 'he' ? 'בחר עובד...' : 'Select worker...'}</span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="z-[10010] p-0 bg-white border shadow-xl rounded-xl overflow-hidden" 
        style={{ width: "var(--radix-popover-trigger-width)", minWidth: "250px" }}
        align={isRTL ? "end" : "start"}
      >
        <div className={`p-3 border-b bg-slate-50/50 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Checkbox 
                id="group-departments" 
                checked={groupByDepartment} 
                onCheckedChange={setGroupByDepartment}
                className="data-[state=checked]:bg-[#d4a373] data-[state=checked]:border-[#d4a373]"
              />
              <label htmlFor="group-departments" className="text-sm font-medium leading-none cursor-pointer">
                {language === 'he' ? 'הצג רשימה לפי מחלקות' : 'Group by departments'}
              </label>
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {language === 'he' ? 'חיפוש וסינון עובדים' : 'Search & Filter Workers'}
            </div>
          </div>
          
          <div className="relative">
            <Search className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-slate-400`} />
            <Input
              placeholder={language === 'he' ? '...הקלד שם עובד' : 'Type worker name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`h-9 bg-white border-slate-200 focus-visible:ring-[#d4a373] ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'}`}
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto p-2" dir={isRTL ? 'rtl' : 'ltr'}>
          {Object.keys(groupedWorkers).length === 0 || (groupedWorkers.all && groupedWorkers.all.length === 0) ? (
            <div className="py-6 text-center text-sm text-slate-500">
              {language === 'he' ? 'לא נמצאו עובדים' : 'No workers found'}
            </div>
          ) : (
            Object.entries(groupedWorkers).map(([groupName, groupWorkers]) => (
              <div key={groupName} className="mb-4 last:mb-0">
                {groupByDepartment && (
                  <div className={`text-xs font-bold text-slate-400 mb-2 px-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {groupName}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {groupWorkers.map(w => {
                    const isTargetPos = w.job_position_id === targetPositionId || w.secondary_job_position_id === targetPositionId || (w.job_position_ids || []).includes(targetPositionId);
                    const isSelected = w.id === selectedWorkerId;
                    
                    return (
                      <button
                        key={w.id}
                        disabled={!isTargetPos && !isSelected}
                        onClick={() => {
                          if (isTargetPos || isSelected) {
                            onSelectWorker(w.id);
                            setOpen(false);
                          }
                        }}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all
                          ${isSelected 
                            ? 'bg-[#d4a373] text-white shadow-sm' 
                            : isTargetPos 
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-sm' 
                              : 'bg-white border border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                          }
                        `}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {!isSelected && !isTargetPos && <User className="w-3.5 h-3.5 opacity-40" />}
                        {w.full_name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}