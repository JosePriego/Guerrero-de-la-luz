// src/engine.js

import { TOWERS, STATUS_EFFECTS } from './database.js';
import { Character } from './player.js';
import { ProceduralDungeon } from './map.js';
import { ASSETS, preloadAssets } from './assets.js';

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const TILE_RES = 24; // Resolución geométrica por casilla en píxeles

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

// Inicializador del DOM Selector de Clases
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
    
    // Bloqueamos el inicio del bucle hasta que las texturas estén en memoria
    preloadAssets().then(() => {
        document.getElementById("class-selection").style.display = "none";
        gameState = "OVERWORLD";
        buildOverworldMatrix();
        gameLoop(); // Arranca el bucle a 60 FPS con las imágenes listas
    }).catch(err => {
        console.error("Explosión gráfica:", err);
        logMessage("🚨 ERROR: No se pudieron precargar los assets visuales.", "enemy");
    });
}

function buildOverworldMatrix() {
    mapSize = 15;
    currentGrid = [];
    for (let r = 0; r < 15; r++) {
        currentGrid.push(new Array(15).fill("."));
    }
    TOWERS.forEach(t => {
        if (!t.cleared) currentGrid[t.r][t.c] = "T";
    });
}

function gameLoop() {
    renderCanvas();
    updateUI();
    if (gameState !== "CRASHED") requestAnimationFrame(gameLoop);
}

function renderCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let activePos = gameState === "OVERWORLD" ? overworldPos : dungeonPos;

    // 1. Dibujar el escenario baldosa a baldosa
    for (let r = 0; r < mapSize; r++) {
        for (let c = 0; c < mapSize; c++) {
            let tile = currentGrid[r][c];
            let px = c * TILE_RES;
            let py = r * TILE_RES;

            // Capa base: Siempre dibujamos suelo para evitar transparencias
            ctx.drawImage(ASSETS.suelo, px, py, TILE_RES, TILE_RES);

            if (tile === "#") {
                ctx.drawImage(ASSETS.muro, px, py, TILE_RES, TILE_RES);
            } else if (tile === "T") {
                ctx.drawImage(ASSETS.torre, px, py, TILE_RES, TILE_RES);
                
                // Capa superior: Tinte translúcido según el elemento de la torre
                let tow = TOWERS.find(t => t.r === r && t.c === c);
                if (tow) {
                    ctx.fillStyle = tow.color;
                    ctx.globalAlpha = 0.25; 
                    ctx.fillRect(px, py, TILE_RES, TILE_RES);
                    ctx.globalAlpha = 1.0;  // Reset de opacidad para el resto del ciclo
                }
            } else if (tile === "🪜") {
                ctx.drawImage(ASSETS.escalera, px, py, TILE_RES, TILE_RES);
            }
        }
    }

    // 2. Dibujar entidades en la capa superior
    let pX = activePos.c * TILE_RES;
    let pY = activePos.r * TILE_RES;
    ctx.drawImage(ASSETS.jugador, pX, pY, TILE_RES, TILE_RES);
}

// --- GESTIÓN DE ENTRADAS ELECTRÓNICAS (TECLADO) ---
document.addEventListener("keydown", (e) => {
    if (gameState !== "OVERWORLD" && gameState !== "DUNGEON") return;
    let pos = gameState === "OVERWORLD" ? overworldPos : dungeonPos;
    let nextR = pos.r; let nextC = pos.c;

    if (e.key === "ArrowUp" || e.key === "w") nextR--;
    if (e.key === "ArrowDown" || e.key === "s") nextR++;
    if (e.key === "ArrowLeft" || e.key === "a") nextC--;
    if (e.key === "ArrowRight" || e.key === "d") nextC++;

    processMoveIntent(pos, nextR, nextC);
});

// --- SISTEMA DE CONTROLES TÁCTILES MÓVILES (D-PAD) ---
const touchControls = {
    "touch-up":    { r: -1, c: 0 },
    "touch-down":  { r: 1,  c: 0 },
    "touch-left":  { r: 0,  c: -1 },
    "touch-right": { r: 0,  c: 1 }
};

