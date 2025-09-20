#!/usr/bin/env node

/**
 * Script de démarrage n8n pour Clever Cloud avec fallback
 * Configure automatiquement la base de données PostgreSQL
 * Démarre un serveur de fallback pendant que n8n se lance
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

console.log('🔧 Variables d\'environnement détectées:');
console.log(`PORT: ${process.env.PORT}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`POSTGRESQL_ADDON_URI: ${process.env.POSTGRESQL_ADDON_URI ? 'Configuré' : 'Non configuré'}`);

// Configuration de la base de données PostgreSQL depuis les variables Clever Cloud
if (process.env.POSTGRESQL_ADDON_URI) {
  console.log('🐘 Configuration PostgreSQL détectée');
  
  try {
    // Parser l'URI PostgreSQL
    const dbUrl = new URL(process.env.POSTGRESQL_ADDON_URI);
    
    process.env.DB_TYPE = 'postgresdb';
    process.env.DB_POSTGRESDB_HOST = dbUrl.hostname;
    process.env.DB_POSTGRESDB_PORT = dbUrl.port || '5432';
    process.env.DB_POSTGRESDB_DATABASE = dbUrl.pathname.substring(1);
    process.env.DB_POSTGRESDB_USER = dbUrl.username;
    process.env.DB_POSTGRESDB_PASSWORD = dbUrl.password;
    
    console.log(`📊 Base de données: ${dbUrl.hostname}:${dbUrl.port}/${dbUrl.pathname.substring(1)}`);
  } catch (error) {
    console.error('❌ Erreur parsing URI PostgreSQL:', error);
    process.exit(1);
  }
} else {
  console.log('⚠️ Aucune base de données PostgreSQL configurée');
}

// Configuration n8n
process.env.N8N_PORT = process.env.PORT || '8080';
process.env.N8N_HOST = '0.0.0.0';
process.env.N8N_PROTOCOL = 'https';
process.env.N8N_EDITOR_BASE_URL = 'https://app-5c3113e8-1093-4eab-9fa1-cc5d355e9ee3.cleverapps.io/';
process.env.WEBHOOK_URL = 'https://app-5c3113e8-1093-4eab-9fa1-cc5d355e9ee3.cleverapps.io/';

// Désactiver la télémétrie
process.env.N8N_DIAGNOSTICS_ENABLED = 'false';
process.env.N8N_VERSION_NOTIFICATIONS_ENABLED = 'false';
process.env.N8N_TEMPLATES_ENABLED = 'false';

console.log('🚀 Démarrage de n8n...');
console.log(`🌐 Port: ${process.env.N8N_PORT}`);
console.log(`🔗 Host: ${process.env.N8N_HOST}`);
console.log(`🔒 Protocol: ${process.env.N8N_PROTOCOL}`);

// Configuration mémoire optimisée
process.env.NODE_OPTIONS = '--max-old-space-size=1536 --no-warnings';

// Variables pour le serveur de fallback
const PORT = process.env.PORT || 8080;
let n8nReady = false;
let n8nProcess = null;

// Créer un serveur de fallback qui démarre immédiatement
const fallbackServer = http.createServer((req, res) => {
  if (n8nReady) {
    // Si n8n est prêt, rediriger vers n8n (ne devrait pas arriver avec ce setup)
    res.writeHead(302, { 'Location': `http://localhost:${PORT}` });
    res.end();
  } else {
    // Page d'attente pendant que n8n démarre
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>n8n - Démarrage en cours</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #007acc; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 20px auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .status { color: #666; margin: 20px 0; }
        </style>
        <script>
          setTimeout(() => window.location.reload(), 10000); // Recharger toutes les 10 secondes
        </script>
      </head>
      <body>
        <div class="container">
          <h1>🚀 n8n - Démarrage en cours</h1>
          <div class="spinner"></div>
          <div class="status">
            <p>n8n est en cours de démarrage...</p>
            <p>Cela peut prendre quelques minutes lors du premier démarrage.</p>
            <p>Cette page se rechargera automatiquement.</p>
          </div>
          <small>Powered by Virida IoT Platform</small>
        </div>
      </body>
      </html>
    `);
  }
});

// Démarrer le serveur de fallback immédiatement
fallbackServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Serveur de fallback démarré sur http://0.0.0.0:${PORT}`);
  console.log('⏰ Démarrage de n8n en arrière-plan...');
  
  // Démarrer n8n en arrière-plan après un court délai
  setTimeout(() => {
    console.log('🚀 Lancement de n8n avec mémoire optimisée...');
    console.log(`💾 NODE_OPTIONS: ${process.env.NODE_OPTIONS}`);
    
    // Démarrer n8n avec configuration optimisée
    n8nProcess = spawn('npx', ['n8n'], {
      stdio: ['ignore', 'pipe', 'pipe'], // Capturer les sorties
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=1536 --no-warnings'
      }
    });

    // Surveiller les logs de n8n pour détecter quand il est prêt
    n8nProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('n8n:', output.trim());
      
      // Détecter quand n8n est prêt (rechercher des patterns typiques)
      if (output.includes('Server started') || output.includes('Editor is now accessible') || output.includes('Webhook waiting')) {
        console.log('✅ n8n est maintenant prêt !');
        n8nReady = true;
        
        // Optionnel: fermer le serveur de fallback et laisser n8n prendre le relais
        // Pour l'instant, on garde le fallback actif
      }
    });

    n8nProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('n8n error:', error.trim());
    });

    n8nProcess.on('error', (error) => {
      console.error('❌ Erreur lors du démarrage de n8n:', error);
      // Ne pas quitter, garder le serveur de fallback actif
    });

    n8nProcess.on('exit', (code) => {
      console.log(`🏁 n8n s'est arrêté avec le code: ${code}`);
      n8nReady = false;
      // Ne pas quitter, garder le serveur de fallback actif
    });
  }, 3000); // Délai de 3 secondes
});

// Gestion des signaux
process.on('SIGTERM', () => {
  console.log('📴 Arrêt du serveur...');
  if (n8nProcess) {
    n8nProcess.kill('SIGTERM');
  }
  fallbackServer.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Arrêt du serveur...');
  if (n8nProcess) {
    n8nProcess.kill('SIGINT');
  }
  fallbackServer.close();
  process.exit(0);
});
