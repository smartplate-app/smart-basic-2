import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader } from "lucide-react";

export default function TipPolicyEditor() {
  const [policies, setPolicies] = useState([]);
  const [positions, setPositions] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const u = await base44.auth.me();
        const [pol, pos] = await Promise.all([
          base44.entities.TipPolicy.list(),
          base44.entities.JobPosition.filter({ created_by: u.email }, "name")
        ]);
        setPolicies(pol || []);
        setPositions(pos || []);
        if (pol?.length) setEditing(pol[0]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const startNew = () => {
    setEditing({ policy_name: "מדיניות חדשה", percentage_allocations: [] });
  };

  const addAllocation = () => {
    setEditing((prev) => ({
      ...prev,
      percentage_allocations: [...(prev.percentage_allocations || []), { job_position_id: "", job_position_name: "", percentage: 0 }]
    }));
  };

  const updateAllocation = (idx, field, value) => {
    setEditing((prev) => {
      const arr = [...(prev.percentage_allocations || [])];
      const item = { ...arr[idx] };
      if (field === "job_position_id") {
        const pos = positions.find((p) => p.id === value);
        item.job_position_id = value;
        item.job_position_name = pos?.name || "";
      } else if (field === "percentage") {
        item.percentage = parseFloat(value) || 0;
      } else {
        item[field] = value;
      }
      arr[idx] = item;
      return { ...prev, percentage_allocations: arr };
    });
  };

  const removeAllocation = (idx) => {
    setEditing((prev) => ({
      ...prev,
      percentage_allocations: (prev.percentage_allocations || []).filter((_, i) => i !== idx)
    }));
  };

  const save = async () => {
    if (!editing?.policy_name) return;
    setSaving(true);
    try {
      if (editing.id) {
        await base44.entities.TipPolicy.update(editing.id, editing);
      } else {
        const created = await base44.entities.TipPolicy.create(editing);
        setEditing(created);
        setPolicies((prev) => [created, ...prev]);
      }
      alert("נשמר בהצלחה");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="py-8 text-center text-gray-600 flex items-center justify-center gap-2">
      <Loader className="w-4 h-4 animate-spin" /> טוען...
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>מדיניות חלוקת טיפים</CardTitle>
        <div className="flex gap-2">
          <select className="border rounded-md h-9 px-2" value={editing?.id || ""} onChange={(e) => setEditing(policies.find(p => p.id === e.target.value) || null)}>
            <option value="">בחר מדיניות</option>
            {policies.map(p => (
              <option key={p.id} value={p.id}>{p.policy_name}</option>
            ))}
          </select>
          <Button onClick={startNew} variant="outline"><Plus className="w-4 h-4 mr-1" /> חדשה</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600">שם מדיניות</label>
                <Input value={editing.policy_name} onChange={(e) => setEditing(prev => ({ ...prev, policy_name: e.target.value }))} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">הפרשות אחוזיות על ברוטו</h4>
                <Button size="sm" variant="outline" onClick={addAllocation}><Plus className="w-4 h-4 mr-1" /> הוסף יעד</Button>
              </div>
              <div className="space-y-2">
                {(editing.percentage_allocations || []).map((a, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                    <select
                      className="border rounded-md h-9 px-2 md:col-span-3"
                      value={a.job_position_id || ""}
                      onChange={(e) => updateAllocation(idx, "job_position_id", e.target.value)}
                    >
                      <option value="">בחר תפקיד</option>
                      {positions.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      className="md:col-span-2"
                      value={a.percentage || 0}
                      onChange={(e) => updateAllocation(idx, "percentage", e.target.value)}
                      placeholder="%"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeAllocation(idx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving} className="bg-gray-900 hover:bg-gray-800">
                {saving ? 'שומר...' : 'שמור'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}