Object.keys(touchControls).forEach(buttonId => {
    const btnElement = document.getElementById(buttonId);
    if (btnElement) {
        btnElement.addEventListener("touchstart", (e) => {
            e.preventDefault(); // Previene emulaciones fantasma de clics de escritorio en navegadores móviles
            if (gameState !== "OVERWORLD" && gameState !== "DUNGEON") return;
            
            let pos = gameState === "OVERWORLD" ? overworldPos : dungeonPos;
            let offset = touchControls[buttonId];
            let nextR = pos.r + offset.r;
            let nextC = pos.c + offset.c;

            processMoveIntent(pos, nextR, nextC);
        });
    }
});

// Núcleo unificado de validación de movimientos lógicos
function processMoveIntent(pos, nextR, nextC) {
    if (nextR >= 0 && nextR < mapSize && nextC >= 0 && nextC < mapSize && currentGrid[nextR][nextC] !== "#") {
        pos.r = nextR; 
        pos.c = nextC;
        checkStepTriggers();
    }
}

function checkStepTriggers() {
    if (gameState === "OVERWORLD") {
        let cell = currentGrid[overworldPos.r][overworldPos.c];
        if (cell === "T") {
            let t = TOWERS.find(tow => tow.r === overworldPos.r && tow.c === overworldPos.c);
            if (t && !t.cleared) {
                activeTowerIdx = TOWERS.indexOf(t);
                currentFloor = 1;
                enterDungeon();
            }
        }
    } else {
        let cell = currentGrid[dungeonPos.r][dungeonPos.c];
        if (cell === "🪜") {
            currentFloor++;
            if (currentFloor > 15) {
                logMessage("¡Has purificado la torre!", "system");
                TOWERS[activeTowerIdx].cleared = true;
                gems++;
                gameState = "OVERWORLD";
                buildOverworldMatrix();
            } else {
                enterDungeon();
            }
        } else if (Math.random() < 0.12) {
            startCombat();
        }
    }
}

function enterDungeon() {
    gameState = "DUNGEON";
    mapSize = 12;
    let generator = new ProceduralDungeon(12);
    let build = generator.generate();
    currentGrid = build.grid;
}

function startCombat() {
    gameState = "COMBAT";
    let t = TOWERS[activeTowerIdx];
    let eName = t.monsters[Math.floor(Math.random() * t.monsters.length)];
    currentEnemy = new Character({ heroClass: "Monstruo", name: eName, maxHp: 50, maxMp: 10, baseAtk: 12, baseDef: 0 });
    
    logMessage(`💥 Ha aparecido un ${currentEnemy.name} en el pasillo.`, "enemy");
    document.getElementById("enemy-panel").style.display = "block";
    buildCombatActions();
}

// --- CONSOLA Y ACCIONES EN COMBATE ---
function buildCombatActions() {
    const grid = document.getElementById("action-grid");
    grid.innerHTML = "";
    
    let btnAtk = document.createElement("button");
    btnAtk.innerText = "⚔️ Atacar Físico";
    btnAtk.onclick = () => executeHeroTurn("ATTACK");
    grid.appendChild(btnAtk);

    let btnSkill = document.createElement("button");
    if (hero.heroClass === "Guerrero") btnSkill.innerText = "🛡️ Baluarte (Escudo)";
    if (hero.heroClass === "Mago") btnSkill.innerText = "🔥 Piroclasto (Quema)";
    if (hero.heroClass === "Picaro") btnSkill.innerText = "🧪 Daga Infecta (Envenena)";
    
    btnSkill.onclick = () => executeHeroTurn("SKILL");
    grid.appendChild(btnSkill);
}

