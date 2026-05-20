// src/player.js
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
        
        // SISTEMA DE PROGRESIÓN Y ECONOMÍA
        this.level = 1;
        this.exp = 0;
        this.nextLevelExp = 60;
        this.gold = config.gold || 0;
        this.weapon = null;
        this.armor = null;
        
        this.statuses = []; 
        this.temporaryDef = 0;
    }

    applyStatus(statusId, duration) {
        let existing = this.statuses.find(s => s.id === statusId);
        if (existing) {
            existing.duration = Math.max(existing.duration, duration);
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
                if (logFn) logFn(`El estado [${effectLogic.name}] de ${this.name} ha expirado.`, "system");
                this.statuses.splice(i, 1);
            }
        }
    }

    calculateDefendedDamage(rawDamage) {
        let armorBonus = this.armor ? this.armor.value : 0;
        let finalDamage = rawDamage - (this.baseDef + armorBonus + this.temporaryDef);
        
        this.statuses.forEach(s => {
            let effectLogic = STATUS_EFFECTS[s.id];
            if (effectLogic && effectLogic.modifyIncomingDamage) {
                finalDamage = effectLogic.modifyIncomingDamage(finalDamage);
            }
        });
        
        return Math.max(1, finalDamage);
    }
}
