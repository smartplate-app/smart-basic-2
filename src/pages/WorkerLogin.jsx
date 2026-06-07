import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function WorkerLogin() {
  const urlParams = new URLSearchParams(window.location.search);
  const storeId = urlParams.get("store");

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [businessName, setBusinessName] = useState("");

  // If no store param → show generic message
  const hasStoreLink = !!storeId;

  const handlePinLogin = async (e) => {
    e.preventDefault();
    if (pin.length !== 8) {
      setError("יש להזין קוד גישה של 8 ספרות");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("verifyRestaurantPin", {
        store_id: storeId,
        pin: pin.trim(),
      });
      const data = res.data;
      if (data?.success) {
        // Store owner context in session so the app knows whose data to show
        // Redirect to standard login so they get a real session
        // We pass owner context in sessionStorage then redirect to StoreLogin
        sessionStorage.setItem("worker_owner_email", data.owner_email);
        sessionStorage.setItem("worker_owner_name", data.owner_name);
        sessionStorage.setItem("worker_business_name", data.business_name);
        sessionStorage.setItem("worker_store_id", data.store_id);

        // Redirect to the standard Store login page which will handle auth
        window.location.href = "/StoreLogin?worker=1&store=" + storeId;
      } else {
        setError(data?.error || "קוד גישה שגוי");
      }
    } catch (err) {
      setError("שגיאה - נסה שוב");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🍽️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">כניסת עובדים</h1>
          {businessName && <p className="text-amber-600 font-semibold mt-1">{businessName}</p>}
          {hasStoreLink ? (
            <p className="text-gray-500 text-sm mt-1">הכנס את קוד הגישה של המסעדה</p>
          ) : (
            <p className="text-gray-500 text-sm mt-1">השתמש בקישור שקיבלת מהמנהל</p>
          )}
        </div>

        {hasStoreLink ? (
          <form onSubmit={handlePinLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">קוד גישה (8 ספרות)</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-center text-3xl font-bold tracking-widest focus:outline-none focus:border-amber-400 bg-gray-50"
                placeholder="• • • • • • • •"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || pin.length !== 8}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold rounded-xl transition text-base"
            >
              {loading ? "מאמת..." : "כניסה"}
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm">
              בקש מהמנהל לשלוח לך קישור גישה
            </div>
          </div>
        )}
      </div>
    </div>
  );
}