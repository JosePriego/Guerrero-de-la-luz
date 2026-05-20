// src/engine.js

import { TOWERS, STATUS_EFFECTS, LOOT_TABLE } from './database.js'; // Asegúrate de que LOOT_TABLE exista
import { Character } from './player.js';
import { ProceduralDungeon } from './map.js';
import { ASSETS, preloadAssets } from './assets.js';

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const TILE_RES = 24; 

let currentGrid = [];
let mapSize = 15;
let overworldPos = { r: 7, c: 7 };
let dungeonPos = { r: 1, c: 1 };

let hero = null;
let currentEnemy = null;
let gameState = "CLASS_SELECT";
let currentFloor = 1;
let activeTowerIdx = null;
let gems = 0;
let turnInProgress = false;

// Mochila global inicial del caballero
let inventory = [
    { id: "hp_pot", name: "Poción Vida", type: "consumable", subType: "hp", value: 50, price: 12, count: 2 }
];

// Botín base copiado para seguridad del motor
const lootTable = [
    { id: "hp_pot", name: "Poción Vida", type: "consumable", subType: "hp", value: 50, price: 12 },
    { id: "mp_pot", name: "Elixir Maná", type: "consumable", subType: "mp", value: 25, price: 15 },
    { id: "steel_sword", name: "Espada Runas", type: "equip", subType: "weapon", value: 18, price: 50 },
    { id: "knight_armor", name: "Placas Sagradas", type: "equip", subType: "armor", value: 8, price: 45 }
];

document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", (e) => {
        let chosenClass = card.id.split("-")[1];
        setupHero(chosenClass);
    });
});

function setupHero(heroClass) {
    if (heroClass === "Guerrero") hero = new Character({ heroClass, maxHp: 140, maxMp: 20, baseAtk: 13, baseDef: 3, gold: 20 });
    if (heroClass === "Mago") hero = new Character({ heroClass, maxHp: 90, maxMp: 60, baseAtk: 16, baseDef: 0, gold: 30 });
    if (heroClass === "Picaro") hero = new Character({ heroClass, maxHp: 110, maxMp: 30, baseAtk: 14, baseDef: 1, gold: 55 });
    
    preloadAssets().then(() => {
        document.getElementById("class-selection").style.display = "none";
        gameState = "OVERWORLD";
        buildOverworldMatrix();
        initControls(); 
        gameLoop(); 
    }).catch(err => {
        console.error("Explosión gráfica:", err);
    });
}

function buildOverworldMatrix() {
    mapSize = 15;
    currentGrid = [];
    for (let r = 0; r < 15; r++) {
        currentGrid.push(new Array(15).fill("."));
    }
    TOWERS.forEach(t => { if (!t.cleared) currentGrid[t.r][t.c] = "T"; });
}

function gameLoop() {
    renderCanvas();
    updateUI();
    if (gameState !== "CRASHED") requestAnimationFrame(gameLoop);
}

function renderCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let activePos = gameState === "OVERWORLD" ? overworldPos : dungeonPos;

    for (let r = 0; r < mapSize; r++) {
        for (let c = 0; c < mapSize; c++) {
            let tile = currentGrid[r][c];
            let px = c * TILE_RES; let py = r * TILE_RES;
            ctx.drawImage(ASSETS.suelo, px, py, TILE_RES, TILE_RES);

            if (tile === "#") ctx.drawImage(ASSETS.muro, px, py, TILE_RES, TILE_RES);
            else if (tile === "T") {
                ctx.drawImage(ASSETS.torre, px, py, TILE_RES, TILE_RES);
                let tow = TOWERS.find(t => t.r === r && t.c === c);
                if (tow) {
                    ctx.fillStyle = tow.color; ctx.globalAlpha = 0.25; 
                    ctx.fillRect(px, py, TILE_RES, TILE_RES); ctx.globalAlpha = 1.0; 
                }
            } else if (tile === "🪜") ctx.drawImage(ASSETS.escalera, px, py, TILE_RES, TILE_RES);
        }
    }
    ctx.drawImage(ASSETS.jugador, activePos.c * TILE_RES, activePos.r * TILE_RES, TILE_RES, TILE_RES);
}

