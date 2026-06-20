import { useState, useEffect } from 'react';
import { adminAPI, authAPI } from '../api/axios';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  Users, Plus, Pencil, Trash2, Search, X, CheckCircle,
  Shield, UserCheck, UserX, Loader
} from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_DEPTS = ['Engineering', 'Design', 'Marketing', 'HR', 'Finance', 'Operations', 'Sales', 'Management', 'General'];

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal state
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'delete'
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', password: '', department: 'Engineering',
    position: 'Staff', phone: '', role: 'employee', isActive: true,
  });

  // Fetch departments dynamically
  const [deptList, setDeptList] = useState(DEFAULT_DEPTS);

  useEffect(() => {
    fetchEmployees();
    fetchDepts();
  }, [page, search]);

  const fetchDepts = async () => {
    try {
      const { data } = await adminAPI.getDepartments();
      if (data.departments && data.departments.length > 0) {
        setDeptList(data.departments.map(d => d.name));
      }
    } catch {
      // fallback to defaults
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getEmployees({ page, limit: 12, search });
      setEmployees(data.employees);
      setPages(data.pages);
      setTotal(data.total);
    } catch {
      toast.error('Failed to load employees.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ name: '', email: '', password: '', department: 'Engineering', position: 'Staff', phone: '', role: 'employee', isActive: true });
    setModal('create');
  };

  const openEdit = (emp) => {
    setSelectedEmp(emp);
    setForm({ name: emp.name, email: emp.email, password: '', department: emp.department, position: emp.position, phone: emp.phone || '', role: emp.role, isActive: emp.isActive });
    setModal('edit');
  };

  const openDelete = (emp) => {
    setSelectedEmp(emp);
    setModal('delete');
  };

  const closeModal = () => { setModal(null); setSelectedEmp(null); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Name, email, and password are required.');
    setFormLoading(true);
    try {
      await authAPI.register(form);
      toast.success('Employee created successfully!');
      closeModal();
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create employee.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const { password, email, ...rest } = form;
      await adminAPI.updateEmployee(selectedEmp._id, rest);
      toast.success('Employee updated.');
      closeModal();
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      await adminAPI.deleteEmployee(selectedEmp._id);
      toast.success('Employee deleted.');
      closeModal();
      fetchEmployees();
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
        <Navbar title="Employee Management" />
        <main className="flex-1 p-6 lg:p-8 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="glass-card p-4 flex items-center gap-3 flex-1">
              <div className="p-2.5 bg-primary-600/20 rounded-xl">
                <Users size={22} className="text-primary-400" />
              </div>
              <div>
                <h1 className="section-title text-xl">Employees</h1>
                <p className="text-dark-500 text-xs">{total} total registered</p>
              </div>
            </div>
            <button onClick={openCreate} className="btn-primary shrink-0" id="add-employee-btn">
              <Plus size={18} /> Add Employee
            </button>
          </div>

          {/* Search */}
          <div className="glass-card p-4">
            <div className="relative max-w-sm">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500" />
              <input
                type="text"
                placeholder="Search by name, email, ID…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="form-input pl-10 py-2 text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-12 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : employees.length === 0 ? (
              <div className="p-12 text-center">
                <Users size={40} className="text-dark-700 mx-auto mb-3" />
                <p className="text-dark-400">No employees found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Emp ID</th>
                      <th>Department</th>
                      <th>Position</th>
                      <th>Face</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp._id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-dark-100 flex items-center gap-1.5">
                                {emp.name}
                                {emp.role === 'admin' && <Shield size={12} className="text-amber-400" />}
                              </p>
                              <p className="text-dark-500 text-xs">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="font-mono text-dark-300 text-xs bg-dark-800 px-2 py-0.5 rounded">
                            {emp.employeeId}
                          </span>
                        </td>
                        <td><span className="text-dark-300 text-sm">{emp.department}</span></td>
                        <td><span className="text-dark-400 text-xs">{emp.position}</span></td>
                        <td>
                          {emp.faceRegistered ? (
                            <span className="badge-present flex items-center gap-1 w-fit">
                              <CheckCircle size={10} /> Registered
                            </span>
                          ) : (
                            <span className="text-dark-600 text-xs">Not set</span>
                          )}
                        </td>
                        <td>
                          {emp.isActive ? (
                            <span className="badge-present">Active</span>
                          ) : (
                            <span className="badge-absent">Inactive</span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEdit(emp)}
                              className="p-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-dark-400 hover:text-dark-100 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => openDelete(emp)}
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

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors
                    ${page === i + 1 ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-400 hover:bg-dark-700'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Add New Employee' : 'Edit Employee'} onClose={closeModal}>
          <form onSubmit={modal === 'create' ? handleCreate : handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="form-label">Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="form-input" placeholder="John Doe" required />
              </div>
              <div className="col-span-2">
                <label className="form-label">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} className="form-input" placeholder="john@company.com" required disabled={modal === 'edit'} />
              </div>
              {modal === 'create' && (
                <div className="col-span-2">
                  <label className="form-label">Password</label>
                  <input type="password" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} className="form-input" placeholder="Min 6 characters" required minLength={6} />
                </div>
              )}
              <div>
                <label className="form-label">Department</label>
                <select value={form.department} onChange={(e) => setForm(p => ({ ...p, department: e.target.value }))} className="form-input">
                  {deptList.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Position</label>
                <input type="text" value={form.position} onChange={(e) => setForm(p => ({ ...p, position: e.target.value }))} className="form-input" placeholder="Software Engineer" />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input type="text" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} className="form-input" placeholder="+91..." />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select value={form.role} onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))} className="form-input">
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {modal === 'edit' && (
                <div className="col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 accent-primary-600" />
                  <label htmlFor="isActive" className="text-dark-300 text-sm font-medium">Active Account</label>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={formLoading} className="btn-primary flex-1">
                {formLoading ? <Loader size={16} className="animate-spin" /> : (modal === 'create' ? 'Create Employee' : 'Save Changes')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'delete' && (
        <Modal title="Delete Employee" onClose={closeModal}>
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} className="text-red-400" />
            </div>
            <p className="text-dark-200 font-semibold">Are you sure you want to delete</p>
            <p className="text-red-400 font-bold text-lg mt-1">{selectedEmp?.name}?</p>
            <p className="text-dark-500 text-sm mt-2">This will also delete all their attendance records. This action cannot be undone.</p>
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
