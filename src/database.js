// --- BASE DE DATOS DEL MUNDO ---

export const TOWERS = [
    { id: 0, name: "Torre del Fuego", r: 2, c: 3, boss: "Ignis", hp: 160, atk: 18, cleared: false, color: "#e67e22", monsters: ["Fuego Fatuo", "Golem de Lava"] },
    { id: 1, name: "Torre de la Escarcha", r: 2, c: 11, boss: "Kryos", hp: 170, atk: 16, cleared: false, color: "#3498db", monsters: ["Espectro Invernal", "Wendigo"] },
    { id: 2, name: "Torre de la Sombra", r: 12, c: 7, boss: "Malakar", hp: 190, atk: 20, cleared: false, color: "#9b59b6", monsters: ["Sombra Alada", "Pesadilla"] }
    // Puedes rellenar las 7 torres siguiendo este mismo patrón de coordenadas
];

// --- MOTOR DE MODIFICADORES DE ESTADO ---
export const STATUS_EFFECTS = {
    BURNING: {
        id: "BURNING",
        name: "🔥 Quemadura",
        isDebuff: true,
        onTurnStart: (entity, logFn) => {
            let dmg = Math.floor(entity.maxHp * 0.08); // Quita un 8% de vida máxima por turno
            entity.hp = Math.max(0, entity.hp - dmg);
            logFn(`🔥 El fuego consume a ${entity.name || 'el objetivo'} por ${dmg} de daño continuo.`, "enemy");
        }
    },
    POISONED: {
        id: "POISONED",
        name: "🤢 Envenenado",
        isDebuff: true,
        onTurnStart: (entity, logFn) => {
            let dmg = 8; // Daño fijo insidioso
            entity.hp = Math.max(0, entity.hp - dmg);
            logFn(`🤢 El veneno fluye en las venas de ${entity.name || 'el objetivo'}. Sufre ${dmg} de daño.`, "enemy");
        }
    },
    SHIELDED: {
        id: "SHIELDED",
        name: "🛡️ Escudo",
        isDebuff: false,
        modifyIncomingDamage: (damage) => {
            return Math.floor(damage * 0.5); // Mitiga un 50% de TODO el daño recibido
        }
    }
};