function initControls() {
    document.addEventListener("keydown", (e) => {
        if (gameState !== "OVERWORLD" && gameState !== "DUNGEON") return;
        let pos = gameState === "OVERWORLD" ? overworldPos : dungeonPos;
        let nextR = pos.r; let nextC = pos.c;

        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") nextR--;
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") nextR++;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") nextC--;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") nextC++;
        processMoveIntent(pos, nextR, nextC);
    });

    const touchControls = { "touch-up": {r:-1,c:0}, "touch-down": {r:1,c:0}, "touch-left": {r:0,c:-1}, "touch-right": {r:0,c:1} };
    Object.keys(touchControls).forEach(buttonId => {
        const btnElement = document.getElementById(buttonId);
        if (btnElement) {
            btnElement.addEventListener("touchstart", (e) => {
                e.preventDefault(); 
                if (gameState !== "OVERWORLD" && gameState !== "DUNGEON") return;
                let pos = gameState === "OVERWORLD" ? overworldPos : dungeonPos;
                let offset = touchControls[buttonId];
                processMoveIntent(pos, pos.r + offset.r, pos.c + offset.c);
            });
        }
    });
}

function processMoveIntent(pos, nextR, nextC) {
    if (nextR >= 0 && nextR < mapSize && nextC >= 0 && nextC < mapSize && currentGrid[nextR][nextC] !== "#") {
        pos.r = nextR; pos.c = nextC;
        checkStepTriggers();
    }
}

function checkStepTriggers() {
    if (gameState === "OVERWORLD") {
        let cell = currentGrid[overworldPos.r][overworldPos.c];
        if (cell === "T") {
            let t = TOWERS.find(tow => tow.r === overworldPos.r && tow.c === overworldPos.c);
            if (t && !t.cleared) { activeTowerIdx = TOWERS.indexOf(t); currentFloor = 1; enterDungeon(); }
        }
    } else {
        let cell = currentGrid[dungeonPos.r][dungeonPos.c];
        if (cell === "🪜") {
            currentFloor++;
            if (currentFloor > 15) {
                logMessage("💎 ¡NÚCLEO PURIFICADO! Reclamas la gema elemental.", "system");
                TOWERS[activeTowerIdx].cleared = true; gems++;
                gameState = "OVERWORLD"; buildOverworldMatrix();
            } else { enterDungeon(); }
        } else if (Math.random() < 0.12) { startCombat(); }
    }
}

function enterDungeon() {
    gameState = "DUNGEON"; mapSize = 12;
    let generator = new ProceduralDungeon(12);
    let build = generator.generate(); currentGrid = build.grid;
}

function startCombat() {
    gameState = "COMBAT";
    let t = TOWERS[activeTowerIdx];
    let eName = t.monsters[Math.floor(Math.random() * t.monsters.length)];
    let scale = 1 + (currentFloor - 1) * 0.15;
    
    currentEnemy = new Character({ 
        heroClass: "Monstruo", name: eName, 
        maxHp: Math.floor(40 * scale), baseAtk: Math.floor(10 * scale), baseDef: 0 
    });
    currentEnemy.expReward = Math.floor(18 * scale); // Guardar recompensa de EXP
    
    logMessage(`💥 ¡Un ${currentEnemy.name} bloquea el camino!`, "enemy");
    document.getElementById("enemy-panel").style.display = "block";
    buildCombatActions();
}

function buildCombatActions() {
    const grid = document.getElementById("action-grid"); grid.innerHTML = "";
    
    let btnAtk = document.createElement("button");
    btnAtk.innerText = "⚔️ Atacar Físico";
    btnAtk.onclick = () => executeHeroTurn("ATTACK");
    grid.appendChild(btnAtk);

    let btnSkill = document.createElement("button");
    if (hero.heroClass === "Guerrero") btnSkill.innerText = "🛡️ Baluarte";
    if (hero.heroClass === "Mago") btnSkill.innerText = "🔥 Piroclasto";
    if (hero.heroClass === "Picaro") btnSkill.innerText = "🧪 Daga Infecta";
    btnSkill.onclick = () => executeHeroTurn("SKILL");
    grid.appendChild(btnSkill);
}

