import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpecializedAgents } from '@/hooks/useSpecializedAgents';
import { useMcpServers } from '@/hooks/useMcpServers';
import { useOpenApiSchemas } from '@/hooks/useOpenApiSchemas';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';

export interface UseAgentEditorOptions {
  initialAgentId?: string | null;
}

export interface UseAgentEditorResult {
  agents: SpecializedAgentConfig[];
  loading: boolean;
  error: string | null;
  selectedAgent: SpecializedAgentConfig | null;
  editedAgent: Partial<SpecializedAgentConfig> | null;
  hasChanges: boolean;
  loadingDetails: boolean;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (value: boolean) => void;
  isFavorite: boolean;
  togglingFavorite: boolean;
  handleSelectAgent: (agent: SpecializedAgentConfig) => Promise<void>;
  handleCancelEdit: () => void;
  handleSaveEdit: () => Promise<void>;
  handleDeleteAgent: () => Promise<void>;
  handleToggleFavorite: () => Promise<void>;
  updateField: <K extends keyof SpecializedAgentConfig>(
    field: K,
    value: SpecializedAgentConfig[K]
  ) => void;
  loadAgents: () => Promise<void>;
  mcpServers: ReturnType<typeof useMcpServers>['allServers'];
  agentMcpServers: ReturnType<typeof useMcpServers>['agentServers'];
  mcpLoading: boolean;
  linkServer: ReturnType<typeof useMcpServers>['linkServer'];
  unlinkServer: ReturnType<typeof useMcpServers>['unlinkServer'];
  isServerLinked: ReturnType<typeof useMcpServers>['isServerLinked'];
  openApiSchemas: ReturnType<typeof useOpenApiSchemas>['allSchemas'];
  agentOpenApiSchemas: ReturnType<typeof useOpenApiSchemas>['agentSchemas'];
  openApiLoading: ReturnType<typeof useOpenApiSchemas>['loading'];
  linkSchema: ReturnType<typeof useOpenApiSchemas>['linkSchema'];
  unlinkSchema: ReturnType<typeof useOpenApiSchemas>['unlinkSchema'];
  isSchemaLinked: ReturnType<typeof useOpenApiSchemas>['isSchemaLinked'];
}