function executeHeroTurn(actionType) {
    if (turnInProgress) return;
    turnInProgress = true;

    hero.processTurnStartEffects(logMessage);
    if (hero.hp <= 0) { triggerGameOver(); return; }

    if (actionType === "ATTACK") {
        let rawDmg = hero.baseAtk + Math.floor(Math.random() * 4);
        let finalDmg = currentEnemy.calculateDefendedDamage(rawDmg);
        currentEnemy.hp = Math.max(0, currentEnemy.hp - finalDmg);
        logMessage(`Atacas infligiendo ${finalDmg} de daño a ${currentEnemy.name}.`, "hero");
    } 
    else if (actionType === "SKILL") {
        if (hero.heroClass === "Guerrero") {
            hero.applyStatus("SHIELDED", 2);
            logMessage(`Te resguardas tras tu escudo divino.`, "hero");
        } else if (hero.heroClass === "Mago") {
            currentEnemy.applyStatus("BURNING", 3);
            logMessage(`Lanzas una bola de fuego que envuelve en llamas al enemigo.`, "hero");
        } else if (hero.heroClass === "Picaro") {
            currentEnemy.applyStatus("POISONED", 4);
            logMessage(`Asestas un tajo venenoso preciso.`, "hero");
        }
    }

    if (currentEnemy.hp <= 0) {
        logMessage(`¡Has aniquilado al ${currentEnemy.name}!`, "system");
        document.getElementById("enemy-panel").style.display = "none";
        gameState = "DUNGEON";
        turnInProgress = false;
        document.getElementById("action-grid").innerHTML = "";
        return;
    }

    setTimeout(enemyTurn, 700);
}

function enemyTurn() {
    if (hero.hp <= 0) return;
    currentEnemy.processTurnStartEffects(logMessage);
    
    if (currentEnemy.hp <= 0) {
        logMessage(`El estado alterado ha liquidado a ${currentEnemy.name}.`, "system");
        document.getElementById("enemy-panel").style.display = "none";
        gameState = "DUNGEON";
        turnInProgress = false;
        return;
    }

    let rawDmg = currentEnemy.baseAtk;
    let finalDmg = hero.calculateDefendedDamage(rawDmg);
    hero.hp = Math.max(0, hero.hp - finalDmg);
    logMessage(`El ${currentEnemy.name} te asesta un golpe limpio. Recibes ${finalDmg} de daño.`, "enemy");

    if (hero.hp <= 0) {
        triggerGameOver();
    } else {
        turnInProgress = false;
    }
}

function triggerGameOver() {
    gameState = "CRASHED";
    document.getElementById("bsod-screen").style.display = "block";
}

function logMessage(text, type) {
    const box = document.getElementById("log-box");
    const entry = document.createElement("div");
    entry.style.color = type === "hero" ? "#5dade2" : (type === "enemy" ? "#ec7063" : "#f4d03f");
    entry.innerText = text;
    box.appendChild(entry);
    box.scrollTop = box.scrollHeight;
}

function updateUI() {
    document.getElementById("gems-txt").innerText = `${gems}/7`;
    document.getElementById("state-txt").innerText = gameState;
    if (hero) {
        document.getElementById("hero-class-title").innerText = `Sir Alden (${hero.heroClass})`;
        document.getElementById("hero-hp").innerText = `${hero.hp}/${hero.maxHp}`;
        document.getElementById("hero-mp").innerText = `${hero.mp}/${hero.maxMp}`;
        renderStatusTags("hero-statuses", hero);
    }
    if (currentEnemy && gameState === "COMBAT") {
        document.getElementById("enemy-name").innerText = currentEnemy.name;
        document.getElementById("enemy-hp").innerText = `${currentEnemy.hp}/${currentEnemy.maxHp}`;
        renderStatusTags("enemy-statuses", currentEnemy);
    }
}

function renderStatusTags(elementId, entity) {
    const container = document.getElementById(elementId);
    container.innerHTML = "";
    entity.statuses.forEach(s => {
        const span = document.createElement("span");
        span.className = s.id === "SHIELDED" ? "buff-tag" : "debuff-tag";
        span.innerText = `${s.id}(${s.duration})`;
        container.appendChild(span);
    });
}
