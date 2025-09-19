#!/usr/bin/env node

/**
 * Script de démarrage n8n pour Clever Cloud
 * Configure automatiquement la base de données PostgreSQL
 */

const { spawn } = require('child_process');

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

// Attendre un peu avant de démarrer
setTimeout(() => {
  console.log('⏰ Démarrage de n8n dans 2 secondes...');
  
  // Démarrer n8n
  const n8nProcess = spawn('npx', ['n8n'], {
    stdio: 'inherit',
    env: process.env
  });

  n8nProcess.on('error', (error) => {
    console.error('❌ Erreur lors du démarrage de n8n:', error);
    process.exit(1);
  });

  n8nProcess.on('exit', (code) => {
    console.log(`🏁 n8n s'est arrêté avec le code: ${code}`);
    process.exit(code);
  });

  // Gestion des signaux
  process.on('SIGTERM', () => {
    console.log('📴 Arrêt de n8n...');
    n8nProcess.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('📴 Arrêt de n8n...');
    n8nProcess.kill('SIGINT');
  });
}, 2000);
