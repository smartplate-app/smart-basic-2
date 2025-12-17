import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader } from "lucide-react";

export default function WorkerRateHistory({ workerId }) {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await base44.entities.WorkerRate.filter({ worker_id: workerId });
        const sorted = (list || []).sort((a, b) => new Date(b.effective_from) - new Date(a.effective_from));
        setRates(sorted);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    if (workerId) load();
  }, [workerId]);

  if (loading) return (
    <div className="py-8 text-center text-gray-600 flex items-center justify-center gap-2">
      <Loader className="w-4 h-4 animate-spin" /> טוען...
    </div>
  );
  if (error) return <div className="text-red-600">שגיאה: {error}</div>;
  if (!rates.length) return <div className="text-gray-600">אין תיעוד תעריפים עדיין.</div>;

  return (
    <div className="space-y-3">
      {rates.map((r) => (
        <div key={r.id} className="border rounded-lg p-3 bg-gray-50">
          <div className="flex justify-between text-sm">
            <div className="font-semibold">
              {r.rate_type === 'tip_hourly' ? 'טיפ לשעה' : 'שכר בסיס'}: ₪{(r.amount || 0).toLocaleString()}
            </div>
            <div className="text-gray-600">
              {r.effective_from} — {r.effective_to || 'היום'}
            </div>
          </div>
          {r.notes && <div className="text-xs text-gray-500 mt-1">{r.notes}</div>}
        </div>
      ))}
    </div>
  );
}