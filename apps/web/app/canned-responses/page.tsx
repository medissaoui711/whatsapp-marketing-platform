'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, Modal, Table, Pagination } from '@/components/ui';
import { Plus, Pencil, Trash2, Search, Hash } from 'lucide-react';

interface CannedResponse {
  id: string;
  name: string;
  shortcut: string | null;
  content: string;
  category: string | null;
  isActive: boolean;
  usageCount: number;
  buttons: any[];
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  shortcut: string;
  content: string;
  category: string;
  isActive: boolean;
}

const emptyForm: FormData = { name: '', shortcut: '', content: '', category: '', isActive: true };

const statusColors: Record<string, string> = {
  true: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  false: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statusLabels: Record<string, string> = {
  true: 'مفعل',
  false: 'معطل',
};

export default function CannedResponsesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/login');
  }, [router]);

  const fetchResponses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);

      const res = await fetch(`/api/canned-responses?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) {
        setError('ليس لديك صلاحية لعرض الردود الجاهزة');
        return;
      }
      if (!res.ok) throw new Error('فشل في تحميل الردود الجاهزة');

      const data = await res.json();
      setResponses(data.cannedResponses || []);
      setCategories(data.categories || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, categoryFilter]);

  useEffect(() => {
    if (mounted) fetchResponses();
  }, [page, fetchResponses, mounted]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (cr: CannedResponse) => {
    setEditingId(cr.id);
    setFormData({
      name: cr.name,
      shortcut: cr.shortcut || '',
      content: cr.content,
      category: cr.category || '',
      isActive: cr.isActive,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};
    if (!formData.name.trim()) errors.name = 'الاسم مطلوب';
    if (!formData.content.trim()) errors.content = 'المحتوى مطلوب';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const body: any = { ...formData };
      body.shortcut = body.shortcut.trim() || undefined;
      body.category = body.category.trim() || undefined;

      const url = editingId ? `/api/canned-responses/${editingId}` : '/api/canned-responses';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        const data = await res.json();
        setFormErrors({ shortcut: data.error || 'الاختصار مستخدم مسبقاً' });
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'فشل في الحفظ');
      }

      setModalOpen(false);
      fetchResponses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/canned-responses/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('فشل في الحذف');

      setDeleteId(null);
      fetchResponses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setDeleting(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchResponses();
  };

  const totalPages = Math.ceil(total / limit);

  if (!mounted) return null;

  const columns = [
    { key: 'name', label: 'الاسم' },
    { key: 'shortcut', label: 'الاختصار' },
    { key: 'category', label: 'التصنيف' },
    { key: 'usageCount', label: 'الاستخدام' },
    { key: 'isActive', label: 'الحالة' },
    { key: 'createdByName', label: 'المنشئ' },
    { key: 'actions', label: 'الإجراءات' },
  ];

  const tableData = responses.map((cr) => ({
    name: cr.name,
    shortcut: cr.shortcut ? `/${cr.shortcut}` : '—',
    category: (
      <span className="inline-block px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        {cr.category || 'عام'}
      </span>
    ),
    usageCount: (
      <span className="flex items-center gap-1 justify-end" dir="ltr">
        <Hash size={14} className="text-gray-400" />
        {cr.usageCount}
      </span>
    ),
    isActive: (
      <span className={`px-2 py-0.5 rounded text-xs ${statusColors[String(cr.isActive)]}`}>
        {statusLabels[String(cr.isActive)]}
      </span>
    ),
    createdByName: cr.createdByName || '—',
    actions: (
      <div className="flex gap-2">
        <button
          onClick={() => openEditModal(cr)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          title="تعديل"
        >
          <Pencil size={16} className="text-blue-600" />
        </button>
        <button
          onClick={() => setDeleteId(cr.id)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          title="حذف"
        >
          <Trash2 size={16} className="text-red-600" />
        </button>
      </div>
    ),
  }));

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">الردود الجاهزة</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة الردود السريعة الجاهزة للاستخدام</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus size={18} className="ml-1" />
          إضافة رد جاهز
        </Button>
      </div>

      <Card title="">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="بحث بالاسم أو المحتوى أو الاختصار..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="">كل التصنيفات</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <Button variant="secondary" onClick={handleSearch}>
            <Search size={16} className="ml-1" />
            بحث
          </Button>
        </div>
      </Card>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <Card title="">
          <Table columns={columns} data={tableData} />
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </Card>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'تعديل رد جاهز' : 'إضافة رد جاهز'}>
        <div className="space-y-4">
          <Input
            label="الاسم"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
            placeholder="اسم الرد الجاهز"
          />
          <Input
            label="الاختصار"
            value={formData.shortcut}
            onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
            error={formErrors.shortcut}
            placeholder="/greeting"
          />
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">المحتوى</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 min-h-[120px] ${formErrors.content ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="محتوى الرد..."
            />
            {formErrors.content && <p className="text-red-500 text-sm mt-1">{formErrors.content}</p>}
          </div>
          <Input
            label="التصنيف"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="تصنيف (اختياري)"
          />
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm font-medium">مفعل</label>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} loading={saving}>
              {editingId ? 'حفظ التغييرات' : 'إضافة'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد الحذف">
        <p className="mb-4">هل أنت متأكد من حذف هذا الرد الجاهز؟</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>إلغاء</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>حذف</Button>
        </div>
      </Modal>
    </div>
  );
}