function executeHeroTurn(actionType) {
    if (turnInProgress) return; turnInProgress = true;
    hero.processTurnStartEffects(logMessage);
    if (hero.hp <= 0) { triggerGameOver(); return; }

    let weaponBonus = hero.weapon ? hero.weapon.value : 0;
    if (actionType === "ATTACK") {
        let rawDmg = hero.baseAtk + weaponBonus + Math.floor(Math.random() * 4);
        let finalDmg = currentEnemy.calculateDefendedDamage(rawDmg);
        currentEnemy.hp = Math.max(0, currentEnemy.hp - finalDmg);
        logMessage(`Atacas infligiendo ${finalDmg} de daño.`, "hero");
    } 
    else if (actionType === "SKILL") {
        if (hero.heroClass === "Guerrero") { hero.applyStatus("SHIELDED", 2); logMessage(`Escudo divino activo.`, "hero"); } 
        else if (hero.heroClass === "Mago") { currentEnemy.applyStatus("BURNING", 3); logMessage(`Enemigo envuelto en llamas.`, "hero"); } 
        else if (hero.heroClass === "Picaro") { currentEnemy.applyStatus("POISONED", 4); logMessage(`Tajo venenoso asestado.`, "hero"); }
    }

    if (currentEnemy.hp <= 0) { handleVictory(); return; }
    setTimeout(enemyTurn, 700);
}

function enemyTurn() {
    if (hero.hp <= 0) return;
    currentEnemy.processTurnStartEffects(logMessage);
    if (currentEnemy.hp <= 0) { handleVictory(); return; }

    let rawDmg = currentEnemy.baseAtk;
    let finalDmg = hero.calculateDefendedDamage(rawDmg);
    hero.hp = Math.max(0, hero.hp - finalDmg);
    logMessage(`El ${currentEnemy.name} ataca: sufres ${finalDmg} de daño.`, "enemy");

    if (hero.hp <= 0) triggerGameOver();
    else turnInProgress = false;
}

// --- NUEVO: GESTIÓN DE RECOMPENSAS LÓGICAS AL GANAR ---
function handleVictory() {
    logMessage(`¡Victoria sobre ${currentEnemy.name}!`, "system");
    
    // 1. Repartir monedas de oro y experiencia escaladas
    let goldEarned = Math.floor(5 + Math.random() * 8) + (currentFloor * 2);
    hero.gold += goldEarned;
    hero.exp += currentEnemy.expReward;
    logMessage(`Ganaste +${currentEnemy.expReward} EXP y 🪙 ${goldEarned}g.`, "system");

    // 2. Probabilidad de soltar botín (40%)
    if (Math.random() < 0.40) {
        let luckyLoot = lootTable[Math.floor(Math.random() * lootTable.length)];
        let invItem = inventory.find(i => i.id === luckyLoot.id);
        if (invItem) invItem.count++; 
        else inventory.push({ ...luckyLoot, count: 1 });
        logMessage(`🎁 Encontraste en el suelo: ¡${luckyLoot.name}!`, "system");
    }

    // 3. Evaluar subida de nivel
    if (hero.exp >= hero.nextLevelExp) {
        hero.level++; hero.exp -= hero.nextLevelExp; hero.nextLevelExp = Math.floor(hero.nextLevelExp * 1.5);
        hero.maxHp += 20; hero.maxMp += 10; hero.baseAtk += 3;
        hero.hp = hero.maxHp; hero.mp = hero.maxMp;
        logMessage(`✨ ¡NIVEL UP! Alcanzas el Nivel ${hero.level}. Tus atributos aumentan.`, "system");
    }

    document.getElementById("enemy-panel").style.display = "none";
    gameState = "DUNGEON"; turnInProgress = false;
    document.getElementById("action-grid").innerHTML = "";
}

