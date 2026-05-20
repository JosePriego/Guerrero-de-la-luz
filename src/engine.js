// src/engine.js

import { TOWERS, STATUS_EFFECTS } from './database.js';
import { Character } from './player.js';
import { ProceduralDungeon } from './map.js';

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

let inventory = [
    { id: "hp_pot", name: "Poción Vida", type: "consumable", subType: "hp", value: 50, count: 2 }
];

const lootTable = [
    { id: "hp_pot", name: "Poción Vida", type: "consumable", subType: "hp", value: 50 },
    { id: "steel_sword", name: "Espada Runas", type: "equip", subType: "weapon", value: 12 },
    { id: "knight_armor", name: "Placas Sagradas", type: "equip", subType: "armor", value: 6 }
];

// Catálogo de Grimm el Forjador
const shopCatalog = [
    { id: "hp_pot", name: "Poción Vida", value: 50, cost: 15, type: "consumable" },
    { id: "steel_sword", name: "Espada Runas", value: 12, cost: 45, type: "weapon" },
    { id: "knight_armor", name: "Placas Sagradas", value: 6, cost: 40, type: "armor" }
];

document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", (e) => {
        let chosenClass = card.id.split("-")[1];
        setupHero(chosenClass);
    });
});

function setupHero(heroClass) {
    if (heroClass === "Guerrero") hero = new Character({ heroClass, maxHp: 140, maxMp: 20, baseAtk: 13, baseDef: 3 });
    if (heroClass === "Mago") hero = new Character({ heroClass, maxHp: 90, maxMp: 60, baseAtk: 16, baseDef: 0 });
    if (heroClass === "Picaro") hero = new Character({ heroClass, maxHp: 110, maxMp: 30, baseAtk: 14, baseDef: 1 });
    
    document.getElementById("class-selection").style.display = "none";
    gameState = "OVERWORLD";
    buildOverworldMatrix();
    initControls();
    updateGameCycle();
}

function buildOverworldMatrix() {
    mapSize = 15;
    currentGrid = [];
    for (let r = 0; r < 15; r++) {
        currentGrid.push(new Array(15).fill("."));
    }
    TOWERS.forEach(t => { if (!t.cleared) currentGrid[t.r][t.c] = "T"; });
}

function updateGameCycle() {
    drawClassicGrid();
    updateUI();
}

function drawClassicGrid() {
    const mapEl = document.getElementById("map");
    mapEl.style.gridTemplateColumns = `repeat(${mapSize}, 24px)`;
    mapEl.innerHTML = "";
    let activePos = gameState === "OVERWORLD" ? overworldPos : dungeonPos;

    for (let r = 0; r < mapSize; r++) {
        for (let c = 0; c < mapSize; c++) {
            const tile = document.createElement("div");
            tile.classList.add("tile");
            
            if (r === activePos.r && c === activePos.c) {
                tile.classList.add("player"); tile.innerText = "🧙‍♂️";
            } else {
                let cellData = currentGrid[r][c];
                if (cellData === "#") { tile.classList.add("wall"); tile.innerText = "▓"; }
                else if (cellData === "T") { tile.classList.add("tower"); tile.innerText = "∏"; }
                else if (cellData === "🪜") { tile.classList.add("stairs"); tile.innerText = "🪜"; }
                else if (cellData === "🏪") { tile.innerText = "🏪"; }
                else if (cellData === "👹") { tile.innerText = "😈"; }
                else { tile.classList.add("floor"); tile.innerText = "."; }
            }
            mapEl.appendChild(tile);
        }
    }
}

