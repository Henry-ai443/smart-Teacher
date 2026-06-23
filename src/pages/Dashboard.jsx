import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // --- Cascading Dropdowns State ---
  const [schemeData, setSchemeData] = useState({});
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [availableGrades, setAvailableGrades] = useState([]);
  const [availableStrands, setAvailableStrands] = useState([]);
  const [availableSubStrands, setAvailableSubStrands] = useState([]);

  // --- Upload scheme state ---
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });

  // --- Form inputs state ---
  const [formData, setFormData] = useState({
    date: '',
    grade: '',
    time: '',
    roll: '',
    strand: '',
    subStrand: '',
    conclusion: '',
  });

  const [objectives, setObjectives] = useState(['']);

  const [presentation, setPresentation] = useState([
    { section: 'Introduction', points: [''] },
    { section: 'Lesson Development', points: [''] },
    { section: 'Evaluation', points: [''] },
  ]);

  // --- Generation & Submission State ---
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generatedResult, setGeneratedResult] = useState(null);
  const [submittingDoc, setSubmittingDoc] = useState(false);
  const [docSubmitStatus, setDocSubmitStatus] = useState({ type: '', message: '' });

  // --- Load distinct options on mount ---
  useEffect(() => {
    fetchSchemeData();
  }, []);

  const fetchSchemeData = async () => {
    setOptionsLoading(true);
    try {
      const { data } = await api.get('/schemes/data');
      if (data.success && data.data) {
        setSchemeData(data.data);
        const grades = Object.keys(data.data);
        setAvailableGrades(grades);

        // Safely preserve or clear previous selections
        setFormData((prev) => {
          const newGrade = grades.includes(prev.grade) ? prev.grade : '';
          const strands = newGrade ? Object.keys(data.data[newGrade] || {}) : [];
          const newStrand = strands.includes(prev.strand) ? prev.strand : '';
          const subStrands = (newGrade && newStrand) ? (data.data[newGrade][newStrand] || []) : [];
          const newSubStrand = subStrands.includes(prev.subStrand) ? prev.subStrand : '';

          setAvailableStrands(strands);
          setAvailableSubStrands(subStrands);

          return {
            ...prev,
            grade: newGrade,
            strand: newStrand,
            subStrand: newSubStrand,
          };
        });
      }
    } catch (err) {
      console.error('Error fetching scheme data hierarchy:', err);
    } finally {
      setOptionsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // --- File Upload Handlers ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus({ type: '', message: '' });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadStatus({ type: '', message: '' });

    const dataPayload = new FormData();
    dataPayload.append('file', file);

    try {
      const { data } = await api.post('/upload-scheme', dataPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.success) {
        setUploadStatus({
          type: 'success',
          message: 'Scheme of Work uploaded and parsed successfully!',
        });
        setFile(null);
        fetchSchemeData();
      }
    } catch (err) {
      setUploadStatus({
        type: 'error',
        message: err.response?.data?.message || 'Failed to process Scheme of Work document.',
      });
    } finally {
      setUploading(false);
    }
  };

  // --- Dynamic Objectives Handlers ---
  const handleAddObjective = () => setObjectives([...objectives, '']);
  const handleRemoveObjective = (index) => {
    const updated = objectives.filter((_, idx) => idx !== index);
    setObjectives(updated.length > 0 ? updated : ['']);
  };
  const handleObjectiveChange = (index, value) => {
    const updated = [...objectives];
    updated[index] = value;
    setObjectives(updated);
  };

  // --- Dynamic Presentation Handlers ---
  const handleAddPresentationSection = () => {
    setPresentation([...presentation, { section: '', points: [''] }]);
  };
  const handleRemovePresentationSection = (sectionIndex) => {
    const updated = presentation.filter((_, idx) => idx !== sectionIndex);
    setPresentation(updated.length > 0 ? updated : [{ section: '', points: [''] }]);
  };
  const handleSectionNameChange = (sectionIndex, value) => {
    const updated = [...presentation];
    updated[sectionIndex].section = value;
    setPresentation(updated);
  };
  const handleAddPoint = (sectionIndex) => {
    const updated = [...presentation];
    updated[sectionIndex].points.push('');
    setPresentation(updated);
  };
  const handleRemovePoint = (sectionIndex, pointIndex) => {
    const updated = [...presentation];
    updated[sectionIndex].points = updated[sectionIndex].points.filter((_, idx) => idx !== pointIndex);
    if (updated[sectionIndex].points.length === 0) {
      updated[sectionIndex].points = [''];
    }
    setPresentation(updated);
  };
  const handlePointChange = (sectionIndex, pointIndex, value) => {
    const updated = [...presentation];
    updated[sectionIndex].points[pointIndex] = value;
    setPresentation(updated);
  };

  // --- Form Input Handlers ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- Cascading Change Handlers ---
  const handleGradeChange = (e) => {
    const selectedGrade = e.target.value;
    const strands = selectedGrade ? Object.keys(schemeData[selectedGrade] || {}) : [];

    setAvailableStrands(strands);
    setAvailableSubStrands([]);

    setFormData((prev) => ({
      ...prev,
      grade: selectedGrade,
      strand: '',
      subStrand: '',
    }));
  };

  const handleStrandChange = (e) => {
    const selectedStrand = e.target.value;
    const subStrands = (formData.grade && selectedStrand)
      ? (schemeData[formData.grade][selectedStrand] || [])
      : [];

    setAvailableSubStrands(subStrands);

    setFormData((prev) => ({
      ...prev,
      strand: selectedStrand,
      subStrand: '',
    }));
  };

  // --- Form Generation Handler ---
  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setGenerationError('');
    setGeneratedResult(null);
    setDocSubmitStatus({ type: '', message: '' });

    const cleanedObjectives = objectives.filter((obj) => obj.trim() !== '');
    const cleanedPresentation = presentation
      .map((sec) => ({
        section: sec.section.trim(),
        points: sec.points.filter((pt) => pt.trim() !== ''),
      }))
      .filter((sec) => sec.section !== '' && sec.points.length > 0);

    const payload = {
      ...formData,
      objectives: cleanedObjectives,
      presentation: cleanedPresentation,
    };

    try {
      const { data } = await api.post('/generate', payload);
      if (data.success) {
        setGeneratedResult(data.data);
      } else {
        setGenerationError(data.message || 'Generation failed.');
      }
    } catch (err) {
      setGenerationError(err.response?.data?.message || 'An error occurred during asset generation.');
    } finally {
      setGenerating(false);
    }
  };

  // --- Submit for Approval Handler ---
  const handleSubmitDocument = async () => {
    if (!generatedResult) return;
    setSubmittingDoc(true);
    setDocSubmitStatus({ type: '', message: '' });

    const cleanedObjectives = objectives.filter((obj) => obj.trim() !== '');
    const cleanedPresentation = presentation
      .map((sec) => ({
        section: sec.section.trim(),
        points: sec.points.filter((pt) => pt.trim() !== ''),
      }))
      .filter((sec) => sec.section !== '' && sec.points.length > 0);

    const payload = {
      strand: formData.strand,
      subStrand: formData.subStrand,
      objectives: cleanedObjectives,
      presentation: cleanedPresentation,
      lessonPlan: generatedResult.lessonPlan,
      recordOfWork: generatedResult.recordOfWork,
    };

    try {
      const { data } = await api.post('/documents', payload);
      if (data.success) {
        setDocSubmitStatus({
          type: 'success',
          message: 'Lesson Plan & Record of Work submitted for admin approval successfully!',
        });
      }
    } catch (err) {
      setDocSubmitStatus({
        type: 'error',
        message: err.response?.data?.message || 'Failed to submit document for approval.',
      });
    } finally {
      setSubmittingDoc(false);
    }
  };

  const hasUploadedSchemes = availableGrades.length > 0;

  return (
    <div className="dashboard-page">
      {/* Top Navigation */}
      <nav className="dashboard-nav" id="dashboard-nav">
        <div className="nav-brand">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="url(#nav-grad)" />
            <path d="M12 28V14l8-4 8 4v14l-8 4-8-4z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
            <path d="M20 18v8M16 20l4-2 4 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="nav-grad" x1="0" y1="0" x2="40" y2="40">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <span>Axiom SmartTeacher</span>
        </div>
        <div className="nav-actions">
          <div className="nav-user">
            <div className="nav-avatar" id="user-avatar">
              {(user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')}
            </div>
            <span className="nav-username" id="nav-username">
              {user?.firstName} {user?.lastName} (Teacher)
            </span>
          </div>
          <button onClick={handleLogout} className="logout-btn" id="logout-btn">
            Logout
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="dashboard-main">
        {/* Welcome banner */}
        <section className="welcome-banner" id="welcome-banner">
          <div className="welcome-text">
            <h1>Welcome back, {user?.firstName}!</h1>
            <p>
              Upload your Scheme of Work PDF, select your curriculum options, and instantly generate structured Lesson Plans and Records of Work.
            </p>
          </div>
          <div className="welcome-decoration">
            <div className="welcome-shape shape-1" />
            <div className="welcome-shape shape-2" />
          </div>
        </section>

        {/* 1. Ingestion Pipeline Section */}
        <section className="dashboard-upload-section" id="upload-section">
          <div className="section-header">
            <h2>1. Upload Scheme of Work</h2>
            <p>Upload your Scheme of Work PDF to populate teaching strands, sub-strands, and lesson objectives.</p>
          </div>

          {uploadStatus.message && (
            <div className={`upload-alert ${uploadStatus.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {uploadStatus.message}
            </div>
          )}

          <form onSubmit={handleUpload} className="upload-form">
            <div className="upload-dropzone">
              <input type="file" accept=".pdf" onChange={handleFileChange} />
              <div className="dropzone-label">
                <svg className="dropzone-icon" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {file ? (
                  <div className="selected-file">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ) : (
                  <span className="prompt-text">
                    <span className="bold-prompt">Click to upload</span> or drag and drop a Scheme PDF
                    <span className="sub-prompt">PDF files only (Max 15MB)</span>
                  </span>
                )}
              </div>
            </div>

            {file && (
              <button type="submit" className="submit-upload-btn" disabled={uploading}>
                {uploading ? <div className="spinner-sm" /> : 'Process Document'}
              </button>
            )}
          </form>
        </section>

        {/* 2. Generation Form & Integration */}
        <section className="dashboard-upload-section" id="generation-section">
          <div className="section-header">
            <h2>2. Lesson Plan Generator</h2>
            <p>Select the strand and sub-strand from your uploaded scheme, enter manual parameters, and generate curriculum assets.</p>
          </div>

          {!hasUploadedSchemes && !optionsLoading && (
            <div className="upload-alert alert-error" style={{ marginBottom: 24 }}>
              ⚠️ No Schemes of Work found. Please upload a Scheme of Work PDF above to populate options.
            </div>
          )}

          <form onSubmit={handleGenerate} className="generation-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Cascading Dropdowns: Grade, Strand, Sub-strand */}
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Grade / Class</label>
                <select
                  name="grade"
                  value={formData.grade}
                  onChange={handleGradeChange}
                  required
                  style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1.5px solid var(--gray-200)' }}
                >
                  <option value="">-- Select Grade --</option>
                  {availableGrades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Strand</label>
                <select
                  name="strand"
                  value={formData.strand}
                  onChange={handleStrandChange}
                  disabled={!formData.grade}
                  required
                  style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1.5px solid var(--gray-200)' }}
                >
                  <option value="">-- Select Strand --</option>
                  {availableStrands.map((strand) => (
                    <option key={strand} value={strand}>
                      {strand}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Sub-strand</label>
                <select
                  name="subStrand"
                  value={formData.subStrand}
                  onChange={handleInputChange}
                  disabled={!formData.strand}
                  required
                  style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1.5px solid var(--gray-200)' }}
                >
                  <option value="">-- Select Sub-strand --</option>
                  {availableSubStrands.map((subStrand) => (
                    <option key={subStrand} value={subStrand}>
                      {subStrand}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Manual Fields */}
            <div className="form-row">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Time</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
              <div className="form-group">
                <label>Roll (Class Size)</label>
                <input
                  type="number"
                  name="roll"
                  placeholder="e.g. 40"
                  value={formData.roll}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Dynamic Objectives list */}
            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Lesson Objectives
                <button type="button" onClick={handleAddObjective} className="secondary-btn" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                  + Add Objective
                </button>
              </label>
              {objectives.map((obj, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder={`Objective ${index + 1}`}
                    value={obj}
                    onChange={(e) => handleObjectiveChange(index, e.target.value)}
                    required={index === 0}
                    style={{ flex: 1 }}
                  />
                  {objectives.length > 1 && (
                    <button type="button" onClick={() => handleRemoveObjective(index)} className="logout-btn" style={{ padding: '8px' }}>
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Dynamic Lesson Presentation Sections */}
            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                Lesson Presentation
                <button type="button" onClick={handleAddPresentationSection} className="secondary-btn" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                  + Add Section
                </button>
              </label>

              {presentation.map((sec, secIdx) => (
                <div key={secIdx} className="card" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Section Title (e.g., Introduction, Core Lesson)"
                      value={sec.section}
                      onChange={(e) => handleSectionNameChange(secIdx, e.target.value)}
                      required
                      style={{ fontWeight: 600, flex: 1, marginRight: '12px' }}
                    />
                    {presentation.length > 1 && (
                      <button type="button" onClick={() => handleRemovePresentationSection(secIdx)} className="logout-btn" style={{ padding: '4px 10px' }}>
                        Remove Section
                      </button>
                    )}
                  </div>

                  <div style={{ paddingLeft: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)' }}>Section Points:</span>
                      <button type="button" onClick={() => handleAddPoint(secIdx)} className="secondary-btn" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                        + Add Point
                      </button>
                    </div>

                    {sec.points.map((pt, ptIdx) => (
                      <div key={ptIdx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                        <input
                          type="text"
                          placeholder={`Point ${ptIdx + 1}`}
                          value={pt}
                          onChange={(e) => handlePointChange(secIdx, ptIdx, e.target.value)}
                          required
                          style={{ flex: 1 }}
                        />
                        {sec.points.length > 1 && (
                          <button type="button" onClick={() => handleRemovePoint(secIdx, ptIdx)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--rose-500)' }}>
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Conclusion textarea */}
            <div className="form-group">
              <label>Conclusion</label>
              <textarea
                name="conclusion"
                rows="3"
                placeholder="Briefly describe the lesson conclusion or assignment..."
                value={formData.conclusion}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid var(--gray-200)' }}
              />
            </div>

            {generationError && (
              <div className="upload-alert alert-error">
                {generationError}
              </div>
            )}

            <button type="submit" className="primary-btn" style={{ alignSelf: 'flex-start', padding: '12px 28px' }} disabled={generating}>
              {generating ? <div className="spinner-sm" /> : 'Generate Assets'}
            </button>
          </form>
        </section>

        {/* 3. Output Display Section */}
        {generating && (
          <div className="loading-skeleton-container">
            <div className="skeleton-line title" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-grid">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          </div>
        )}

        {generatedResult && (
          <section className="generated-docs-section" id="output-section">
            <div className="section-header-row">
              <div>
                <h2>3. Generated Lesson Plan & Record of Work</h2>
                <p>Verify the generated output below and submit it for admin approval.</p>
              </div>
              <div className="export-actions">
                <button
                  onClick={handleSubmitDocument}
                  className="download-btn record-btn"
                  disabled={submittingDoc}
                >
                  {submittingDoc ? <div className="spinner-sm" /> : 'Submit for Admin Approval'}
                </button>
              </div>
            </div>

            {docSubmitStatus.message && (
              <div className={`upload-alert ${docSubmitStatus.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 24 }}>
                {docSubmitStatus.message}
              </div>
            )}

            <div className="preview-grid">
              {/* Lesson Plan Preview */}
              <div className="preview-pane">
                <div className="pane-header">
                  <h3>Lesson Plan</h3>
                </div>
                <div className="pane-body">
                  <div className="lesson-plan-preview-content">
                    <div className="preview-field">
                      <h4>Objectives</h4>
                      <div className="field-value">
                        {Array.isArray(generatedResult.lessonPlan?.objectives) ? (
                          <ul style={{ paddingLeft: '16px', margin: 0 }}>
                            {generatedResult.lessonPlan.objectives.map((obj, i) => (
                              <li key={i}>{obj}</li>
                            ))}
                          </ul>
                        ) : (
                          generatedResult.lessonPlan?.objectives || '—'
                        )}
                      </div>
                    </div>

                    <div className="preview-field">
                      <h4>Learning Materials</h4>
                      <div className="field-value">
                        {Array.isArray(generatedResult.lessonPlan?.materials) ? (
                          <ul style={{ paddingLeft: '16px', margin: 0 }}>
                            {generatedResult.lessonPlan.materials.map((mat, i) => (
                              <li key={i}>{mat}</li>
                            ))}
                          </ul>
                        ) : (
                          generatedResult.lessonPlan?.materials || '—'
                        )}
                      </div>
                    </div>

                    <div className="preview-field">
                      <h4>Introduction</h4>
                      <div className="field-value">{generatedResult.lessonPlan?.introduction || '—'}</div>
                    </div>

                    <div className="preview-field">
                      <h4>Learning Activities</h4>
                      <div className="field-value">{generatedResult.lessonPlan?.activities || '—'}</div>
                    </div>

                    <div className="preview-field">
                      <h4>Conclusion</h4>
                      <div className="field-value">{generatedResult.lessonPlan?.conclusion || '—'}</div>
                    </div>

                    <div className="preview-field">
                      <h4>Evaluation</h4>
                      <div className="field-value">{generatedResult.lessonPlan?.evaluation || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Record of Work Preview */}
              <div className="preview-pane">
                <div className="pane-header">
                  <h3>Record of Work</h3>
                </div>
                <div className="pane-body">
                  <div className="preview-table-wrapper">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Week</strong></td>
                          <td>{generatedResult.recordOfWork?.week || '—'}</td>
                        </tr>
                        <tr>
                          <td><strong>Date</strong></td>
                          <td>{generatedResult.recordOfWork?.date || '—'}</td>
                        </tr>
                        <tr>
                          <td><strong>Topic / Strand</strong></td>
                          <td>{generatedResult.recordOfWork?.topic || '—'}</td>
                        </tr>
                        <tr>
                          <td><strong>Sub-Topic / Sub-strand</strong></td>
                          <td>{generatedResult.recordOfWork?.subTopic || '—'}</td>
                        </tr>
                        <tr>
                          <td><strong>Remarks</strong></td>
                          <td>{generatedResult.recordOfWork?.remarks || '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
