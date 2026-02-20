import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function ExportData() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await base44.functions.invoke('exportAllUserData', {});
      setData(JSON.stringify(response.data, null, 2));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (data) {
      navigator.clipboard.writeText(data);
      alert('נתונים הועתקו! חזור לגרסה 0.2 והדבק');
    }
  };

  if (loading) return <div className="p-6 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div><p>טוען...</p></div>;
  if (error) return <div className="p-6"><div className="bg-red-50 p-4 rounded">{error}</div></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-blue-50 p-6 rounded-lg mb-4">
        <h1 className="text-2xl font-bold mb-2">ייצוא נתונים</h1>
        <button onClick={handleCopy} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">📋 העתק הכל</button>
      </div>
      <div className="bg-gray-50 p-4 rounded"><pre className="text-xs overflow-auto max-h-96">{data}</pre></div>
    </div>
  );
}