function initControls() {
    document.addEventListener("keydown", (e) => {
        if (gameState !== "OVERWORLD" && gameState !== "DUNGEON" && gameState !== "SHOP") return;
        if (e.key === "t" || e.key === "T") { triggerCheat(); return; }
        let offset = { r: 0, c: 0 };
        if (e.key === "ArrowUp" || e.key === "w") offset.r = -1;
        if (e.key === "ArrowDown" || e.key === "s") offset.r = 1;
        if (e.key === "ArrowLeft" || e.key === "a") offset.c = -1;
        if (e.key === "ArrowRight" || e.key === "d") offset.c = 1;
        processMove(offset.r, offset.c);
    });

    const touchControls = { "touch-up": {r:-1,c:0}, "touch-down": {r:1,c:0}, "touch-left": {r:0,c:-1}, "touch-right": {r:0,c:1} };
    Object.keys(touchControls).forEach(id => {
        document.getElementById(id).addEventListener("touchstart", (e) => {
            e.preventDefault();
            if (gameState !== "OVERWORLD" && gameState !== "DUNGEON" && gameState !== "SHOP") return;
            let offset = touchControls[id];
            processMove(offset.r, offset.c);
        });
    });
    
    document.getElementById("cheat-btn").onclick = () => triggerCheat();
}

function processMove(dr, dc) {
    let pos = gameState === "OVERWORLD" ? overworldPos : dungeonPos;
    let nr = pos.r + dr; let nc = pos.c + dc;
    if (nr >= 0 && nr < mapSize && nc >= 0 && nc < mapSize && currentGrid[nr][nc] !== "#") {
        pos.r = nr; pos.c = nc;
        checkTriggers();
        updateGameCycle();
    }
}

// 🏛️ RECONEXIÓN: MAPA DE FLUJO DE 15 PLANTAS, TIENDAS Y JEFES
function checkTriggers() {
    if (gameState === "OVERWORLD") {
        if (currentGrid[overworldPos.r][overworldPos.c] === "T") {
            let t = TOWERS.find(tow => tow.r === overworldPos.r && tow.c === overworldPos.c);
            if (t && !t.cleared) { activeTowerIdx = TOWERS.indexOf(t); currentFloor = 1; enterDungeon(); }
        }
    } else if (gameState === "DUNGEON") {
        let cell = currentGrid[dungeonPos.r][dungeonPos.c];
        if (cell === "🪜" || cell === "🏪" || cell === "👹") {
            currentFloor++;
            if (currentFloor > 15) {
                logMessage("💎 ¡NÚCLEO PURIFICADO! Has derrotado al Guardián de la Torre.", "system");
                TOWERS[activeTowerIdx].cleared = true; gems++;
                gameState = "OVERWORLD"; buildOverworldMatrix();
            } else {
                enterDungeon();
            }
        } else if (Math.random() < 0.12) { 
            startCombat(); 
        }
    } else if (gameState === "SHOP") {
        // Si el jugador pisa la tienda de Grimm, el motor vuelve a permitir avanzar al siguiente piso
        currentFloor++;
        enterDungeon();
    }
}

function enterDungeon() {
    mapSize = 12;
    let generator = new ProceduralDungeon(12);
    currentGrid = generator.generate().grid;
    dungeonPos = { r: 1, c: 1 };
    currentGrid[dungeonPos.r][dungeonPos.c] = " ";

    // Inyección de eventos estructurales según la planta exacta
    if (currentFloor === 5 || currentFloor === 10) {
        gameState = "SHOP";
        currentGrid[10][10] = "🏪"; // Grimm aparece en la salida
        logMessage(`🏪 REFUGIO: Grimm el Forjador ha montado su campamento en la Planta ${currentFloor}.`, "system");
    } else if (currentFloor === 15) {
        gameState = "DUNGEON";
        currentGrid[10][10] = "👹"; // El jefe bloquea las escaleras
        logMessage(`👹 CÚSPIDE: El Guardián de la Torre aguarda en la Planta 15. Prepárate.`, "lore");
    } else {
        gameState = "DUNGEON";
    }
}

