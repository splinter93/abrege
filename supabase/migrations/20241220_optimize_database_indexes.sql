-- Migration pour optimiser les performances de la base de données
-- Index optimisés pour les requêtes fréquentes des tool calls

-- ==============================================
-- INDEX POUR LES ARTICLES (NOTES)
-- ==============================================

-- Index composite pour les requêtes utilisateur + classeur
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_user_classeur_active 
ON articles(user_id, classeur_id, is_deleted) 
WHERE is_deleted = false;

-- Index pour les recherches textuelles dans les titres
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_title_search 
ON articles USING gin(to_tsvector('french', source_title))
WHERE is_deleted = false;

-- Index pour les recherches textuelles dans le contenu
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_content_search 
ON articles USING gin(to_tsvector('french', markdown_content))
WHERE is_deleted = false;

-- Index pour les requêtes par slug
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_slug_user 
ON articles(slug, user_id)
WHERE is_deleted = false;

-- Index pour les requêtes par dossier
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_folder_user 
ON articles(folder_id, user_id)
WHERE is_deleted = false AND folder_id IS NOT NULL;

-- Index pour les requêtes de tri par date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_user_updated 
ON articles(user_id, updated_at DESC)
WHERE is_deleted = false;

-- Index pour les requêtes de visibilité
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_visibility 
ON articles(visibility, created_at DESC)
WHERE is_deleted = false;

-- ==============================================
-- INDEX POUR LES CLASSEURS
-- ==============================================

-- Index pour les requêtes utilisateur + position
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classeurs_user_position 
ON classeurs(user_id, position ASC)
WHERE is_deleted = false;

-- Index pour les recherches textuelles dans les noms
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classeurs_name_search 
ON classeurs USING gin(to_tsvector('french', name))
WHERE is_deleted = false;

-- Index pour les recherches textuelles dans les descriptions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classeurs_description_search 
ON classeurs USING gin(to_tsvector('french', description))
WHERE is_deleted = false;

-- Index pour les requêtes par slug
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classeurs_slug_user 
ON classeurs(slug, user_id)
WHERE is_deleted = false;

-- ==============================================
-- INDEX POUR LES DOSSIERS
-- ==============================================

-- Index composite pour les requêtes utilisateur + classeur
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_user_classeur 
ON folders(user_id, classeur_id)
WHERE is_deleted = false;

-- Index pour les requêtes par dossier parent
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_parent_user 
ON folders(parent_folder_id, user_id)
WHERE is_deleted = false AND parent_folder_id IS NOT NULL;

-- Index pour les recherches textuelles dans les noms
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_name_search 
ON folders USING gin(to_tsvector('french', name))
WHERE is_deleted = false;

-- Index pour les requêtes par slug
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_slug_user 
ON folders(slug, user_id)
WHERE is_deleted = false;

-- Index pour les requêtes de tri par position
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_classeur_position 
ON folders(classeur_id, position ASC)
WHERE is_deleted = false;

-- ==============================================
-- INDEX POUR LES AGENTS
-- ==============================================

-- Index pour les agents actifs par slug
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_slug_active 
ON agents(slug)
WHERE is_active = true AND is_endpoint_agent = true;

-- Index pour les agents actifs par type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_type_active 
ON agents(agent_type, is_active)
WHERE is_endpoint_agent = true;

-- Index pour les recherches textuelles dans les noms
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_name_search 
ON agents USING gin(to_tsvector('french', name))
WHERE is_active = true;

-- Index pour les recherches textuelles dans les descriptions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_description_search 
ON agents USING gin(to_tsvector('french', description))
WHERE is_active = true;

-- Index pour les requêtes par priorité
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_priority_active 
ON agents(priority DESC, created_at DESC)
WHERE is_active = true AND is_endpoint_agent = true;

-- ==============================================
-- INDEX POUR LES FICHIERS
-- ==============================================

-- Index pour les requêtes utilisateur + type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_user_type 
ON files(user_id, mime_type)
WHERE is_deleted = false;

