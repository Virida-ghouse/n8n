#!/usr/bin/env node

/**
 * Script de démarrage n8n pour Clever Cloud
 * Configure automatiquement la base de données PostgreSQL
 */

const { spawn } = require('child_process');

// Configuration de la base de données PostgreSQL depuis les variables Clever Cloud
if (process.env.POSTGRESQL_ADDON_URI) {
  console.log('🐘 Configuration PostgreSQL détectée');
  
  // Parser l'URI PostgreSQL
  const dbUrl = new URL(process.env.POSTGRESQL_ADDON_URI);
  
  process.env.DB_TYPE = 'postgresdb';
  process.env.DB_POSTGRESDB_HOST = dbUrl.hostname;
  process.env.DB_POSTGRESDB_PORT = dbUrl.port || '5432';
  process.env.DB_POSTGRESDB_DATABASE = dbUrl.pathname.substring(1);
  process.env.DB_POSTGRESDB_USER = dbUrl.username;
  process.env.DB_POSTGRESDB_PASSWORD = dbUrl.password;
  
  console.log(`📊 Base de données: ${dbUrl.hostname}:${dbUrl.port}/${dbUrl.pathname.substring(1)}`);
} else {
  console.log('⚠️ Aucune base de données PostgreSQL configurée');
}

// Configuration du port
process.env.N8N_PORT = process.env.PORT || '8080';
process.env.N8N_HOST = '0.0.0.0';

console.log('🚀 Démarrage de n8n...');
console.log(`🌐 Port: ${process.env.N8N_PORT}`);
console.log(`🔗 Host: ${process.env.N8N_HOST}`);

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