function startCombat() {
    gameState = "COMBAT";
    let scale = 1 + (currentFloor - 1) * 0.15;
    let t = TOWERS[activeTowerIdx];
    
    // Si estamos en la planta 15, el oponente es obligatoriamente el Jefe de la base de datos
    let eName = (currentFloor === 15) ? t.boss : t.monsters[Math.floor(Math.random() * t.monsters.length)];
    let hpMultiplier = (currentFloor === 15) ? 2.5 : 1.0; // Los jefes tienen más vida

    currentEnemy = new Character({ 
        heroClass: "Monstruo", name: eName, 
        maxHp: Math.floor(40 * scale * hpMultiplier), 
        baseAtk: Math.floor((currentFloor === 15 ? 13 : 9) * scale), 
        baseDef: 0 
    });
    currentEnemy.expReward = Math.floor((currentFloor === 15 ? 50 : 15) * scale);
    
    if (currentFloor === 15) logMessage(`🚨 COMBATE CONTRA JEFE: ¡${currentEnemy.name} desciende!`, "enemy");
    else logMessage(`💥 ¡Un ${currentEnemy.name} ruge frente a ti!`, "enemy");
    
    document.getElementById("enemy-panel").style.display = "block";
    buildCombatButtons();
}

function buildCombatButtons() {
    const grid = document.getElementById("action-grid"); grid.innerHTML = "";
    let b1 = document.createElement("button"); b1.innerText = "⚔️ Ataque";
    b1.onclick = () => executeTurn("ATTACK");
    let b2 = document.createElement("button"); b2.innerText = "✨ Especial (3 MP)";
    b2.onclick = () => executeTurn("SKILL");
    grid.appendChild(b1); grid.appendChild(b2);
}

function executeTurn(action) {
    if (turnInProgress) return; turnInProgress = true;
    hero.processTurnStartEffects(logMessage);
    if (hero.hp <= 0) { triggerGameOver(); return; }

    let wBonus = hero.weapon ? hero.weapon.value : 0;
    if (action === "ATTACK") {
        let dmg = currentEnemy.calculateDefendedDamage(hero.baseAtk + wBonus + Math.floor(Math.random() * 3));
        currentEnemy.hp = Math.max(0, currentEnemy.hp - dmg);
        logMessage(`Cortas al enemigo causándole ${dmg} HP.`, "hero");
    } else if (action === "SKILL") {
        hero.mp -= 3;
        if (hero.heroClass === "Guerrero") { hero.applyStatus("SHIELDED", 2); logMessage("Activas Baluarte.", "hero"); }
        if (hero.heroClass === "Mago") { currentEnemy.applyStatus("BURNING", 3); logMessage("Invocas Piroclasto.", "hero"); }
        if (hero.heroClass === "Picaro") { currentEnemy.applyStatus("POISONED", 4); logMessage("Inyectas Daga Venenosa.", "hero"); }
    }

    if (currentEnemy.hp <= 0) { handleVictory(); return; }
    setTimeout(enemyTurn, 600);
}

function enemyTurn() {
    if (hero.hp <= 0) return;
    currentEnemy.processTurnStartEffects(logMessage);
    if (currentEnemy.hp <= 0) { handleVictory(); return; }

    let dmg = hero.calculateDefendedDamage(currentEnemy.baseAtk);
    hero.hp = Math.max(0, hero.hp - dmg);
    logMessage(`El monstruo responde: pierdes ${dmg} HP.`, "enemy");

    if (hero.hp <= 0) triggerGameOver();
    else { turnInProgress = false; updateGameCycle(); }
}

