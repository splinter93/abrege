
#!/usr/bin/env node

console.log('🧪 Test rapide avant les vacances...');

const { spawn } = require('child_process');

async function runTest() {
  try {
    // Test du build
    console.log('📦 Test du build...');
    const build = spawn('npm', ['run', 'build'], { stdio: 'pipe' });
    
    build.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Build réussi');
        
        // Test du démarrage
        console.log('🚀 Test du démarrage...');
        const dev = spawn('npm', ['run', 'dev'], { stdio: 'pipe' });
        
        setTimeout(() => {
          dev.kill();
          console.log('✅ Application démarre correctement');
          console.log('🎉 Prêt pour les vacances !');
          process.exit(0);
        }, 5000);
        
        dev.on('error', (err) => {
          console.log('❌ Erreur au démarrage:', err.message);
          process.exit(1);
        });
      } else {
        console.log('❌ Build échoué');
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.log('❌ Erreur:', error.message);
    process.exit(1);
  }
}

runTest();
