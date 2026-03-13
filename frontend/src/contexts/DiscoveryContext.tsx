import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useCustomerSync, type SyncStatus } from '@/hooks/useCustomerSync';
import type {
  AnswerMap, NoteMap, ContextFieldMap, EnabledSectionMap, LeaseTimeUnitMap,
  DataCenter, Site, Drawing, DrawingConfig, SizingSummary, Question,
  UDSMember, PlatformMode,
} from '@/types';

// ── Context value interface ──────────────────────────────────────────────────
interface DiscoveryContextValue {
  answers: AnswerMap;
  notes: NoteMap;
  contextFields: ContextFieldMap;
  meetingNotes: string;
  enabledSections: EnabledSectionMap;
  udsMembers: UDSMember[];
  defaultAnswers: AnswerMap;
  leaseTimeUnits: LeaseTimeUnitMap;
  dataCenters: DataCenter[];
  sites: Site[];
  platformMode: PlatformMode;
  sizingSummary: SizingSummary;
  isHydrated: boolean;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: string | null;
  syncStatus: SyncStatus;
  isConnected: boolean;
  questions: Question[];
  drawings: Drawing[];
  activeDrawingId: string;
  drawingConfigs: Record<string, DrawingConfig>;
  getDrawingConfig: (drawingId: string) => DrawingConfig;
  updateDrawingConfig: (drawingId: string, updates: Partial<DrawingConfig>) => void;
  setActiveDrawingId: (id: string) => void;
  addDrawing: () => void;
  cloneDrawing: (drawingId: string) => void;
  deleteDrawing: (drawingId: string) => void;
  renameDrawing: (drawingId: string, newName: string) => void;
  setAnswer: (id: string, value: string) => void;
  setNote: (id: string, value: string) => void;
  setContextField: (key: string, value: string) => void;
  setMeetingNotes: (notes: string) => void;
  updateAnswers: (updates: AnswerMap) => void;
  toggleSection: (section: string) => void;
  enableAllSections: () => void;
  disableAllSections: () => void;
  clearSection: (section: string) => void;
  clearAllData: () => void;
  addUDSMember: (member: UDSMember) => void;
  updateUDSMember: (id: string, updates: Partial<UDSMember>) => void;
  deleteUDSMember: (id: string) => void;
  setLeaseTimeUnit: (id: string, unit: string) => void;
  addDataCenter: (name: string, knowledgeWorkers?: number) => void;
  updateDataCenter: (id: string, updates: Partial<DataCenter>) => void;
  deleteDataCenter: (id: string) => void;
  addSite: (name: string, dataCenterId: string | null, knowledgeWorkers?: number) => string;
  updateSite: (id: string, updates: Partial<Site>) => void;
  deleteSite: (id: string) => void;
  setPlatformMode: (mode: PlatformMode) => void;
  setSizingSummary: (summary: SizingSummary) => void;
  saveToServer: () => Promise<void>;
}

const DiscoveryContext = createContext<DiscoveryContextValue | undefined>(undefined);

