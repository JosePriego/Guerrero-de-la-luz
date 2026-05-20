// src/map.js

export class ProceduralDungeon {
    constructor(size) {
        this.size = size;
    }

    generate() {
        // 1. Inicializamos todo el mapa con el bloque de muro sólido '#'
        let grid = [];
        for (let r = 0; r < this.size; r++) {
            grid.push(new Array(this.size).fill("#"));
        }

        // 2. Colocamos al minero excavador en la casilla de salida segura (1,1)
        let miner = { r: 1, c: 1 };
        grid[miner.r][miner.c] = " "; // Las casillas caminables excavadas valdrán un espacio vacío " "

        // 3. Calculamos el volumen total de túneles transitables que deseamos perforar (45% del mapa)
        let totalTilesToCarve = Math.floor((this.size * this.size) * 0.45);
        let carved = 1;

        while (carved < totalTilesToCarve) {
            let dirs = [{r:-1,c:0}, {r:1,c:0}, {r:0,c:-1}, {r:0,c:1}];
            let move = dirs[Math.floor(Math.random() * dirs.length)];
            let nr = miner.r + move.r;
            let nc = miner.c + move.c;

            // Mantener al excavador dentro de los márgenes protegiendo los bordes exteriores del mapa
            if (nr > 0 && nr < this.size - 1 && nc > 0 && nc < this.size - 1) {
                if (grid[nr][nc] === "#") {
                    grid[nr][nc] = " "; // Perforamos el muro dejando un pasillo transitable " "
                    carved++;
                }
                miner.r = nr;
                miner.c = nc;
            }
        }
        
        // 4. Colocamos la escalera de salida en la última casilla excavada garantizando conectividad total
        grid[miner.r][miner.c] = "🪜"; 
        
        return { grid, exitPos: miner };
    }
}
        
        grid[miner.r][miner.c] = "🪜"; // Salida garantizada conectada
        return { grid, exitPos: miner };
    }
}
