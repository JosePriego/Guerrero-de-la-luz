// src/database.js

export const TOWERS = [
    { id: 0, name: "Torre del Fuego", r: 2, c: 3, boss: "Ignis el Calcinador", hp: 160, atk: 18, cleared: false, color: "#e67e22", monsters: ["Fuego Fatuo", "Salamandra de Ceniza", "Golem de Lava"] },
    { id: 1, name: "Torre de la Escarcha", r: 2, c: 11, boss: "Kryos el Gélido", hp: 170, atk: 16, cleared: false, color: "#3498db", monsters: ["Duende del Hielo", "Espectro Invernal", "Wendigo Blanco"] },
    { id: 2, name: "Torre de la Tormenta", r: 6, c: 2, boss: "Voltios el Eléctrico", hp: 150, atk: 22, cleared: false, color: "#f1c40f", monsters: ["Chispa Errante", "Nube Corrupta", "Elemental de Rayo"] },
    { id: 3, name: "Torre de la Plaga", r: 6, c: 12, boss: "Noxus el Putrefacto", hp: 190, atk: 15, cleared: false, color: "#2ecc71", monsters: ["Rata de Peste", "Zombi Purulento", "Caminante Tóxico"] },
    { id: 4, name: "Torre de la Tierra", r: 11, c: 3, boss: "Terrax el Rompemuros", hp: 220, atk: 14, cleared: false, color: "#a0522d", monsters: ["Escarabajo de Roca", "Gárgola del Subsuelo", "Gargantúa de Piedra"] },
    { id: 5, name: "Torre de la Sombra", r: 11, c: 11, boss: "Malakar el Oscuro", hp: 180, atk: 20, cleared: false, color: "#9b59b6", monsters: ["Sombra Alada", "Acechador del Abismo", "Pesadilla Viviente"] },
    { id: 6, name: "Torre del Caos", r: 13, c: 7, boss: "Xenon el Inestable", hp: 200, atk: 19, cleared: false, color: "#e74c3c", monsters: ["Parásito Dimensional", "Aberración Mutante", "Engendro Distorsionado"] }
];

// --- MOTOR DE MODIFICADORES DE ESTADO (Mantenlo igual abajo) ---
export const STATUS_EFFECTS = {
    BURNING: {
        id: "BURNING",
        name: "🔥 Quemadura",
        isDebuff: true,
        onTurnStart: (entity, logFn) => {
            let dmg = Math.floor(entity.maxHp * 0.08);
            entity.hp = Math.max(0, entity.hp - dmg);
            logFn(`🔥 El fuego consume a ${entity.name || 'el objetivo'} por ${dmg} de daño continuo.`, "enemy");
        }
    },
    POISONED: {
        id: "POISONED",
        name: "🤢 Envenenado",
        isDebuff: true,
        onTurnStart: (entity, logFn) => {
            let dmg = 8;
            entity.hp = Math.max(0, entity.hp - dmg);
            logFn(`🤢 El veneno fluye en las venas de ${entity.name || 'el objetivo'}. Sufre ${dmg} de daño.`, "enemy");
        }
    },
    SHIELDED: {
        id: "SHIELDED",
        name: "🛡️ Escudo",
        isDebuff: false,
        modifyIncomingDamage: (damage) => {
            return Math.floor(damage * 0.5);
        }
    }
};
