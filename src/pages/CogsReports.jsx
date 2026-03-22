import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "../components/LanguageProvider";
import { Plus, Search, Edit, Trash2, Lock, BarChart3, FileText, Calculator } from "lucide-react";
import CogsReportForm from "../components/cogs/CogsReportForm";

export default function CogsReportsPage() {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState(null);

  const handleAuth = (e) => {
    e.preventDefault();
    if (passcode === "2233") {
      setIsAuthenticated(true);
      loadReports();
    } else {
      alert(language === 'he' ? 'קוד שגוי' : 'Invalid code');
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.CogsReport.filter({}, "-created_date");
      setReports(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm(language === 'he' ? 'האם אתה בטוח שברצונך למחוק דוח זה?' : 'Are you sure you want to delete this report?')) {
      await base44.entities.CogsReport.delete(id);
      loadReports();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-6 space-y-4 text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {language === 'he' ? 'אזור מוגן' : 'Protected Area'}
            </h2>
            <p className="text-gray-500">
              {language === 'he' ? 'הזן קוד גישה כדי לצפות בדוחות COGS' : 'Enter access code to view COGS reports'}
            </p>
            <form onSubmit={handleAuth} className="space-y-4 mt-4">
              <Input
                type="password"
                placeholder={language === 'he' ? 'קוד גישה' : 'Access code'}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="text-center text-lg tracking-widest"
                autoFocus
              />
              <Button type="submit" className="w-full bg-[#107c41] hover:bg-[#0c5e31]">
                {language === 'he' ? 'כניסה' : 'Enter'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredReports = reports.filter(r => 
    (r.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f3f2f1] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#d4a373] p-6 rounded-xl text-white shadow-md">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-pink-500" />
              <span className="text-pink-500">COGS</span> {language === 'he' ? 'דוחות' : 'Reports'}
            </h1>
            <p className="mt-1 opacity-90 text-gray-800 font-medium">
              {language === 'he' ? 'עקוב אחר עלות סחורה נמכרת ושולי רווח' : 'Track Cost of Goods Sold and profit margins'}
            </p>
          </div>
          <Button 
            onClick={() => { setEditingReport(null); setShowForm(true); }}
            className="bg-[#107c41] hover:bg-[#0c5e31] text-white border-none rounded-full px-6"
          >
            <Plus className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
            {language === 'he' ? 'דוח COGS חדש' : 'New COGS Report'}
          </Button>
        </div>

        <div className="relative">
          <Search className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} text-gray-400 w-5 h-5`} />
          <Input
            placeholder={language === 'he' ? 'חפש דוחות...' : 'Search reports...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`bg-white rounded-full ${isRTL ? 'pr-10' : 'pl-10'}`}
          />
        </div>

        <div className="space-y-6">
          {filteredReports.map(report => (
            <Card key={report.id} className="overflow-hidden hover:shadow-lg transition-shadow bg-white border-[#e5dfd3] rounded-2xl">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingReport(report); setShowForm(true); }} className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-50">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(report.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-600 hover:bg-gray-50">
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-600 hover:bg-gray-50">
                      <Calculator className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-right rtl:text-left">
                    <h3 className="font-bold text-xl text-pink-600 flex items-center justify-end rtl:justify-start gap-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      {report.name}
                    </h3>
                    <div className="text-sm text-gray-500 mt-1 font-medium">
                      {language === 'he' ? 'תאריך דוח:' : 'Report Date:'} {new Date(report.report_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}
                    </div>
                    <div className="text-sm font-bold text-pink-500 mt-1">
                      {report.report_type === 'planned' ? (language === 'he' ? 'תכנון' : 'Planned') : (language === 'he' ? 'בפועל' : 'Actual')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-red-50 p-4 rounded-xl text-center border border-red-100">
                    <div className="text-sm text-red-500 font-bold mb-1">{language === 'he' ? 'סה"כ COGS' : 'Total COGS'}</div>
                    <div className="font-bold text-red-600 text-2xl">₪{Number(report.total_cogs || 0).toFixed(0)}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl text-center border border-green-100">
                    <div className="text-sm text-green-600 font-bold mb-1">{language === 'he' ? 'סה"כ מכירות' : 'Total Sales'}</div>
                    <div className="font-bold text-green-600 text-2xl">₪{Number(report.total_sales || 0).toFixed(0)}</div>
                    <div className="text-xs text-gray-500 mt-1">{language === 'he' ? 'מחושב' : 'Calculated'}</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100">
                    <div className="text-sm text-blue-600 font-bold mb-1">{language === 'he' ? 'רווח גולמי' : 'Gross Profit'}</div>
                    <div className="font-bold text-blue-600 text-2xl">₪{Number(report.gross_profit || 0).toFixed(0)}</div>
                    <div className="text-xs text-gray-500 mt-1">margin: {report.total_sales > 0 ? ((report.gross_profit / report.total_sales) * 100).toFixed(2) : 0}%</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-xl text-center border border-orange-100">
                    <div className="text-sm text-orange-600 font-bold mb-1">{language === 'he' ? 'אחוז COGS' : 'COGS %'}</div>
                    <div className="font-bold text-orange-600 text-2xl">{Number(report.cogs_percentage || 0).toFixed(2)}%</div>
                  </div>
                </div>

                <div className="bg-[#fdfbf7] rounded-xl border border-[#e5dfd3] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#d4a373] text-white">
                      <tr>
                        <th className="p-3 text-right rtl:text-right">{language === 'he' ? 'פריט' : 'Item'}</th>
                        <th className="p-3 text-center">{language === 'he' ? 'כמות נמכרת' : 'Qty Sold'}</th>
                        <th className="p-3 text-center">{language === 'he' ? 'אחוז עלות' : 'Cost %'}</th>
                        <th className="p-3 text-center">{language === 'he' ? 'סה"כ מכירות' : 'Total Sales'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5dfd3]">
                      {(report.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-white transition-colors">
                          <td className="p-3 font-medium text-gray-800">{item.item_name}</td>
                          <td className="p-3 text-center">{item.quantity_sold}</td>
                          <td className="p-3 text-center font-bold text-green-600">{Number(item.cost_percentage || 0).toFixed(1)}%</td>
                          <td className="p-3 text-center font-bold text-blue-600">₪{Number(item.total_sales || 0).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredReports.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
              {language === 'he' ? 'לא נמצאו דוחות' : 'No reports found'}
            </div>
          )}
        </div>

        {showForm && (
          <CogsReportForm
            report={editingReport}
            onSave={() => {
              setShowForm(false);
              loadReports();
            }}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>
    </div>
  );
}

// Dummy icon for TrendingUp since it wasn't imported at the top
const TrendingUp = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
    <polyline points="16 7 22 7 22 13"></polyline>
  </svg>
);