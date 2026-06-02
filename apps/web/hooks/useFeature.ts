'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/providers/auth-provider';

interface FeatureCheckResult {
  allowed: boolean;
  reason?: string;
  message?: string;
  settings?: any;
  remaining?: number;
  limit?: number;
}

export function useFeature(featureKey: string) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FeatureCheckResult | null>(null);
  const { user } = useAuth();

  const check = useCallback(
    async (action?: string, metadata?: any) => {
      if (!user) {
        setResult({
          allowed: false,
          reason: 'not_authenticated',
          message: 'يجب تسجيل الدخول أولاً',
        });
        return false;
      }

      setLoading(true);

      try {
        const response = await fetch('/api/features/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featureKey, action, metadata }),
        });

        const data = await response.json();
        setResult(data);
        return data.allowed;
      } catch (error) {
        setResult({
          allowed: false,
          reason: 'network_error',
          message: 'فشل الاتصال بالخادم',
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [featureKey, session]
  );

  return { check, loading, result };
}
