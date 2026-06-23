import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AddUsers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'teacher' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const { data } = await api.get('/admin/teachers');
      if (data.success) setTeachers(data.teachers);
    } catch (err) {
      console.error('Could not fetch teachers', err);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      };

      const { data } = await api.post('/admin/create-user', payload);
      if (data && data.success) {
        setSuccess(data.message || 'User created successfully.');
        setForm({ firstName: '', lastName: '', email: '', password: '', role: 'teacher' });
        fetchTeachers();
      } else {
        setError(data.message || 'Failed to create user.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error creating user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="dashboard-main">
      <section className="admin-grid">
        <div className="admin-panel card">
          <button type="button" className="secondary-btn" style={{ marginBottom: 16 }} onClick={() => navigate('/admin')}>
            ← Back to dashboard
          </button>
          <h2>Create Teacher/Admin Account</h2>
          <form className="create-user-form" onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="form-row">
              <div className="form-group">
                <label>First name</label>
                <input name="firstName" value={form.firstName} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Last name</label>
                <input name="lastName" value={form.lastName} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Password</label>
                <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={8} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select name="role" value={form.role} onChange={handleChange} className='roles'>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={isSubmitting} className="primary-btn">
                {isSubmitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>

        <div className="admin-panel card">
          <div className="panel-header">
            <h2>Teacher Accounts</h2>
            <div className="panel-actions">
              <input
                type="search"
                placeholder="Search teachers by name or email"
                className="form-search"
                onChange={(e) => {
                  const q = e.target.value.toLowerCase().trim();
                  if (!q) return fetchTeachers();
                  setTeachers((prev) => prev.filter(t => `${t.firstName} ${t.lastName} ${t.email}`.toLowerCase().includes(q)));
                }}
              />
            </div>
          </div>

          <div className="table-wrapper">
            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.length === 0 ? (
                    <tr>
                      <td colSpan="3">No teacher accounts found.</td>
                    </tr>
                  ) : (
                    teachers.map((teacher) => (
                      <tr key={teacher._id}>
                        <td>{teacher.firstName} {teacher.lastName}</td>
                        <td>{teacher.email}</td>
                        <td>{new Date(teacher.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
