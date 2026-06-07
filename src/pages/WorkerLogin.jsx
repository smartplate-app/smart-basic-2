import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function WorkerLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loggedInUser, setLoggedInUser] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("loginRestaurantUser", {
        username: username.trim(),
        password,
      });
      const data = res.data;
      if (data?.success && data?.login_token) {
        // Use the real login token to create a Base44 session and redirect to Orders
        await base44.auth.loginWithToken(data.login_token, "/Orders");
      } else {
        setError(data?.error || "שם משתמש או סיסמה שגויים");
      }
    } catch (err) {
      setError("שגיאת התחברות - נסה שוב");
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
          <p className="text-gray-500 text-sm mt-1">הכנס שם משתמש וסיסמה</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם משתמש</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gray-50"
              placeholder="הכנס שם משתמש"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gray-50"
              placeholder="הכנס סיסמה"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold rounded-xl transition text-base"
          >
            {loading ? "מתחבר..." : "כניסה"}
          </button>
        </form>
      </div>
    </div>
  );
}