function handleVictory() {
    logMessage(`¡Enemigo abatido!`, "system");
    let goldMultiplier = (currentFloor === 15) ? 3 : 1;
    let goldEarned = Math.floor((10 + Math.random() * 6) * goldMultiplier);
    
    hero.gold += goldEarned; 
    hero.exp += currentEnemy.expReward;
    logMessage(`⚔️ Victoria: Recibes ${goldEarned}g y +${currentEnemy.expReward} EXP.`, "system");

    if (Math.random() < 0.45 || currentFloor === 15) {
        let rolled = lootTable[Math.floor(Math.random() * lootTable.length)];
        let item = inventory.find(i => i.id === rolled.id);
        if (item) item.count++; else inventory.push({ ...rolled, count: 1 });
        logMessage(`🎁 Botín: Recoges ${rolled.name}`, "system");
    }

    if (hero.exp >= hero.nextLevelExp) {
        hero.level++; hero.exp -= hero.nextLevelExp; hero.nextLevelExp = Math.floor(hero.nextLevelExp * 1.5);
        hero.maxHp += 20; hero.maxMp += 5; hero.baseAtk += 2;
        hero.hp = hero.maxHp; hero.mp = hero.maxMp; 
        logMessage(`✨ ¡NIVEL UP! Alcanzas el Nivel ${hero.level}. Tus atributos aumentan.`, "system");
    }

    document.getElementById("enemy-panel").style.display = "none";
    
    // Si el oponente era un jefe, forzamos la subida de nivel estructural del mapa
    if (currentFloor === 15) {
        TOWERS[activeTowerIdx].cleared = true; gems++;
        gameState = "OVERWORLD"; buildOverworldMatrix();
    } else if (currentFloor === 5 || currentFloor === 10) {
        gameState = "SHOP";
    } else {
        gameState = "DUNGEON";
    }
    
    turnInProgress = false;
    document.getElementById("action-grid").innerHTML = "";
    updateGameCycle();
}

function useInventoryItem(itemId) {
    let item = inventory.find(i => i.id === itemId);
    if (!item || item.count <= 0) return;

    if (item.subType === "hp") {
        hero.hp = Math.min(hero.maxHp, hero.hp + item.value);
        logMessage(`Tomas Poción de Vida (+50 HP).`, "hero");
    } else if (item.subType === "weapon") {
        if (hero.weapon) {
            let old = inventory.find(i => i.id === hero.weapon.id);
            if (old) old.count++; else inventory.push({...hero.weapon, count: 1});
        }
        hero.weapon = item; logMessage(`Equipas: ${item.name}.`, "system");
        item.count--;
    } else if (item.subType === "armor") {
        if (hero.armor) {
            let old = inventory.find(i => i.id === hero.armor.id);
            if (old) old.count++; else inventory.push({...hero.armor, count: 1});
        }
        hero.armor = item; logMessage(`Equipas: ${item.name}.`, "system");
        item.count--;
    }
    updateGameCycle();
}

function buyShopItem(itemIndex) {
    let prod = shopCatalog[itemIndex];
    if (hero.gold >= prod.cost) {
        hero.gold -= prod.cost;
        let item = inventory.find(i => i.id === prod.id);
        if (item) item.count++;
        else inventory.push({ id: prod.id, name: prod.name, type: prod.type, subType: prod.type === "weapon" ? "weapon" : (prod.type === "armor" ? "armor" : "hp"), value: prod.value, count: 1 });
        logMessage(`🛍️ Compras: ${prod.name} por ${prod.cost}g.`, "hero");
    } else {
        logMessage("❌ No tienes suficiente oro.", "system");
    }
    updateGameCycle();
}

function triggerCheat() {
    let code = prompt("🔮 [TRUCOS]\nEscribe: god / gold");
    if (code === "god") { hero.maxHp = 9999; hero.hp = 9999; hero.baseAtk = 999; }
    if (code === "gold") hero.gold += 500;
    updateGameCycle();
}

function triggerGameOver() {
    gameState = "CRASHED"; document.getElementById("bsod-screen").style.display = "block";
}

function drawTextBar(current, max, size) {
    let pct = current / max; let filled = Math.round(size * pct);
    let str = "["; for (let i = 0; i < size; i++) str += i < filled ? "|" : ".";
    return str + "]";
}

function logMessage(text, type) {
    const box = document.getElementById("log-box"); const entry = document.createElement("div");
    entry.style.color = type === "hero" ? "#5dade2" : (type === "enemy" ? "#ec7063" : "#f4d03f");
    entry.innerText = text; box.appendChild(entry); box.scrollTop = box.scrollHeight;
}

