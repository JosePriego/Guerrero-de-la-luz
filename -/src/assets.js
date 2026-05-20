// src/assets.js

// Diccionario de imágenes del juego
export const ASSETS = {
    suelo: new Image(),
    muro: new Image(),
    jugador: new Image(),
    torre: new Image(),
    escalera: new Image(),
    monstruo: new Image()
};

// Fuentes visuales (puedes cambiarlas por rutas a tus archivos .png reales cuando los tengas)
const SPRITES_DATA = {
    suelo: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect width='24' height='24' fill='%231a1a24'/><path d='M0 0l2 2m20 20l2 2' stroke='%23252535'/></svg>",
    muro: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect width='24' height='24' fill='%233a2f4c' stroke='%231f162e' stroke-width='2'/><rect x='4' y='4' width='16' height='6' fill='%234a3d63'/><rect x='4' y='14' width='16' height='6' fill='%234a3d63'/></svg>",
    jugador: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='10' fill='%235dade2'/><circle cx='9' cy='9' r='2' fill='white'/><circle cx='15' cy='9' r='2' fill='white'/><path d='M8 15s2 2 4 2 4-2 4-2' stroke='white' stroke-width='2' fill='none'/></svg>",
    torre: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect x='4' y='6' width='16' height='18' fill='%239b59b6'/><path d='M2 6l5-4 5 4 5-4 5 4v18H2V6z' fill='%238e44ad'/></svg>",
    escalera: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect width='24' height='24' fill='%23111'/><path d='M6 2v20M18 2v20M6 6h12M6 11h12M6 16h12' stroke='%23f1c40f' stroke-width='2'/></svg>",
    monstruo: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='9' fill='%23ec7063'/><path d='M6 6l3 4M18 6l-3 4' stroke='%23ec7063' stroke-width='3'/><circle cx='9' cy='11' r='1.5' fill='black'/><circle cx='15' cy='11' r='1.5' fill='black'/><path d='M8 16s2-2 4-2 4 2 4 2' stroke='black' stroke-width='2' fill='none'/></svg>"
};

// Función que devuelve una Promesa. Se resuelve solo cuando TODAS las imágenes cargan.
export function preloadAssets() {
    const promises = [];
    
    Object.keys(ASSETS).forEach(key => {
        const p = new Promise((resolve, reject) => {
            ASSETS[key].onload = () => resolve();
            ASSETS[key].onerror = () => reject(`Error cargando sprite: ${key}`);
            ASSETS[key].src = SPRITES_DATA[key]; // Inicia la descarga
        });
        promises.push(p);
    });

    return Promise.all(promises);
}