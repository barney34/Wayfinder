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
  const [isHydrated, setIsHydrated] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

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
  }, [answers, notes, contextFields, meetingNotes, enabledSections, udsMembers, leaseTimeUnits, dataCenters, sites, customerId, isHydrated, isDirty]);

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

  const defaultAnswers = getDefaultAnswers();

  return (
    <DiscoveryContext.Provider value={{
      answers, notes, contextFields, meetingNotes, enabledSections,
      udsMembers, defaultAnswers, leaseTimeUnits, dataCenters, sites,
      isHydrated, isDirty, isSaving, lastSaved,
      setAnswer, setNote, setContextField, setMeetingNotes, updateAnswers,
      toggleSection, enableAllSections, disableAllSections, clearSection, clearAllData,
      addUDSMember, updateUDSMember, deleteUDSMember,
      setLeaseTimeUnit,
      addDataCenter, updateDataCenter, deleteDataCenter,
      addSite, updateSite, deleteSite,
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
