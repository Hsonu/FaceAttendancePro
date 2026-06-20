import { useState, useEffect } from 'react';
import { adminAPI } from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  Building2, Plus, Pencil, Trash2, X, Loader, CheckCircle, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', dutyHours: 8, shiftStartTime: '09:00' });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getDepartments();
      setDepartments(data.departments);
    } catch {
      toast.error('Failed to load departments.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ name: '', description: '', dutyHours: 8, shiftStartTime: '09:00' });
    setModal('create');
  };

  const openEdit = (dept) => {
    setSelected(dept);
    setForm({
      name: dept.name,
      description: dept.description || '',
      dutyHours: dept.dutyHours !== undefined ? dept.dutyHours : 8,
      shiftStartTime: dept.shiftStartTime || '09:00',
    });
    setModal('edit');
  };

  const openDelete = (dept) => {
    setSelected(dept);
    setModal('delete');
  };

  const closeModal = () => { setModal(null); setSelected(null); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Department name is required.');
    setFormLoading(true);
    try {
      await adminAPI.createDepartment(form);
      toast.success('Department created successfully!');
      closeModal();
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create department.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await adminAPI.updateDepartment(selected._id, form);
      toast.success('Department updated.');
      closeModal();
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      await adminAPI.deleteDepartment(selected._id);
      toast.success('Department deleted.');
      closeModal();
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-dark-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title="Department Management" />
        <main className="flex-1 p-6 lg:p-8 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="glass-card p-4 flex items-center gap-3 flex-1">
              <div className="p-2.5 bg-purple-600/20 rounded-xl">
                <Building2 size={22} className="text-purple-400" />
              </div>
              <div>
                <h1 className="section-title text-xl">Departments</h1>
                <p className="text-dark-500 text-xs">{departments.length} departments configured</p>
              </div>
            </div>
            <button onClick={openCreate} className="btn-primary shrink-0" id="add-department-btn">
              <Plus size={18} /> Add Department
            </button>
          </div>

          {/* Table */}
          <div className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-12 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : departments.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 size={40} className="text-dark-700 mx-auto mb-3" />
                <p className="text-dark-400">No departments found. Click "Add Department" to create one.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Department Name</th>
                      <th>Description</th>
                      <th>Shift Settings</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept) => (
                      <tr key={dept._id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                              {dept.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-dark-100">{dept.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-dark-400 text-sm">
                            {dept.description || '—'}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-dark-100 font-semibold text-sm">
                              {dept.shiftStartTime || '09:00'}
                            </span>
                            <span className="text-dark-400 text-xs">
                              {dept.dutyHours !== undefined ? dept.dutyHours : 8} hrs shift
                            </span>
                          </div>
                        </td>
                        <td>
                          {dept.isActive ? (
                            <span className="badge-present flex items-center gap-1 w-fit">
                              <CheckCircle size={10} /> Active
                            </span>
                          ) : (
                            <span className="badge-absent flex items-center gap-1 w-fit">
                              <XCircle size={10} /> Inactive
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="text-dark-500 text-xs">
                            {new Date(dept.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEdit(dept)}
                              className="p-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-dark-400 hover:text-dark-100 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => openDelete(dept)}
                              className="p-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/60 text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Add New Department' : 'Edit Department'} onClose={closeModal}>
          <form onSubmit={modal === 'create' ? handleCreate : handleEdit} className="space-y-4">
            <div>
              <label className="form-label">Department Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                className="form-input"
                placeholder="e.g. Engineering"
                required
              />
            </div>
            <div>
              <label className="form-label">Description (optional)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                className="form-input min-h-[80px] resize-none"
                placeholder="Brief description of the department"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Duty Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={form.dutyHours}
                  onChange={(e) => setForm(p => ({ ...p, dutyHours: e.target.value }))}
                  className="form-input"
                  placeholder="e.g. 8"
                  required
                />
              </div>
              <div>
                <label className="form-label">Shift Start Time</label>
                <input
                  type="time"
                  value={form.shiftStartTime}
                  onChange={(e) => setForm(p => ({ ...p, shiftStartTime: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={formLoading} className="btn-primary flex-1">
                {formLoading ? <Loader size={16} className="animate-spin" /> : (modal === 'create' ? 'Create Department' : 'Save Changes')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Modal */}
      {modal === 'delete' && (
        <Modal title="Delete Department" onClose={closeModal}>
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} className="text-red-400" />
            </div>
            <p className="text-dark-200 font-semibold">Are you sure you want to delete</p>
            <p className="text-red-400 font-bold text-lg mt-1">{selected?.name}?</p>
            <p className="text-dark-500 text-sm mt-2">This action cannot be undone.</p>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleDelete} disabled={formLoading} className="btn-danger flex-1">
              {formLoading ? <Loader size={16} className="animate-spin" /> : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-dark-800">
          <h2 className="text-dark-100 font-bold">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-dark-800 text-dark-400 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
