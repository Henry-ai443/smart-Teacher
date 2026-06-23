import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  console.log('AdminDashboard user:', user);
  const [submissions, setSubmissions] = useState([]);
  const [comments, setComments] = useState({});

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data } = await api.get('/admin/submissions');
      if (data.success) {
        setSubmissions(data.submissions);
      }
    } catch (err) {
      console.error('Could not fetch submissions', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCommentChange = (submissionId, value) => {
    setComments((prev) => ({ ...prev, [submissionId]: value }));
  };

  const updateSubmission = async (submissionId, action) => {
    try {
      const payload = {
        adminComments: comments[submissionId] || '',
        rejectionReason: action === 'reject' ? comments[submissionId] || 'Rejected by admin' : undefined,
      };
      const endpoint = `/admin/${action}/${submissionId}`;
      await api.put(endpoint, payload);
      fetchSubmissions();
    } catch (err) {
      console.error(`Could not ${action} submission`, err);
    }
  };

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <div className="admin-page">
      <main className="dashboard-main">
        {/* Welcome banner */}
        <section className="welcome-banner" id="welcome-banner">
          <div className="welcome-text">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <h1>
                  Welcome back, <span className="highlight">{user?.firstName}</span>!
                </h1>
                <p>Manage accounts and review submissions from this admin console.</p>
              </div>
              <button type="button" className="secondary-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
          <div className="welcome-decoration">
            <div className="welcome-shape shape-1" />
            <div className="welcome-shape shape-2" />
          </div>
        </section>

        {/* Info cards */}
        <div className="dashboard-cards">
          <div className="dash-card" id="card-profile">
            <div className="card-icon profile-icon" />
            <div className="card-body">
              <h3>Profile</h3>
              <p className="card-value" id="profile-name">{user?.firstName} {user?.lastName}</p>
              <p className="card-sub">{user?.email}</p>
            </div>
          </div>

          <div className="dash-card" id="card-role">
            <div className="card-icon role-icon" />
            <div className="card-body">
              <h3>Role</h3>
              <p className="card-value" id="role-value">{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '—'}</p>
              <p className="card-sub">Account type</p>
            </div>
          </div>

          <div className="dash-card" id="card-joined">
            <div className="card-icon date-icon" />
            <div className="card-body">
              <h3>Member since</h3>
              <p className="card-value" id="joined-date">{joinDate}</p>
              <p className="card-sub">Account created</p>
            </div>
          </div>
        </div>

        <section className="admin-grid">
          <div className="admin-panel card">
            <h2>Manage Users</h2>
            <p>Quick links to manage teacher and admin accounts.</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button className="primary-btn" onClick={() => navigate('/admin/users')}>Add users</button>
              <button className="secondary-btn" onClick={() => navigate('/admin/users')}>View users</button>
            </div>
          </div>
        </section>

        <section className="submission-status-section admin-queue">
          <div className="section-header">
            <h2>Approval Queue</h2>
            <p>Review and approve teacher submissions</p>
          </div>

          <div className="submission-list">
            {submissions.length === 0 ? (
              <p className="no-data">No pending submissions at this time.</p>
            ) : (
              submissions.map((submission) => (
                <article className="submission-card card" key={submission._id}>
                  <header className="submission-card-header">
                    <div>
                      <h3>{submission.strand} / {submission.subStrand}</h3>
                      <p>Teacher: {submission.teacherId?.firstName} {submission.teacherId?.lastName} ({submission.teacherId?.email})</p>
                    </div>
                    <span className={`status-badge status-${submission.status}`}>{submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}</span>
                  </header>

                  <div className="submission-card-body">
                    <div>
                      <strong>Objectives</strong>
                      <ul>
                        {submission.objectives?.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <strong>Presentation</strong>
                      {submission.presentation?.map((section, idx) => (
                        <div key={idx} className="presentation-summary">
                          <p><strong>{section.section}</strong></p>
                          <ul>
                            {section.points?.map((point, pointIdx) => (
                              <li key={pointIdx}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="submission-actions">
                    <textarea
                      placeholder="Add review notes or rejection reason"
                      value={comments[submission._id] || ''}
                      onChange={(e) => handleCommentChange(submission._id, e.target.value)}
                    />
                    <div className="action-buttons">
                      <button className="primary-btn approve" onClick={() => updateSubmission(submission._id, 'approve')}>
                        Approve
                      </button>
                      <button className="secondary-btn reject" onClick={() => updateSubmission(submission._id, 'reject')}>
                        Reject
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
