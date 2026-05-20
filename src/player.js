import { STATUS_EFFECTS } from './database.js';

export class Character {
    constructor(config) {
        this.heroClass = config.heroClass || "Monstruo";
        this.name = config.name || config.heroClass;
        this.maxHp = config.maxHp;
        this.hp = config.maxHp;
        this.maxMp = config.maxMp;
        this.mp = config.maxMp;
        this.baseAtk = config.baseAtk;
        this.baseDef = config.baseDef;
        this.level = 1;
        this.statuses = []; // Formato: { id: "BURNING", duration: 3 }
    }

    applyStatus(statusId, duration) {
        let existing = this.statuses.find(s => s.id === statusId);
        if (existing) {
            existing.duration = Math.max(existing.duration, duration); // Refrescar duración
        } else {
            this.statuses.push({ id: statusId, duration: duration });
        }
    }

    processTurnStartEffects(logFn) {
        for (let i = this.statuses.length - 1; i >= 0; i--) {
            let current = this.statuses[i];
            let effectLogic = STATUS_EFFECTS[current.id];
            
            if (effectLogic && effectLogic.onTurnStart) {
                effectLogic.onTurnStart(this, logFn);
            }
            
            current.duration--;
            if (current.duration <= 0) {
                logMessageSystem(`El estado [${effectLogic.name}] de ${this.name} ha expirado.`, logFn);
                this.statuses.splice(i, 1);
            }
        }
    }

    calculateDefendedDamage(rawDamage) {
        let finalDamage = rawDamage - this.baseDef;
        
        // Comprobar si hay modificadores activos que alteren el daño entrante
        this.statuses.forEach(s => {
            let effectLogic = STATUS_EFFECTS[s.id];
            if (effectLogic && effectLogic.modifyIncomingDamage) {
                finalDamage = effectLogic.modifyIncomingDamage(finalDamage);
            }
        });
        
        return Math.max(1, finalDamage);
    }
}

function logMessageSystem(txt, logFn) {
    if (logFn) logFn(txt, "system");
}