// src/map.js

export class ProceduralDungeon {
    constructor(size) {
        this.size = size;
    }

    generate() {
        let grid = [];
        for (let r = 0; r < this.size; r++) {
            grid.push(new Array(this.size).fill("#"));
        }

        let miner = { r: 1, c: 1 };
        grid[miner.r][miner.c] = " "; 

        let totalTilesToCarve = Math.floor((this.size * this.size) * 0.45);
        let carved = 1;

        while (carved < totalTilesToCarve) {
            let dirs = [{r:-1,c:0}, {r:1,c:0}, {r:0,c:-1}, {r:0,c:1}];
            let move = dirs[Math.floor(Math.random() * dirs.length)];
            let nr = miner.r + move.r;
            let nc = miner.c + move.c;

            if (nr > 0 && nr < this.size - 1 && nc > 0 && nc < this.size - 1) {
                if (grid[nr][nc] === "#") {
                    grid[nr][nc] = " "; 
                    carved++;
                }
                miner.r = nr;
                miner.c = nc;
            }
        }
        
        grid[miner.r][miner.c] = "🪜"; 
        
        return { grid, exitPos: miner };
    }
}
        grid[miner.r][miner.c] = "🪜"; // Salida garantizada conectada
        return { grid, exitPos: miner };
    }
}
