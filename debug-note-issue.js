// Script de diagnostic pour la note problématique
const NOTE_UUID = 'c724010c-8cbb-4e7b-9345-4ac9d702378c';
const USER_UUID = '3223651c-5580-4471-affb-b3f4456bd729';

console.log('🔍 Diagnostic de la note problématique...\n');

console.log('📋 Informations :');
console.log(`- Note UUID: ${NOTE_UUID}`);
console.log(`- Utilisateur: ${USER_UUID}`);
console.log(`- Timestamp: ${new Date().toISOString()}\n`);

console.log('🔧 Vérifications à effectuer :');
console.log('1. La note existe-t-elle encore dans la table articles ?');
console.log('2. À quel utilisateur appartient-elle ?');
console.log('3. A-t-elle été supprimée récemment ?');
console.log('4. Y a-t-il des problèmes de synchronisation ?\n');

console.log('📝 Requêtes SQL de diagnostic :');
console.log('-- Vérifier si la note existe');
console.log(`SELECT id, source_title, user_id, created_at, updated_at, deleted_at`);
console.log(`FROM articles WHERE id = '${NOTE_UUID}';\n`);

console.log('-- Vérifier toutes les notes de l\'utilisateur');
console.log(`SELECT id, source_title, created_at, updated_at`);
console.log(`FROM articles WHERE user_id = '${USER_UUID}'`);
console.log(`ORDER BY updated_at DESC LIMIT 10;\n`);

console.log('-- Vérifier les notes supprimées récemment');
console.log(`SELECT id, source_title, user_id, deleted_at`);
console.log(`FROM articles WHERE deleted_at IS NOT NULL`);
console.log(`AND deleted_at > NOW() - INTERVAL '1 hour'`);
console.log(`ORDER BY deleted_at DESC;\n`);

console.log('-- Vérifier les logs d\'erreur récents');
console.log(`SELECT * FROM logs WHERE message LIKE '%${NOTE_UUID}%'`);
console.log(`ORDER BY created_at DESC LIMIT 10;\n`);

console.log('🚨 Solutions possibles :');
console.log('1. Nettoyer les références à la note supprimée dans l\'interface');
console.log('2. Vérifier la synchronisation entre l\'interface et la base');
console.log('3. Implémenter une gestion d\'erreur plus robuste pour les ressources manquantes');
console.log('4. Ajouter des vérifications de cohérence dans l\'API V1');
