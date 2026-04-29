import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader, Trash2, CheckSquare, Square, Search } from "lucide-react";
import { useLanguage } from "../LanguageProvider";

export default function CleanDuplicatesModal({ isOpen, onClose, items, onDelete }) {
  const { t, language } = useLanguage();
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return duplicateGroups;
    const term = searchTerm.toLowerCase();
    return duplicateGroups.filter(group => 
      group.name.toLowerCase().includes(term) ||
      group.items.some(item => 
        item.name.toLowerCase().includes(term) || 
        (item.supplier_name && item.supplier_name.toLowerCase().includes(term)) ||
        (item.catalog_number && item.catalog_number.toLowerCase().includes(term))
      )
    );
  }, [duplicateGroups, searchTerm]);

  useEffect(() => {
    if (isOpen && items.length > 0) {
      const normalize = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

      // Union-Find to cluster similar items
      const n = items.length;
      const parent = items.map((_, i) => i);
      const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
      const union = (a, b) => { parent[find(a)] = find(b); };

      for (let i = 0; i < n; i++) {
        const nameI = normalize(items[i].name);
        if (!nameI) continue;
        for (let j = i + 1; j < n; j++) {
          const nameJ = normalize(items[j].name);
          if (!nameJ) continue;
          // Exact match OR one name contains the other (partial similarity)
          if (nameI === nameJ || nameI.includes(nameJ) || nameJ.includes(nameI)) {
            union(i, j);
          }
        }
      }

      // Build groups from clusters
      const clusterMap = {};
      items.forEach((item, i) => {
        const root = find(i);
        if (!clusterMap[root]) clusterMap[root] = [];
        clusterMap[root].push(item);
      });

      const duplicates = [];
      const autoSelectIds = [];

      for (const root in clusterMap) {
        const cluster = clusterMap[root];
        if (cluster.length > 1) {
          const sorted = cluster.sort((a, b) => {
            const dateA = new Date(a.updated_date || a.created_date).getTime();
            const dateB = new Date(b.updated_date || b.created_date).getTime();
            return dateB - dateA;
          });

          duplicates.push({
            name: sorted[0].name,
            items: sorted
          });

          // Auto-select all except the newest
          sorted.slice(1).forEach(item => autoSelectIds.push(item.id));
        }
      }

      setDuplicateGroups(duplicates);
      setSelectedIds(autoSelectIds);
    }
  }, [isOpen, items]);

  const toggleItem = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length > 0) {
      setSelectedIds([]);
    } else {
      const allIds = [];
      filteredGroups.forEach(group => {
        group.items.forEach(item => allIds.push(item.id));
      });
      setSelectedIds(allIds);
    }
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    try {
      const mappingToKeep = {};
      duplicateGroups.forEach(group => {
        const keptItems = group.items.filter(item => !selectedIds.includes(item.id));
        const deletedItems = group.items.filter(item => selectedIds.includes(item.id));
        
        if (keptItems.length > 0 && deletedItems.length > 0) {
          const targetKeptItem = keptItems[0];
          deletedItems.forEach(delItem => {
            mappingToKeep[delItem.id] = targetKeptItem.id;
          });
        }
      });

      await onDelete(selectedIds, mappingToKeep);
      onClose();
    } catch (e) {
      console.error(e);
      alert((t('error_saving') || 'Error') + ': ' + (e.message || 'Failed to delete items'));
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  const totalDuplicates = duplicateGroups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{language === 'he' ? 'ניקוי פריטים כפולים' : 'Clean Duplicate Items'}</DialogTitle>
          <DialogDescription>
            {language === 'he' 
              ? 'המערכת זיהתה פריטים עם שמות זהים. בחר אילו מהם ברצונך למחוק (ברירת המחדל היא לשמור את הגרסה החדשה ביותר של כל פריט).'
              : 'The system found items with identical names. Select which ones to delete (defaults to keeping the newest version).'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6">
          {duplicateGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {language === 'he' ? 'לא נמצאו פריטים כפולים.' : 'No duplicate items found.'}
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-3 rounded-lg border gap-3">
                <span className="font-semibold shrink-0 mt-1 sm:mt-0">
                  {language === 'he' ? `נבחרו ${selectedIds.length} מתוך ${totalDuplicates} פריטים למחיקה` : `${selectedIds.length} of ${totalDuplicates} items selected for deletion`}
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className={`absolute top-2.5 ${language === 'he' ? 'right-2.5' : 'left-2.5'} text-gray-400 w-4 h-4`} />
                    <Input
                      placeholder={language === 'he' ? 'חיפוש פריט או ספק...' : 'Search item or supplier...'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`h-9 bg-white ${language === 'he' ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={toggleAll} className="gap-2 shrink-0 h-9">
                    {selectedIds.length > 0 ? (
                      <><Square className="w-4 h-4" /> {language === 'he' ? 'נקה בחירה' : 'Clear selection'}</>
                    ) : (
                      <><CheckSquare className="w-4 h-4" /> {language === 'he' ? 'בחר הכל' : 'Select all'}</>
                    )}
                  </Button>
                </div>
              </div>

              {filteredGroups.length === 0 && duplicateGroups.length > 0 && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                  {language === 'he' ? 'לא נמצאו פריטים תואמים לחיפוש.' : 'No items matched your search.'}
                </div>
              )}

              {filteredGroups.map((group, idx) => (
                <div key={idx} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 font-bold border-b text-gray-800">
                    {group.name} <span className="text-sm font-normal text-gray-500 ml-2 rtl:mr-2 rtl:ml-0">({group.items.length} {language === 'he' ? 'גרסאות' : 'versions'})</span>
                  </div>
                  <div className="divide-y">
                    {group.items.map((item, itemIdx) => {
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <label key={item.id} className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-red-50/50' : ''}`}>
                          <div className="flex items-center justify-center pt-1">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => toggleItem(item.id)}
                              className="w-5 h-5 rounded border-gray-300 accent-red-500"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`font-medium ${isSelected ? 'text-red-700 line-through opacity-70' : 'text-gray-900'}`}>
                                {item.name}
                              </span>
                              {itemIdx === 0 && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                                  {language === 'he' ? 'החדש ביותר' : 'Newest'}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                              {item.supplier_name && <span>{language === 'he' ? 'ספק:' : 'Supplier:'} {item.supplier_name}</span>}
                              {item.catalog_number && <span>{language === 'he' ? 'מק״ט:' : 'Catalog:'} {item.catalog_number}</span>}
                              {(item.price || item.price_after_discount) && (
                                <span className="font-medium text-gray-700">₪{(item.price_after_discount || item.price || 0).toFixed(2)}</span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            {language === 'he' ? 'ביטול' : 'Cancel'}
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={deleting || selectedIds.length === 0 || duplicateGroups.length === 0}
            className="gap-2"
          >
            {deleting ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {language === 'he' ? `מחק ${selectedIds.length} פריטים` : `Delete ${selectedIds.length} items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}