function triggerGameOver() {
    gameState = "CRASHED"; document.getElementById("bsod-screen").style.display = "block";
}

function logMessage(text, type) {
    const box = document.getElementById("log-box"); const entry = document.createElement("div");
    entry.style.color = type === "hero" ? "#5dade2" : (type === "enemy" ? "#ec7063" : "#f4d03f");
    entry.innerText = text; box.appendChild(entry); box.scrollTop = box.scrollHeight;
}

// RENDERIZADOR COMPLETO DEL PANEL DE ESTADÍSTICAS E INVENTARIO COPIADO DE V2
function updateUI() {
    document.getElementById("gems-txt").innerText = `${gems}/7`;
    document.getElementById("state-txt").innerText = gameState;
    if (hero) {
        document.getElementById("hero-class-title").innerText = `Sir Alden (${hero.heroClass} - Niv.${hero.level})`;
        document.getElementById("hero-hp").innerText = `${hero.hp}/${hero.maxHp} [EXP: ${hero.exp}/${hero.nextLevelExp}]`;
        document.getElementById("hero-mp").innerText = `${hero.mp}/${hero.maxMp} [Oro: ${hero.gold}g]`;
        renderStatusTags("hero-statuses", hero);
    }
    if (currentEnemy && gameState === "COMBAT") {
        document.getElementById("enemy-name").innerText = currentEnemy.name;
        document.getElementById("enemy-hp").innerText = `${currentEnemy.hp}/${currentEnemy.maxHp}`;
        renderStatusTags("enemy-statuses", currentEnemy);
    }
    renderInventoryUI();
}

// Pintar la lista de la mochila de forma reactiva en el menú de acciones
function renderInventoryUI() {
    const grid = document.getElementById("action-grid");
    if (gameState === "COMBAT" || gameState === "CLASS_SELECT") return; // En combate prioriza botones de ataque

    // Si estás explorando el laberinto o el mapamundi, el panel lateral se convierte en tu Mochila
    grid.innerHTML = "<div style='grid-column: 1/3; font-weight:bold; color:#e67e22; text-align:center;'>🎒 MOCHILA (Toca para usar/equipar)</div>";
    inventory.forEach(item => {
        if (item.count > 0) {
            let btn = document.createElement("button");
            btn.innerText = `${item.name} (x${item.count})`;
            btn.onclick = () => handleUseItem(item);
            grid.appendChild(btn);
        }
    });
}

function handleUseItem(item) {
    if (item.type === "consumable") {
        if (item.subType === "hp") {
            if (hero.hp === hero.maxHp) return;
            hero.hp = Math.min(hero.maxHp, hero.hp + item.value);
            logMessage(`Consumes ${item.name}: +${item.value} HP.`, "hero");
        } else {
            if (hero.mp === hero.maxMp) return;
            hero.mp = Math.min(hero.maxMp, hero.mp + item.value);
            logMessage(`Bebes ${item.name}: +${item.value} MP.`, "hero");
        }
        item.count--;
    } else if (item.type === "equip") {
        if (item.subType === "weapon") {
            if (hero.weapon) inventory.push({ ...hero.weapon, count: 1 });
            hero.weapon = item;
            document.getElementById("eq-weapon").innerText = `${item.name} (+${item.value} ATK)`;
        } else {
            if (hero.armor) inventory.push({ ...hero.armor, count: 1 });
            hero.armor = item;
            document.getElementById("eq-armor").innerText = `${item.name} (+${item.value} DEF)`;
        }
        // Quitar de la mochila común al equiparlo
        item.count--;
        logMessage(`Te has equipado: ${item.name}.`, "system");
    }
    updateUI();
}

function renderStatusTags(elementId, entity) {
    const container = document.getElementById(elementId); container.innerHTML = "";
    entity.statuses.forEach(s => {
        const span = document.createElement("span"); span.className = s.id === "SHIELDED" ? "buff-tag" : "debuff-tag";
        span.innerText = `${s.id}(${s.duration})`; container.appendChild(span);
    });
}
