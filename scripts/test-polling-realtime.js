require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simulation du service de polling
class PollingSimulator {
  constructor(userId) {
    this.userId = userId;
    this.lastTimestamps = new Map();
    this.lastCounts = new Map();
    this.isRunning = false;
  }

  async startPolling(table, interval = 2000) {
    if (this.isRunning) {
      console.log(`[Simulator] ⚠️ Polling déjà actif pour ${table}`);
      return;
    }

    console.log(`[Simulator] 🔄 Démarrage polling pour ${table} (${interval}ms)`);
    this.isRunning = true;

    const poll = async () => {
      if (!this.isRunning) return;

      try {
        await this.checkForChanges(table);
      } catch (error) {
        console.error(`[Simulator] ❌ Erreur polling ${table}:`, error);
      }

      // Continuer le polling
      setTimeout(poll, interval);
    };

    // Démarrer le premier polling
    poll();
  }

  stopPolling() {
    console.log(`[Simulator] ⏹️ Arrêt du polling`);
    this.isRunning = false;
  }

  async checkForChanges(table) {
    console.log(`[Simulator] 🔍 Vérification changements pour ${table}...`);
    
    // Vérifier les UPDATE
    await this.checkForUpdates(table);
    
    // Vérifier les INSERT/DELETE
    await this.checkForStructureChanges(table);
  }

  async checkForUpdates(table) {
    const lastTimestamp = this.lastTimestamps.get(table);
    
    console.log(`[Simulator] 📊 Vérification UPDATE pour ${table} (lastTimestamp: ${lastTimestamp || 'aucun'})`);

    let query = supabase.from(table).select('*').eq('user_id', this.userId).order('updated_at', { ascending: false }).limit(10);
    
    if (lastTimestamp) {
      query = query.gt('updated_at', lastTimestamp);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`[Simulator] ❌ Erreur polling UPDATE ${table}:`, error);
      return;
    }

    console.log(`[Simulator] 📊 Résultats UPDATE ${table}: ${data?.length || 0} éléments`);

    if (data && data.length > 0) {
      // Mettre à jour le timestamp avec le plus récent
      const latestTimestamp = data.reduce((max, item) => 
        item.updated_at > max ? item.updated_at : max, 
        this.lastTimestamps.get(table) || ''
      );
      this.lastTimestamps.set(table, latestTimestamp);

      console.log(`[Simulator] ✅ ${data.length} UPDATE(s) détecté(s) pour ${table}`);

      // Simuler les notifications
      data.forEach(item => {
        console.log(`[Simulator] 📡 Notification UPDATE pour ${table}:`, {
          id: item.id,
          title: item.source_title || item.name,
          updated_at: item.updated_at
        });
      });
    } else {
      console.log(`[Simulator] ⏭️ Aucun UPDATE détecté pour ${table}`);
    }
  }

  async checkForStructureChanges(table) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId);

    if (error) {
      console.error(`[Simulator] ❌ Erreur polling structure ${table}:`, error);
      return;
    }

    const currentCount = count || 0;
    const lastCount = this.lastCounts.get(table);

    if (lastCount !== undefined && lastCount !== currentCount) {
      if (currentCount > lastCount) {
        console.log(`[Simulator] ➕ INSERT détecté pour ${table}: ${currentCount - lastCount} élément(s)`);
      } else if (currentCount < lastCount) {
        console.log(`[Simulator] ➖ DELETE détecté pour ${table}: ${lastCount - currentCount} élément(s)`);
      }
      this.lastCounts.set(table, currentCount);
    } else if (lastCount === undefined) {
      console.log(`[Simulator] 📊 Initialisation compteur pour ${table}: ${currentCount}`);
      this.lastCounts.set(table, currentCount);
    }
  }
}

async function testRealtimePolling() {
  try {
    console.log('🧪 Test du polling en temps réel...');
    
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const simulator = new PollingSimulator(USER_ID);
    
    // Démarrer le polling pour les articles
    await simulator.startPolling('articles', 3000);
    
    // Démarrer le polling pour les dossiers
    await simulator.startPolling('folders', 5000);
    
    console.log('\n🔄 Polling en cours... (Ctrl+C pour arrêter)');
    
    // Arrêter après 30 secondes
    setTimeout(() => {
      console.log('\n⏹️ Arrêt du polling...');
      simulator.stopPolling();
      process.exit(0);
    }, 30000);
    
  } catch (error) {
    console.error('❌ Erreur lors du test de polling realtime:', error);
  }
}

testRealtimePolling(); 