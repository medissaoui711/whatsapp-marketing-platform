'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Alert, AlertDescription } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: 'admin@demo.com',
    password: '',
  });

  useEffect(() => {
    const user = apiClient.getUser();
    if (user) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { ok, data } = await apiClient.login(
        formData.email,
        formData.password,
      );

      if (!ok) {
        setError((data as { error: string }).error || 'فشل تسجيل الدخول');
        return;
      }

      const loginData = data as { user: { tenantId: string; tenantName?: string } };
      router.push('/dashboard');

    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
            <span className="text-3xl text-white">🕷️</span>
          </div>
          <h1 className="text-2xl font-bold">منصة Scraper SaaS</h1>
          <p className="text-sm text-gray-500 mt-1">نظام إدارة الكشط والتسويق الآلي</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Input
            label="البريد الإلكتروني"
            name="email"
            type="email"
            placeholder="admin@demo.com"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
            disabled={isLoading}
          />

          <Input
            label="كلمة المرور"
            name="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            required
            disabled={isLoading}
          />

          <Button
            type="submit"
            className="w-full"
            loading={isLoading}
          >
            {isLoading ? 'جاري تسجيل الدخول...' : 'دخول إلى المنصة'}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t text-center text-sm text-gray-500">
          <p>بيانات الدخول التجريبية:</p>
          <p className="mt-1 font-mono text-xs text-gray-400">
            admin@demo.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