export function useAgentEditor(options: UseAgentEditorOptions = {}): UseAgentEditorResult {
  const { initialAgentId = null } = options;
  const { user } = useAuth();
  const {
    agents,
    loading,
    error,
    selectedAgent,
    selectAgent,
    getAgent,
    patchAgent,
    deleteAgent,
    loadAgents,
  } = useSpecializedAgents();

  const {
    allServers: mcpServers,
    agentServers: agentMcpServers,
    loading: mcpLoading,
    linkServer,
    unlinkServer,
    isServerLinked,
    loadAgentServers,
  } = useMcpServers(selectedAgent?.id);

  const {
    allSchemas: openApiSchemas,
    agentSchemas: agentOpenApiSchemas,
    loading: openApiLoading,
    linkSchema,
    unlinkSchema,
    isSchemaLinked,
    loadAgentSchemas,
  } = useOpenApiSchemas(selectedAgent?.id);

  const [editedAgent, setEditedAgent] = useState<Partial<SpecializedAgentConfig> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);

  const initialSelectionDone = useRef(false);

  useEffect(() => {
    if (selectedAgent && !hasChanges) {
      setEditedAgent({ ...selectedAgent });
    }
  }, [selectedAgent, hasChanges]);

  useEffect(() => {
    if (!loading && agents.length > 0 && !selectedAgent && !initialSelectionDone.current) {
      initialSelectionDone.current = true;

      let storedId: string | null = null;
      if (typeof window !== 'undefined') {
        storedId = window.sessionStorage.getItem('agents:lastSelected') || null;
      }

      const targetId = initialAgentId || storedId;
      const target = targetId
        ? agents.find(agent => agent.id === targetId || agent.slug === targetId)
        : agents[0];

      if (target) {
        void handleSelectAgent(target);
      }

      if (storedId && typeof window !== 'undefined') {
        window.sessionStorage.removeItem('agents:lastSelected');
      }
    }
  }, [loading, agents, selectedAgent, initialAgentId]);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user?.id || !selectedAgent?.id) {
        setIsFavorite(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('favorite_agent_id')
        .eq('id', user.id)
        .single();

      if (userError) {
        logger.error('[useAgentEditor] ❌ Erreur récupération favori:', userError);
        setIsFavorite(false);
        return;
      }

      setIsFavorite(userData?.favorite_agent_id === selectedAgent.id);
    };

    void checkFavoriteStatus();
  }, [user?.id, selectedAgent?.id]);

  const handleSelectAgent = useCallback(
    async (agent: SpecializedAgentConfig) => {
      setHasChanges(false);
      setLoadingDetails(true);

      try {
        const agentId = agent.slug || agent.id;
        const fullAgent = await getAgent(agentId);

        if (!fullAgent) {
          throw new Error('Agent non trouvé');
        }

        selectAgent(fullAgent);
        setEditedAgent({ ...fullAgent });
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('agents:lastSelected');
        }

        await Promise.all([
          loadAgentSchemas(fullAgent.id),
          loadAgentServers(fullAgent.id),
        ]);
      } catch (err) {
        logger.error('[useAgentEditor] ❌ Erreur chargement agent:', err);
        selectAgent(agent);
        setEditedAgent({ ...agent });
      } finally {
        setLoadingDetails(false);
      }
    },
    [getAgent, selectAgent, loadAgentSchemas, loadAgentServers]
  );

  const handleCancelEdit = useCallback(() => {
    if (!selectedAgent) {
      return;
    }
    setEditedAgent({ ...selectedAgent });
    setHasChanges(false);
  }, [selectedAgent]);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedAgent || !editedAgent || !hasChanges) {
      return;
    }

    const agentId = selectedAgent.slug || selectedAgent.id;
    const updated = await patchAgent(agentId, editedAgent);

    if (updated) {
      selectAgent(updated);
      setEditedAgent({ ...updated });
      setHasChanges(false);
    }
  }, [selectedAgent, editedAgent, hasChanges, patchAgent, selectAgent]);

  const handleDeleteAgent = useCallback(async () => {
    if (!selectedAgent) {
      return;
    }

    const agentId = selectedAgent.slug || selectedAgent.id;
    const success = await deleteAgent(agentId);

    if (success) {
      selectAgent(null);
      setShowDeleteConfirm(false);
    }
  }, [selectedAgent, deleteAgent, selectAgent]);

  const updateField = useCallback(
    <K extends keyof SpecializedAgentConfig>(field: K, value: SpecializedAgentConfig[K]) => {
      setEditedAgent(prev => {
        if (!prev) return null;
        
        // Si le champ modifié est 'model', mettre à jour automatiquement le 'provider'
        if (field === 'model' && typeof value === 'string') {
          const { getModelInfo } = require('@/constants/groqModels');
          const modelInfo = getModelInfo(value);
          const newProvider = modelInfo?.provider || 'groq'; // Fallback vers 'groq'
          
          logger.dev('[useAgentEditor] 🔄 Mise à jour automatique du provider:', {
            model: value,
            provider: newProvider
          });
          
          return { ...prev, [field]: value, provider: newProvider };
        }
        
        return { ...prev, [field]: value };
      });
      setHasChanges(true);
    },
    []
  );

  const handleToggleFavorite = useCallback(async () => {
    if (!user?.id || !selectedAgent?.id || togglingFavorite) {
      return;
    }

    setTogglingFavorite(true);

    try {
      const newFavoriteId = isFavorite ? null : selectedAgent.id;

      const { error: updateError } = await supabase
        .from('users')
        .update({ favorite_agent_id: newFavoriteId })
        .eq('id', user.id);

      if (updateError) {
        logger.error('[useAgentEditor] ❌ Erreur toggle favori:', updateError);
        return;
      }

      setIsFavorite(!isFavorite);
      logger.dev('[useAgentEditor] ⭐ Agent favori mis à jour', {
        agentId: selectedAgent.id,
        isFavorite: !isFavorite,
      });
    } catch (err) {
      logger.error('[useAgentEditor] ❌ Erreur toggle favori:', err);
    } finally {
      setTogglingFavorite(false);
    }
  }, [user?.id, selectedAgent?.id, togglingFavorite, isFavorite]);

  return {
    agents,
    loading,
    error,
    selectedAgent,
    editedAgent,
    hasChanges,
    loadingDetails,
    showDeleteConfirm,
    setShowDeleteConfirm,
    isFavorite,
    togglingFavorite,
    handleSelectAgent,
    handleCancelEdit,
    handleSaveEdit,
    handleDeleteAgent,
    handleToggleFavorite,
    updateField,
    loadAgents,
    mcpServers,
    agentMcpServers,
    mcpLoading,
    linkServer,
    unlinkServer,
    isServerLinked,
    openApiSchemas,
    agentOpenApiSchemas,
    openApiLoading,
    linkSchema,
    unlinkSchema,
    isSchemaLinked,
  };
}

export default useAgentEditor;

