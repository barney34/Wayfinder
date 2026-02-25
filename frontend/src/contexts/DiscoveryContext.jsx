import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { discoveryQuestions } from '@/lib/questions';
import { apiRequest } from '@/lib/queryClient';

const DiscoveryContext = createContext(undefined);

// Generate default answers for all questions
const getDefaultAnswers = () => {
  const defaults = {};
  discoveryQuestions.forEach(question => {
    if (question.fieldType === 'yesno') {
      defaults[question.id] = question.defaultValue || 'No';
    } else if (question.defaultValue) {
      defaults[question.id] = question.defaultValue;
    }
  });
  defaults['feature-uddi'] = 'Yes';
  defaults['feature-security'] = 'Yes';
  defaults['feature-asset insights'] = 'Yes';
  defaults['ud-site-config'] = '[]';
  return defaults;
};

const emptyContextFields = {
  ipam: '', dns: '', dhcp: '', locations: '', integrations: '',
  projectGoals: '', painPoints: '', timeline: '',
  targetArchitecture: '', migrationPath: '',
  environment: '', outcomes: '', endState: '', migration: '', niAi: '',
};

export function DiscoveryProvider({ children, customerId }) {
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState({});
  const [contextFields, setContextFieldsState] = useState({ ...emptyContextFields });
  const [meetingNotes, setMeetingNotesState] = useState('');
  const [enabledSections, setEnabledSections] = useState({});
  const [udsMembers, setUdsMembers] = useState([]);
  const [leaseTimeUnits, setLeaseTimeUnitsState] = useState({});
  const [dataCenters, setDataCenters] = useState([]);
  const [sites, setSites] = useState([]);
  const [platformMode, setPlatformModeState] = useState('NIOS');
  const [sizingSummary, setSizingSummaryState] = useState({ totalTokens: 0, partnerSku: '—', totalIPs: 0 });
  const [isHydrated, setIsHydrated] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // ── Per-drawing state: each drawing has its own platformMode, features, siteOverrides, siteOrder ──
  const _defaultDrawingId = `drawing-${Date.now()}-init`;
  const [drawings, setDrawings] = useState([{
    id: _defaultDrawingId,
    name: '10',
    createdAt: new Date().toISOString(),
  }]);
  const [activeDrawingId, setActiveDrawingIdState] = useState(_defaultDrawingId);
  // drawingConfigs: { [drawingId]: { platformMode, featureNIOS, featureUDDI, featureSecurity, siteOverrides, siteOrder } }
  const [drawingConfigs, setDrawingConfigs] = useState({});

  // Load data from MongoDB on mount or customer change
  useEffect(() => {
    if (!customerId) { setIsHydrated(true); return; }
    const defaults = getDefaultAnswers();

    apiRequest('GET', `/api/customers/${customerId}/discovery`)
      .then(res => res.json())
      .then(data => {
        const migratedAnswers = { ...(data.answers || {}) };
        if ('feature-asset/ network insight' in migratedAnswers) {
          migratedAnswers['feature-asset insights'] = migratedAnswers['feature-asset/ network insight'];
          delete migratedAnswers['feature-asset/ network insight'];
        }
        setAnswers({ ...defaults, ...migratedAnswers });
        setNotes(data.notes || {});
        setContextFieldsState(data.contextFields || { ...emptyContextFields });
        setMeetingNotesState(data.meetingNotes || '');
        setEnabledSections(data.enabledSections || {});
        setUdsMembers(data.udsMembers || []);
        setLeaseTimeUnitsState(data.leaseTimeUnits || {});
        setDataCenters(data.dataCenters || []);
        setSites(data.sites || []);
        // Load per-drawing state
        if (data.drawings && data.drawings.length > 0) {
          setDrawings(data.drawings);
          setActiveDrawingIdState(data.activeDrawingId || data.drawings[0].id);
        }
        if (data.drawingConfigs) setDrawingConfigs(data.drawingConfigs);
        setIsHydrated(true);
      })
      .catch(() => {
        setAnswers(defaults);
        setNotes({});
        setContextFieldsState({ ...emptyContextFields });
        setMeetingNotesState('');
        setEnabledSections({});
        setUdsMembers([]);
        setLeaseTimeUnitsState({});
        setDataCenters([]);
        setSites([]);
        setIsHydrated(true);
      });
  }, [customerId]);

  // Auto-save to MongoDB when data changes (debounced)
  useEffect(() => {
    if (!customerId || !isHydrated || !isDirty) return;
    const timer = setTimeout(() => {
      setIsSaving(true);
      const payload = {
        answers, notes, contextFields, meetingNotes,
        enabledSections, udsMembers, leaseTimeUnits, dataCenters, sites,
        drawings, activeDrawingId, drawingConfigs,
      };
      apiRequest('PUT', `/api/customers/${customerId}/discovery`, payload)
        .then(() => {
          setIsDirty(false);
          setLastSaved(new Date().toISOString());
        })
        .catch(err => console.error('Auto-save failed:', err))
        .finally(() => setIsSaving(false));
    }, 2000);
    return () => clearTimeout(timer);
  }, [answers, notes, contextFields, meetingNotes, enabledSections, udsMembers, leaseTimeUnits, dataCenters, sites, drawings, activeDrawingId, drawingConfigs, customerId, isHydrated, isDirty]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const setAnswer = useCallback((questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    markDirty();
  }, [markDirty]);

  const setNote = useCallback((questionId, note) => {
    setNotes(prev => ({ ...prev, [questionId]: note }));
    markDirty();
  }, [markDirty]);

  const setContextField = useCallback((field, value) => {
    setContextFieldsState(prev => ({ ...prev, [field]: value }));
    markDirty();
  }, [markDirty]);

  const setMeetingNotes = useCallback((notes) => {
    setMeetingNotesState(notes);
    markDirty();
  }, [markDirty]);

  const updateAnswers = useCallback((newAnswers) => {
    setAnswers(prev => ({ ...prev, ...newAnswers }));
    markDirty();
  }, [markDirty]);

  const toggleSection = useCallback((sectionName) => {
    setEnabledSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
    markDirty();
  }, [markDirty]);

  const enableAllSections = useCallback(() => {
    const allSections = {};
    const uniqueSections = new Set(discoveryQuestions.map(q => q.section));
    uniqueSections.forEach(section => { allSections[section] = true; });
    setEnabledSections(allSections);
    markDirty();
  }, [markDirty]);

  const disableAllSections = useCallback(() => {
    const allSections = {};
    const uniqueSections = new Set(discoveryQuestions.map(q => q.section));
    uniqueSections.forEach(section => { allSections[section] = false; });
    const allQuestionIds = new Set(discoveryQuestions.map(q => q.id));
    setAnswers(prev => {
      const newAnswers = { ...prev };
      allQuestionIds.forEach(id => { delete newAnswers[id]; });
      return newAnswers;
    });
    setNotes(prev => {
      const newNotes = { ...prev };
      allQuestionIds.forEach(id => { delete newNotes[id]; });
      return newNotes;
    });
    setEnabledSections(allSections);
    markDirty();
  }, [markDirty]);

  const clearSection = useCallback((sectionName) => {
    const sectionQs = discoveryQuestions.filter(q => q.section === sectionName);
    const sectionIds = new Set(sectionQs.map(q => q.id));
    const defaults = getDefaultAnswers();
    setAnswers(prev => {
      const newAnswers = { ...prev };
      sectionQs.forEach(q => {
        if (defaults[q.id] !== undefined) newAnswers[q.id] = defaults[q.id];
        else delete newAnswers[q.id];
      });
      return newAnswers;
    });
    setNotes(prev => {
      const newNotes = { ...prev };
      sectionIds.forEach(id => { delete newNotes[id]; });
      return newNotes;
    });
    setEnabledSections(prev => ({ ...prev, [sectionName]: false }));
    markDirty();
  }, [markDirty]);

  const clearAllData = useCallback(() => {
    const defaults = getDefaultAnswers();
    setAnswers(defaults);
    setNotes({});
    setContextFieldsState({ ...emptyContextFields });
    setMeetingNotesState('');
    setEnabledSections({});
    setUdsMembers([]);
    setLeaseTimeUnitsState({});
    setDataCenters([]);
    setSites([]);
    markDirty();
  }, [markDirty]);

  const setLeaseTimeUnit = useCallback((questionId, unit) => {
    setLeaseTimeUnitsState(prev => ({ ...prev, [questionId]: unit }));
    markDirty();
  }, [markDirty]);

  const addUDSMember = useCallback((member) => {
    const newMember = { ...member, id: `uds-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    setUdsMembers(prev => [...prev, newMember]);
    markDirty();
  }, [markDirty]);

  const updateUDSMember = useCallback((id, updates) => {
    setUdsMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    markDirty();
  }, [markDirty]);

  const deleteUDSMember = useCallback((id) => {
    setUdsMembers(prev => prev.filter(m => m.id !== id));
    markDirty();
  }, [markDirty]);

  const addDataCenter = useCallback((name, knowledgeWorkers = 0) => {
    const id = `dc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setDataCenters(prev => [...prev, { id, name, knowledgeWorkers }]);
    markDirty();
    return id;
  }, [markDirty]);

  const updateDataCenter = useCallback((id, updates) => {
    setDataCenters(prev => prev.map(dc => dc.id === id ? { ...dc, ...updates } : dc));
    markDirty();
  }, [markDirty]);

  const deleteDataCenter = useCallback((id) => {
    setDataCenters(prev => prev.filter(dc => dc.id !== id));
    setSites(prev => prev.filter(site => site.dataCenterId !== id));
    markDirty();
  }, [markDirty]);

  const addSite = useCallback((name, dataCenterId, knowledgeWorkers = 0) => {
    const id = `site-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSites(prev => [...prev, { id, name, dataCenterId, knowledgeWorkers }]);
    markDirty();
    return id;
  }, [markDirty]);

  const updateSite = useCallback((id, updates) => {
    setSites(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    markDirty();
  }, [markDirty]);

  const deleteSite = useCallback((id) => {
    setSites(prev => prev.filter(s => s.id !== id));
    markDirty();
  }, [markDirty]);

  const setPlatformMode = useCallback((mode) => {
    setPlatformModeState(mode);
    markDirty();
  }, [markDirty]);

  const setSizingSummary = useCallback((summary) => {
    setSizingSummaryState(summary);
  }, []);

  // ── Drawing management functions ──────────────────────────────────────────
  const _genDrawingId = () => `drawing-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;

  const _getNextDrawingName = useCallback((currentDrawings) => {
    const nums = currentDrawings.map(d => parseInt(d.name)).filter(n => !isNaN(n));
    if (nums.length === 0) return '10';
    return String(Math.ceil((Math.max(...nums) + 1) / 10) * 10);
  }, []);

  const setActiveDrawingId = useCallback((id) => {
    setActiveDrawingIdState(id);
    markDirty();
  }, [markDirty]);

  const getDrawingConfig = useCallback((drawingId) => {
    return drawingConfigs[drawingId] || {
      platformMode: 'NIOS',
      featureNIOS: true, featureUDDI: false, featureSecurity: true,
      siteOverrides: {}, siteOrder: null,
    };
  }, [drawingConfigs]);

  const updateDrawingConfig = useCallback((drawingId, updates) => {
    setDrawingConfigs(prev => ({
      ...prev,
      [drawingId]: { ...(prev[drawingId] || {}), ...updates },
    }));
    markDirty();
  }, [markDirty]);

  const addDrawing = useCallback(() => {
    const newId = _genDrawingId();
    const newDrawing = { id: newId, name: _getNextDrawingName(drawings), createdAt: new Date().toISOString() };
    setDrawings(prev => [...prev, newDrawing]);
    setDrawingConfigs(prev => ({
      ...prev,
      [newId]: { platformMode: 'NIOS', featureNIOS: true, featureUDDI: false, featureSecurity: false, siteOverrides: {}, siteOrder: null },
    }));
    setActiveDrawingIdState(newId);
    markDirty();
    return newDrawing;
  }, [drawings, _getNextDrawingName, markDirty]);

  const cloneDrawing = useCallback((sourceId) => {
    const source = drawings.find(d => d.id === sourceId);
    if (!source) return;
    const newId = _genDrawingId();
    const newDrawing = { id: newId, name: _getNextDrawingName(drawings), createdAt: new Date().toISOString() };
    const sourceConfig = drawingConfigs[sourceId] || {};
    setDrawings(prev => [...prev, newDrawing]);
    setDrawingConfigs(prev => ({
      ...prev,
      [newId]: JSON.parse(JSON.stringify(sourceConfig)), // deep copy
    }));
    setActiveDrawingIdState(newId);
    markDirty();
    return newDrawing;
  }, [drawings, drawingConfigs, _getNextDrawingName, markDirty]);

  const deleteDrawing = useCallback((drawingId) => {
    setDrawings(prev => {
      if (prev.length <= 1) return prev;
      const filtered = prev.filter(d => d.id !== drawingId);
      setActiveDrawingIdState(cur => cur === drawingId ? filtered[0].id : cur);
      return filtered;
    });
    setDrawingConfigs(prev => { const n = { ...prev }; delete n[drawingId]; return n; });
    markDirty();
  }, [markDirty]);

  const renameDrawing = useCallback((drawingId, newName) => {
    setDrawings(prev => prev.map(d => d.id === drawingId ? { ...d, name: newName } : d));
    markDirty();
  }, [markDirty]);

  // Immediate save to server (bypasses debounce)
  const saveToServer = useCallback(async () => {
    if (!customerId) return;
    setIsSaving(true);
    try {
      const payload = {
        answers, notes, contextFields, meetingNotes,
        enabledSections, udsMembers, leaseTimeUnits, dataCenters, sites,
        drawings, activeDrawingId, drawingConfigs,
      };
      await apiRequest('PUT', `/api/customers/${customerId}/discovery`, payload);
      setIsDirty(false);
      setLastSaved(new Date().toISOString());
    } finally {
      setIsSaving(false);
    }
  }, [answers, notes, contextFields, meetingNotes, enabledSections, udsMembers, leaseTimeUnits, dataCenters, sites, drawings, activeDrawingId, drawingConfigs, customerId]);

  const defaultAnswers = getDefaultAnswers();

  // Derive global platformMode from active drawing config (for AssessmentQuestions compatibility)
  const activeDrawingConfig = drawingConfigs[activeDrawingId] || {};
  const activePlatformMode = activeDrawingConfig.platformMode || platformMode;

  return (
    <DiscoveryContext.Provider value={{
      answers, notes, contextFields, meetingNotes, enabledSections,
      udsMembers, defaultAnswers, leaseTimeUnits, dataCenters, sites,
      platformMode: activePlatformMode, sizingSummary,
      isHydrated, isDirty, isSaving, lastSaved,
      // Drawing management
      drawings, activeDrawingId, drawingConfigs,
      getDrawingConfig, updateDrawingConfig,
      setActiveDrawingId, addDrawing, cloneDrawing, deleteDrawing, renameDrawing,
      setAnswer, setNote, setContextField, setMeetingNotes, updateAnswers,
      toggleSection, enableAllSections, disableAllSections, clearSection, clearAllData,
      addUDSMember, updateUDSMember, deleteUDSMember,
      setLeaseTimeUnit,
      addDataCenter, updateDataCenter, deleteDataCenter,
      addSite, updateSite, deleteSite, setPlatformMode, setSizingSummary, saveToServer,
    }}>
      {children}
    </DiscoveryContext.Provider>
  );
}

export function useDiscovery() {
  const context = useContext(DiscoveryContext);
  if (context === undefined) {
    throw new Error('useDiscovery must be used within a DiscoveryProvider');
  }
  return context;
}

// Optional hook that returns null if not inside provider
export function useDiscoveryOptional() {
  return useContext(DiscoveryContext);
}