// Generate default answers for all questions
const getDefaultAnswers = (questionsList: Question[]): AnswerMap => {
  const defaults: AnswerMap = {};
  questionsList.forEach(question => {
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

interface DiscoveryProviderProps { children: ReactNode; customerId: string; }
export function DiscoveryProvider({ children, customerId }: DiscoveryProviderProps) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [notes, setNotes] = useState<NoteMap>({});
  const [contextFields, setContextFieldsState] = useState<ContextFieldMap>({ ...emptyContextFields });
  const [meetingNotes, setMeetingNotesState] = useState<string>('');
  const [enabledSections, setEnabledSections] = useState<EnabledSectionMap>({});
  const [udsMembers, setUdsMembers] = useState<UDSMember[]>([]);
  const [leaseTimeUnits, setLeaseTimeUnitsState] = useState<LeaseTimeUnitMap>({});
  const [dataCenters, setDataCenters] = useState<DataCenter[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [platformMode, setPlatformModeState] = useState<PlatformMode>('NIOS');
  const [sizingSummary, setSizingSummaryState] = useState<SizingSummary>({ totalTokens: 0, partnerSku: '—', totalIPs: 0 });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoaded, setQuestionsLoaded] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [lastRemoteUpdate, setLastRemoteUpdate] = useState<string | null>(null);

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

  // Load questions from API once on mount
  useEffect(() => {
    apiRequest('GET', '/api/questions')
      .then(r => r.json())
      .then(data => { setQuestions(data); setQuestionsLoaded(true); })
      .catch(() => setQuestionsLoaded(true));
  }, []);

  // Load data from MongoDB on mount or customer change
  useEffect(() => {
    if (!questionsLoaded) return;
    if (!customerId) { setIsHydrated(true); return; }
    const defaults = getDefaultAnswers(questions);

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
  }, [customerId, questionsLoaded]);

  // Handle incoming WebSocket data updates from other users
  const handleRemoteUpdate = useCallback((data: any) => {
    console.log('[DiscoveryContext] Received WebSocket update:', data.lastSaved);
    
    // Update all state with remote data (always apply updates from WebSocket)
    if (data.answers) {
      console.log('[DiscoveryContext] Updating answers from remote');
      setAnswers(data.answers);
    }
    if (data.notes) setNotes(data.notes);
    if (data.contextFields) setContextFieldsState(data.contextFields);
    if (data.meetingNotes !== undefined) setMeetingNotesState(data.meetingNotes);
    if (data.enabledSections) setEnabledSections(data.enabledSections);
    if (data.udsMembers) setUdsMembers(data.udsMembers);
    if (data.leaseTimeUnits) setLeaseTimeUnitsState(data.leaseTimeUnits);
    if (data.dataCenters) setDataCenters(data.dataCenters);
    if (data.sites) setSites(data.sites);
    if (data.drawings) setDrawings(data.drawings);
    if (data.activeDrawingId) setActiveDrawingIdState(data.activeDrawingId);
    if (data.drawingConfigs) {
      // Merge remote drawing configs with local — preserve local siteOverrides
      // to prevent WebSocket round-trips from wiping unsaved local changes
      setDrawingConfigs(prev => {
        const merged = { ...data.drawingConfigs };
        Object.keys(prev).forEach(drawingId => {
          if (merged[drawingId] && prev[drawingId]?.siteOverrides) {
            merged[drawingId] = {
              ...merged[drawingId],
              siteOverrides: { ...merged[drawingId].siteOverrides, ...prev[drawingId].siteOverrides },
            };
          }
        });
        return merged;
      });
    }
    
    // Update last remote timestamp
    if (data.lastSaved) {
      setLastRemoteUpdate(data.lastSaved);
    }
    
    console.log('[DiscoveryContext] Data updated from remote user');
    // TODO: Add toast notification here
  }, []);

  // Connect to WebSocket for real-time sync
  const { syncStatus, isConnected } = useCustomerSync(customerId, {
    onDataUpdate: handleRemoteUpdate,
    enabled: isHydrated, // Only connect after initial data load
  });

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
    setAnswers(prev => {
      const updates = { [questionId]: answer };
      // Bidirectional sync: 3rd Party Integrations between IPAM and PS
      if (questionId === 'ipam-11') updates['ps-3'] = answer;
      if (questionId === 'ps-3') updates['ipam-11'] = answer;
      return { ...prev, ...updates };
    });
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
    const uniqueSections = new Set(questions.map(q => q.section));
    uniqueSections.forEach(section => { allSections[section] = true; });
    setEnabledSections(allSections);
    markDirty();
  }, [markDirty, questions]);

  const disableAllSections = useCallback(() => {
    const allSections = {};
    const uniqueSections = new Set(questions.map(q => q.section));
    uniqueSections.forEach(section => { allSections[section] = false; });
    const allQuestionIds = new Set(questions.map(q => q.id));
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
  }, [markDirty, questions]);

  const clearSection = useCallback((sectionName) => {
    const sectionQs = questions.filter(q => q.section === sectionName);
    const sectionIds = new Set(sectionQs.map(q => q.id));
    const defaults = getDefaultAnswers(questions);
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
  }, [markDirty, questions]);

  const clearAllData = useCallback(() => {
    const defaults = getDefaultAnswers(questions);
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
  }, [markDirty, questions]);

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

  // ── Reactive DNS server count: keeps sizingSummary.dnsSiteCount current
  // whenever sites change, even when the Sizing tab is not mounted.
  // Raw DiscoveryContext.sites have no role property — roles are resolved in
  // TokenCalculatorSummary from siteOverrides. All branch sites default to
  // 'DNS/DHCP', so sites.length is the correct DNS server count when Sizing
  // is not mounted. TokenCalculatorSummary overwrites this with the precise
  // role-aware count when the Sizing tab is active. ─────────────────────────
  useEffect(() => {
    setSizingSummaryState(prev => ({
      ...prev,
      dnsSiteCount: Math.max(1, sites.length),
    }));
  }, [sites]);

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
      siteOverrides: {}, siteOrder: null, layoutMode: 'auto',
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
      [newId]: { platformMode: 'NIOS', featureNIOS: true, featureUDDI: false, featureSecurity: false, siteOverrides: {}, siteOrder: null, layoutMode: 'auto' },
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

  const defaultAnswers = getDefaultAnswers(questions);

  // Derive global platformMode from active drawing config (for AssessmentQuestions compatibility)
  const activeDrawingConfig = drawingConfigs[activeDrawingId] || {};
  const activePlatformMode = activeDrawingConfig.platformMode || platformMode;

  return (
    <DiscoveryContext.Provider value={{
      answers, notes, contextFields, meetingNotes, enabledSections,
      udsMembers, defaultAnswers, leaseTimeUnits, dataCenters, sites,
      platformMode: activePlatformMode, sizingSummary,
      isHydrated, isDirty, isSaving, lastSaved, syncStatus, isConnected, questions,
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

export function useDiscovery(): DiscoveryContextValue {
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