-- Index pour les recherches textuelles dans les noms de fichiers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_filename_search 
ON files USING gin(to_tsvector('french', filename))
WHERE is_deleted = false;

-- Index pour les requêtes par taille
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_size_user 
ON files(user_id, size DESC)
WHERE is_deleted = false;

-- Index pour les requêtes par date de création
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_created_user 
ON files(user_id, created_at DESC)
WHERE is_deleted = false;

-- ==============================================
-- INDEX POUR LES UTILISATEURS
-- ==============================================

-- Index pour les requêtes par email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users(email);

-- Index pour les requêtes par nom complet
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_full_name_search 
ON users USING gin(to_tsvector('french', full_name))
WHERE full_name IS NOT NULL;

-- ==============================================
-- INDEX POUR LES SESSIONS
-- ==============================================

-- Index pour les requêtes par utilisateur et date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_created 
ON sessions(user_id, created_at DESC);

-- Index pour les requêtes par statut
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_status_created 
ON sessions(status, created_at DESC);

-- ==============================================
-- INDEX POUR LES MESSAGES
-- ==============================================

-- Index pour les requêtes par session et date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_session_created 
ON messages(session_id, created_at ASC);

-- Index pour les requêtes par type de message
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_type_session 
ON messages(message_type, session_id, created_at ASC);

-- ==============================================
-- STATISTIQUES ET ANALYSE
-- ==============================================

-- Mettre à jour les statistiques de la base de données
ANALYZE articles;
ANALYZE classeurs;
ANALYZE folders;
ANALYZE agents;
ANALYZE files;
ANALYZE users;
ANALYZE sessions;
ANALYZE messages;

-- ==============================================
-- COMMENTAIRES POUR LA DOCUMENTATION
-- ==============================================

COMMENT ON INDEX idx_articles_user_classeur_active IS 'Index optimisé pour les requêtes utilisateur + classeur sur les articles actifs';
COMMENT ON INDEX idx_articles_title_search IS 'Index de recherche textuelle sur les titres des articles';
COMMENT ON INDEX idx_articles_content_search IS 'Index de recherche textuelle sur le contenu des articles';
COMMENT ON INDEX idx_classeurs_user_position IS 'Index pour les requêtes utilisateur avec tri par position';
COMMENT ON INDEX idx_folders_user_classeur IS 'Index composite pour les requêtes utilisateur + classeur sur les dossiers';
COMMENT ON INDEX idx_agents_slug_active IS 'Index pour les agents actifs par slug (utilisé par les tool calls)';

-- ==============================================
-- VUES MATÉRIALISÉES POUR LES PERFORMANCES
-- ==============================================

-- Vue matérialisée pour les statistiques des classeurs
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_classeur_statistics AS
SELECT 
    c.id,
    c.user_id,
    c.name,
    COUNT(DISTINCT f.id) as total_folders,
    COUNT(DISTINCT a.id) as total_notes,
    COALESCE(SUM(LENGTH(a.markdown_content)), 0) as total_content_size,
    MAX(a.updated_at) as last_updated
FROM classeurs c
LEFT JOIN folders f ON c.id = f.classeur_id AND f.is_deleted = false
LEFT JOIN articles a ON c.id = a.classeur_id AND a.is_deleted = false
WHERE c.is_deleted = false
GROUP BY c.id, c.user_id, c.name;

-- Index sur la vue matérialisée
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_classeur_statistics_id 
ON mv_classeur_statistics(id);

-- Vue matérialisée pour les statistiques des dossiers
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_folder_statistics AS
SELECT 
    f.id,
    f.user_id,
    f.classeur_id,
    f.name,
    COUNT(DISTINCT sf.id) as total_subfolders,
    COUNT(DISTINCT a.id) as total_notes,
    COALESCE(SUM(LENGTH(a.markdown_content)), 0) as total_content_size,
    MAX(a.updated_at) as last_updated
