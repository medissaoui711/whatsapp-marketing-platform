'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ContactItem } from '@/lib/types/contact';

interface ContactsTableProps {
  contacts: ContactItem[];
  onRefresh: () => void;
}

export function ContactsTable({ contacts, onRefresh }: ContactsTableProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (contactId: string) => {
    if (!confirm('هل أنت متأكد من حذف جهة الاتصال هذه؟')) return;
    setDeleting(contactId);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-right p-3 font-medium text-slate-600">الاسم</th>
              <th className="text-right p-3 font-medium text-slate-600">رقم الهاتف</th>
              <th className="text-right p-3 font-medium text-slate-600">حساب WhatsApp</th>
              <th className="text-right p-3 font-medium text-slate-600">العلامات</th>
              <th className="text-right p-3 font-medium text-slate-600">تاريخ الإضافة</th>
              <th className="text-center p-3 font-medium text-slate-600 w-24">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500">
                  لا توجد جهات اتصال لعرضها
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-medium">
                    {contact.profileName || '-'}
                  </td>
                  <td className="p-3 font-mono text-left" dir="ltr">
                    {contact.phoneNumber}
                  </td>
                  <td className="p-3">
                    {contact.whatsappAccount ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        {contact.whatsappAccount}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {(contact.tags as string[]).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {(!contact.tags || (contact.tags as string[]).length === 0) && (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-slate-500 text-xs">
                    {formatDate(contact.createdAt)}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDelete(contact.id)}
                      disabled={deleting === contact.id}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50 text-sm"
                    >
                      {deleting === contact.id ? '...' : '🗑️'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
