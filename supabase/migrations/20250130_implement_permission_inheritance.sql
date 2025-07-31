-- Implémentation du système d'héritage des permissions
-- Permissions héritées > Permissions spécifiques

-- 1. Fonction pour récupérer les permissions d'un dossier
CREATE OR REPLACE FUNCTION get_folder_permissions(folder_uuid UUID)
RETURNS TABLE(role TEXT, user_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT fp.role, fp.user_id
  FROM folder_permissions fp
  WHERE fp.folder_id = folder_uuid;
END;
$$ LANGUAGE plpgsql;

-- 2. Fonction pour récupérer les permissions d'un classeur
CREATE OR REPLACE FUNCTION get_classeur_permissions(classeur_uuid UUID)
RETURNS TABLE(role TEXT, user_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT cp.role, cp.user_id
  FROM classeur_permissions cp
  WHERE cp.classeur_id = classeur_uuid;
END;
$$ LANGUAGE plpgsql;

-- 3. Fonction pour gérer l'héritage des permissions lors du déplacement
CREATE OR REPLACE FUNCTION handle_permission_inheritance()
RETURNS TRIGGER AS $$
DECLARE
  target_folder_id UUID;
  target_classeur_id UUID;
  inherited_permissions RECORD;
BEGIN
  -- Si la note a été déplacée vers un dossier
  IF NEW.folder_id IS NOT NULL THEN
    target_folder_id := NEW.folder_id;
    
    -- Supprimer les permissions spécifiques de la note
    DELETE FROM article_permissions WHERE article_id = NEW.id;
    
    -- Hériter des permissions du dossier
    FOR inherited_permissions IN 
      SELECT role, user_id FROM get_folder_permissions(target_folder_id)
    LOOP
      INSERT INTO article_permissions (article_id, user_id, role, granted_by)
      VALUES (NEW.id, inherited_permissions.user_id, inherited_permissions.role, NEW.user_id);
    END LOOP;
    
    -- Si le dossier n'a pas de permissions, hériter du classeur
    IF NOT EXISTS (SELECT 1 FROM folder_permissions WHERE folder_id = target_folder_id) THEN
      target_classeur_id := (SELECT classeur_id FROM folders WHERE id = target_folder_id);
      
      FOR inherited_permissions IN 
        SELECT role, user_id FROM get_classeur_permissions(target_classeur_id)
      LOOP
        INSERT INTO article_permissions (article_id, user_id, role, granted_by)
        VALUES (NEW.id, inherited_permissions.user_id, inherited_permissions.role, NEW.user_id);
      END LOOP;
    END IF;
    
  -- Si la note a été déplacée directement vers un classeur (sans dossier)
  ELSIF NEW.classeur_id IS NOT NULL AND NEW.folder_id IS NULL THEN
    target_classeur_id := NEW.classeur_id;
    
    -- Supprimer les permissions spécifiques de la note
    DELETE FROM article_permissions WHERE article_id = NEW.id;
    
    -- Hériter des permissions du classeur
    FOR inherited_permissions IN 
      SELECT role, user_id FROM get_classeur_permissions(target_classeur_id)
    LOOP
      INSERT INTO article_permissions (article_id, user_id, role, granted_by)
      VALUES (NEW.id, inherited_permissions.user_id, inherited_permissions.role, NEW.user_id);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger pour détecter le déplacement de notes
CREATE TRIGGER detect_note_movement
  AFTER UPDATE OF folder_id, classeur_id ON articles
  FOR EACH ROW
  WHEN (OLD.folder_id IS DISTINCT FROM NEW.folder_id OR OLD.classeur_id IS DISTINCT FROM NEW.classeur_id)
  EXECUTE FUNCTION handle_permission_inheritance();

-- 5. Fonction pour gérer l'héritage lors de la création de permissions
CREATE OR REPLACE FUNCTION propagate_permissions_downward()
RETURNS TRIGGER AS $$
DECLARE
  child_item RECORD;
BEGIN
  -- Si c'est une permission de classeur, propager vers les dossiers et articles
  IF TG_TABLE_NAME = 'classeur_permissions' THEN
    -- Vers les dossiers du classeur
    FOR child_item IN 
      SELECT id FROM folders WHERE classeur_id = NEW.classeur_id
    LOOP
      INSERT INTO folder_permissions (folder_id, user_id, role, granted_by)
      VALUES (child_item.id, NEW.user_id, NEW.role, NEW.granted_by)
      ON CONFLICT (folder_id, user_id) DO UPDATE 
      SET role = NEW.role, granted_by = NEW.granted_by;
    END LOOP;
    
    -- Vers les articles directs du classeur (sans dossier)
    FOR child_item IN 
      SELECT id FROM articles WHERE classeur_id = NEW.classeur_id AND folder_id IS NULL
    LOOP
      INSERT INTO article_permissions (article_id, user_id, role, granted_by)
      VALUES (child_item.id, NEW.user_id, NEW.role, NEW.granted_by)
      ON CONFLICT (article_id, user_id) DO UPDATE 
      SET role = NEW.role, granted_by = NEW.granted_by;
    END LOOP;
    
  -- Si c'est une permission de dossier, propager vers les articles
  ELSIF TG_TABLE_NAME = 'folder_permissions' THEN
    FOR child_item IN 
      SELECT id FROM articles WHERE folder_id = NEW.folder_id
    LOOP
      INSERT INTO article_permissions (article_id, user_id, role, granted_by)
      VALUES (child_item.id, NEW.user_id, NEW.role, NEW.granted_by)
      ON CONFLICT (article_id, user_id) DO UPDATE 
      SET role = NEW.role, granted_by = NEW.granted_by;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Triggers pour la propagation automatique
CREATE TRIGGER propagate_classeur_permissions
  AFTER INSERT OR UPDATE ON classeur_permissions
  FOR EACH ROW
  EXECUTE FUNCTION propagate_permissions_downward();

CREATE TRIGGER propagate_folder_permissions
  AFTER INSERT OR UPDATE ON folder_permissions
  FOR EACH ROW
  EXECUTE FUNCTION propagate_permissions_downward();

-- 7. Commentaires pour documentation
COMMENT ON FUNCTION handle_permission_inheritance() IS 'Gère l''héritage automatique des permissions lors du déplacement de notes';
COMMENT ON FUNCTION propagate_permissions_downward() IS 'Propage les permissions vers les éléments enfants de la hiérarchie';
COMMENT ON FUNCTION get_folder_permissions(UUID) IS 'Récupère les permissions d''un dossier';
COMMENT ON FUNCTION get_classeur_permissions(UUID) IS 'Récupère les permissions d''un classeur'; 