function updateUI() {
    let stateName = gameState;
    if (gameState === "DUNGEON") stateName = `Torre P.${currentFloor}`;
    if (gameState === "SHOP") stateName = `Grimm (P.${currentFloor})`;
    
    document.getElementById("gems-txt").innerText = `${gems}/7`;
    document.getElementById("state-txt").innerText = stateName;
    
    if (hero) {
        // 🎯 MEJORA: Escribir explícitamente los datos numéricos de EXP en el texto superior
        document.getElementById("hero-class-title").innerText = `Sir Alden (${hero.heroClass} - Niv.${hero.level}) [EXP: ${hero.exp}/${hero.nextLevelExp}]`;
        document.getElementById("hero-hp").innerText = `${hero.hp}/${hero.maxHp}`;
        document.getElementById("hero-mp").innerText = `${hero.mp}/${hero.maxMp} [Oro: ${hero.gold}g]`;
        document.getElementById("hp-bar-visual").innerText = drawTextBar(hero.hp, hero.maxHp, 15);
        document.getElementById("mp-bar-visual").innerText = drawTextBar(hero.mp, hero.maxMp, 15);
        
        let wB = hero.weapon ? hero.weapon.value : 0; let aB = hero.armor ? hero.armor.value : 0;
        document.getElementById("eq-weapon").innerText = hero.weapon ? `${hero.weapon.name} (+${wB} ATK)` : "Espada de Madera (+0)";
        document.getElementById("eq-armor").innerText = hero.armor ? `${hero.armor.name} (+${aB} DEF)` : "Túnica de Tela (+0)";
        renderStatusTags("hero-statuses", hero);
    }
    
    if (currentEnemy && gameState === "COMBAT") {
        document.getElementById("enemy-name").innerText = currentEnemy.name;
        document.getElementById("enemy-hp").innerText = `${currentEnemy.hp}/${currentEnemy.maxHp}`;
        document.getElementById("enemy-bar-visual").innerText = drawTextBar(currentEnemy.hp, currentEnemy.maxHp, 12);
        renderStatusTags("enemy-statuses", currentEnemy);
    }
    
    // Render de mochila
    const invGrid = document.getElementById("inventory-list"); invGrid.innerHTML = "";
    inventory.forEach(item => {
        if (item.count > 0) {
            let div = document.createElement("div"); div.className = "inv-item";
            div.innerHTML = `<span>${item.name} (x${item.count})</span>`;
            let btn = document.createElement("button"); btn.className = "btn-use"; btn.innerText = "Usar";
            btn.onclick = () => useInventoryItem(item.id);
            div.appendChild(div); invGrid.appendChild(div);
        }
    });

    // GESTIÓN DINÁMICA DEL PANEL DE ACCIONES (TIENDA VS EXPLORACIÓN)
    const grid = document.getElementById("action-grid");
    if (gameState === "SHOP") {
        grid.innerHTML = "<div style='grid-column: 1/3; font-weight:bold; color:#f1c40f; text-align:center;'>🏪 TIENDA DE GRIMM (Toca para comprar)</div>";
        shopCatalog.forEach((prod, idx) => {
            let b = document.createElement("button");
            b.innerText = `${prod.name} (${prod.cost}g)`;
            b.disabled = hero.gold < prod.cost;
            b.onclick = () => buyShopItem(idx);
            grid.appendChild(b);
        });
        let leaveBtn = document.createElement("button");
        leaveBtn.innerText = "🪜 Subir Planta";
        leaveBtn.style.gridColumn = "1/3";
        leaveBtn.onclick = () => { currentFloor++; enterDungeon(); updateGameCycle(); };
        grid.appendChild(leaveBtn);
    } else if (gameState === "DUNGEON" || gameState === "OVERWORLD") {
        grid.innerHTML = "<div style='grid-column: 1/3; font-weight:bold; color:#aaa; text-align:center;'>🎮 CONTROLES ACTIVOS</div>";
    }
}

function renderStatusTags(elementId, entity) {
    const container = document.getElementById(elementId); container.innerHTML = "";
    entity.statuses.forEach(s => {
        const span = document.createElement("span"); span.className = s.id === "SHIELDED" ? "buff-tag" : "debuff-tag";
        span.innerText = `${s.id}(${s.duration})`; container.appendChild(span);
    });
}
