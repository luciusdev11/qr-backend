/**
 * Database Abstraction Layer
 * Easy migration from MongoDB to other databases
 * 
 * Supported databases:
 * - MongoDB (current)
 * - PostgreSQL (planned)
 * - MySQL (planned)
 * - Supabase (planned)
 * - PlanetScale (planned)
 */

const dbConfig = {
    type: process.env.DB_TYPE || 'mongodb', // mongodb, postgres, mysql, supabase
    uri: process.env.MONGODB_URI || process.env.DATABASE_URL,
  };
  
  class DatabaseAdapter {
    constructor() {
      this.type = dbConfig.type;
      this.connection = null;
    }
  
    /**
     * Initialize database connection
     */
    async connect() {
      switch (this.type) {
        case 'mongodb':
          return await this.connectMongoDB();
        case 'postgres':
          return await this.connectPostgreSQL();
        case 'mysql':
          return await this.connectMySQL();
        case 'supabase':
          return await this.connectSupabase();
        default:
          throw new Error(`Unsupported database type: ${this.type}`);
      }
    }
  
    /**
     * MongoDB Connection
     */
    async connectMongoDB() {
      const mongoose = require('mongoose');
      
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };
  
      try {
        const conn = await mongoose.connect(dbConfig.uri, options);
        this.connection = conn;
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return conn;
      } catch (error) {
        console.error(`❌ MongoDB Error: ${error.message}`);
        throw error;
      }
    }
  
    /**
     * PostgreSQL Connection (Future)
     */
    async connectPostgreSQL() {
      // TODO: Implement PostgreSQL connection
      // const { Pool } = require('pg');
      console.log('🚧 PostgreSQL support coming soon');
      throw new Error('PostgreSQL not yet implemented');
    }
  
    /**
     * MySQL Connection (Future)
     */
    async connectMySQL() {
      // TODO: Implement MySQL connection
      // const mysql = require('mysql2/promise');
      console.log('🚧 MySQL support coming soon');
      throw new Error('MySQL not yet implemented');
    }
  
    /**
     * Supabase Connection (Future)
     */
    async connectSupabase() {
      // TODO: Implement Supabase connection
      // const { createClient } = require('@supabase/supabase-js');
      console.log('🚧 Supabase support coming soon');
      throw new Error('Supabase not yet implemented');
    }
  
    /**
     * Generic query method (database-agnostic)
     */
    async query(operation, model, data) {
      switch (this.type) {
        case 'mongodb':
          return await this.mongoDBQuery(operation, model, data);
        default:
          throw new Error(`Query not supported for ${this.type}`);
      }
    }
  
    /**
     * MongoDB Query Handler
     */
    async mongoDBQuery(operation, model, data) {
      const Model = require(`../models/${model}`);
      
      switch (operation) {
        case 'find':
          return await Model.find(data.filter || {})
            .sort(data.sort || {})
            .limit(data.limit || 100)
            .skip(data.skip || 0);
        
        case 'findOne':
          return await Model.findOne(data.filter || {});
        
        case 'create':
          return await Model.create(data.document);
        
        case 'update':
          return await Model.updateOne(data.filter, data.update);
        
        case 'delete':
          return await Model.deleteOne(data.filter);
        
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    }
  
    /**
     * Get database info
     */
    getInfo() {
      return {
        type: this.type,
        connected: !!this.connection,
        uri: dbConfig.uri ? '***' + dbConfig.uri.slice(-10) : 'not set'
      };
    }
  }
  
  // Singleton instance
  const dbAdapter = new DatabaseAdapter();
  
  module.exports = dbAdapter;