FROM folders f
LEFT JOIN folders sf ON f.id = sf.parent_folder_id AND sf.is_deleted = false
LEFT JOIN articles a ON f.id = a.folder_id AND a.is_deleted = false
WHERE f.is_deleted = false
GROUP BY f.id, f.user_id, f.classeur_id, f.name;

-- Index sur la vue matérialisée
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_folder_statistics_id 
ON mv_folder_statistics(id);

-- ==============================================
-- FONCTIONS POUR LA MAINTENANCE
-- ==============================================

-- Fonction pour rafraîchir les vues matérialisées
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_classeur_statistics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_folder_statistics;
    
    -- Mettre à jour les statistiques
    ANALYZE mv_classeur_statistics;
    ANALYZE mv_folder_statistics;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les index inutilisés
CREATE OR REPLACE FUNCTION cleanup_unused_indexes()
RETURNS void AS $$
DECLARE
    index_record RECORD;
BEGIN
    -- Trouver les index inutilisés (simplifié)
    FOR index_record IN
        SELECT schemaname, indexname
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND indexname LIKE 'idx_%'
    LOOP
        RAISE NOTICE 'Index inutilisé détecté: %.%', index_record.schemaname, index_record.indexname;
        -- Ne pas supprimer automatiquement, juste logger
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- TRIGGERS POUR LA MAINTENANCE AUTOMATIQUE
-- ==============================================

-- Trigger pour rafraîchir les vues matérialisées lors des modifications
CREATE OR REPLACE FUNCTION trigger_refresh_mv_classeur_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Rafraîchir la vue matérialisée de manière asynchrone
    PERFORM pg_notify('refresh_mv_classeur_statistics', '');
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur les tables concernées
DROP TRIGGER IF EXISTS trg_refresh_mv_classeur_statistics_articles ON articles;
CREATE TRIGGER trg_refresh_mv_classeur_statistics_articles
    AFTER INSERT OR UPDATE OR DELETE ON articles
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_mv_classeur_statistics();

DROP TRIGGER IF EXISTS trg_refresh_mv_classeur_statistics_folders ON folders;
CREATE TRIGGER trg_refresh_mv_classeur_statistics_folders
    AFTER INSERT OR UPDATE OR DELETE ON folders
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_mv_classeur_statistics();

-- ==============================================
-- CONFIGURATION POSTGRESQL POUR LES PERFORMANCES
-- ==============================================

-- Configuration recommandée pour les performances
-- (À appliquer dans postgresql.conf ou via ALTER SYSTEM)

-- Augmenter la mémoire partagée pour les buffers
-- shared_buffers = 256MB (ou 25% de la RAM disponible)

-- Optimiser le work_mem pour les requêtes complexes
-- work_mem = 4MB

-- Augmenter le maintenance_work_mem pour les index
-- maintenance_work_mem = 64MB

-- Optimiser les paramètres de recherche textuelle
-- default_text_search_config = 'french'

-- Activer la parallélisation des requêtes
-- max_parallel_workers_per_gather = 2
-- max_parallel_workers = 8

-- ==============================================
-- MONITORING ET ALERTES
-- ==============================================

-- Vue pour surveiller les performances des index
CREATE OR REPLACE VIEW v_index_performance AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    CASE 
        WHEN idx_scan = 0 THEN 'INUTILISÉ'
        WHEN idx_scan < 100 THEN 'PEU UTILISÉ'
        WHEN idx_scan < 1000 THEN 'MODÉRÉMENT UTILISÉ'
        ELSE 'TRÈS UTILISÉ'
    END as usage_status
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- Vue pour surveiller les requêtes lentes
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE mean_time > 1000 -- Requêtes de plus de 1 seconde
ORDER BY mean_time DESC
LIMIT 20;

-- ==============================================
-- FIN DE LA MIGRATION
-- ==============================================

-- Log de la migration
INSERT INTO migration_log (migration_name, applied_at, description)
VALUES (
    '20241220_optimize_database_indexes',
    NOW(),
    'Optimisation des index pour les performances des tool calls - 25+ index créés'
) ON CONFLICT (migration_name) DO NOTHING;
