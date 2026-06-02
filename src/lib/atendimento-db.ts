import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

let dbInstance: any = null;

export async function getDB(): Promise<any> {
    if (dbInstance) return dbInstance;
    
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const dbPath = path.join(dataDir, 'atendimento.sqlite');
    
    const db = new DatabaseSync(dbPath);

    db.exec(`
        CREATE TABLE IF NOT EXISTS Contacts (
            id TEXT PRIMARY KEY,
            name TEXT,
            phone TEXT,
            email TEXT,
            city TEXT,
            tags TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Conversations (
            id TEXT PRIMARY KEY,
            contactId TEXT,
            channel TEXT,
            status TEXT,
            assignedUserId TEXT,
            assignedAgentId TEXT,
            aiEnabled BOOLEAN DEFAULT 1,
            queue TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Messages (
            id TEXT PRIMARY KEY,
            conversationId TEXT,
            direction TEXT, -- 'incoming', 'outgoing', 'internal_note'
            content TEXT,
            metadata TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS AgentSessions (
            id TEXT PRIMARY KEY,
            name TEXT,
            systemPrompt TEXT,
            provider TEXT,
            model TEXT,
            tools TEXT,
            isDefault BOOLEAN DEFAULT 0,
            active BOOLEAN DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS Rules (
            id TEXT PRIMARY KEY,
            mode TEXT, -- always_on, keyword_trigger, keyword_pause, schedule, human_takeover
            priority INTEGER,
            action TEXT, -- respond, drop, handoff, static_reply
            triggerKeyword TEXT,
            content TEXT,
            active BOOLEAN DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS Logs (
            id TEXT PRIMARY KEY,
            conversationId TEXT,
            event TEXT,
            details TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Create a simple async wrapper around synchronous calls
    // so our existing code works unaffected.
    dbInstance = {
        get: async (sql: string, params: any[] = []) => {
            return db.prepare(sql).get(...params);
        },
        all: async (sql: string, params: any[] = []) => {
            return db.prepare(sql).all(...params);
        },
        run: async (sql: string, params: any[] = []) => {
            return db.prepare(sql).run(...params);
        },
        exec: async (sql: string) => {
            return db.exec(sql);
        }
    };

    // Add default receptionist agent if table is empty
    const agentCount = await dbInstance.get('SELECT COUNT(*) as count FROM AgentSessions');
    if (agentCount.count === 0) {
        await dbInstance.run(`
            INSERT INTO AgentSessions (id, name, systemPrompt, provider, model, isDefault, active) 
            VALUES (
                'agent-1', 
                'Recepcionista Padrão', 
                'Você é um assistente de imobiliária amigável. Identifique a intenção do cliente, responda dúvidas simples e encaminhe para o setor correto (Corretores, Financeiro, Administrativo).',
                'google',
                'gemini-2.5-flash',
                1,
                1
            )
        `);
    }

    return dbInstance;
}
