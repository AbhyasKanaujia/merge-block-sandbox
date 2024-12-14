let CHIP_SIZE = 50;
let GRID_WIDTH = 5;
let GRID_HEIGHT = 7;
const SUFFIX_WITH_NAME = [["", ""], ["K", "Thousand"], ["M", "Million"], ["B", "Billion"], ["T", "Trillion"], ["Q", "Quadrillion"], ["Qi", "Quintillion"], ["Sx", "Sextillion"], ["Sp", "Septillion"], ["Oc", "Octillion"], ["No", "Nonillion"], ["Dc", "Decillion"], ["UDc", "Undecillion"], ["DDc", "Duodecillion"], ["TDc", "Tredecillion"], ["QDc", "Quattuordecillion"], ["QiDc", "Quindecillion"], ["SxDc", "Sexdecillion"], ["SpDc", "Septendecillion"], ["ODc", "Octodecillion"], ["NDc", "Novemdecillion"], ["V", "Vigintillion"], ["UV", "Unvigintillion"], ["DV", "Duovigintillion"], ["TV", "Trevigintillion"], ["QV", "Quattuorvigintillion"], ["QiV", "Quinvigintillion"], ["SxV", "Sexvigintillion"], ["SpV", "Septenvigintillion"], ["OV", "Octovigintillion"], ["NV", "Novemvigintillion"], ["Tr", "Trigintillion"],];

// Game state
let disableInput = false;
let nextChip;
let grid;

movingChips = [];

class MovingChip {
    constructor(startRow, startCol, endRow, endCol, direction, chip, {mergeRow, mergeCol} = {}) {
        this.endRow = endRow;
        this.endCol = endCol;

        const {x: startX, y: startY} = grid.getCellCoordinates(startRow, startCol);
        const {x: endX, y: endY} = grid.getCellCoordinates(endRow, endCol);

        this.posX = startX;
        this.posY = startY;
        this.endX = endX;
        this.endY = endY;
        this.chip = chip;
        this.direction = direction;
        this.mergeRow = mergeRow;
        this.mergeCol = mergeCol;
        this.speed = CHIP_SIZE / 4;
    }

    move() {
        switch (this.direction) {
            case "UP":
                this.posY = min(this.posY + this.speed, this.endY);
                break;
            case "DOWN":
                this.posY = max(this.posY - this.speed, this.endY);
                break;
            case "LEFT":
                this.posX = max(this.posX - this.speed, this.endX);
                break;
            case "RIGHT":
                this.posX = min(this.posX + this.speed, this.endX);
                break;
        }
        this.chip.display(this.posX, this.posY);
        if (this.isAtTarget()) {
            grid.placeChipAt(this.endRow, this.endCol, this.chip);
        }
    }

    isAtTarget() {
        return this.posX === this.endX && this.posY === this.endY;
    }
}

class Grid {
    // TODO: Move grid related constants to constructor
    constructor() {
        this.grid = [];
        for (let row = 0; row < GRID_HEIGHT; row++) {
            this.grid.push([])
            for (let col = 0; col < GRID_WIDTH; col++) {
                this.grid[row].push(null);
            }
        }
        this.computeSizes();
        this.largestChip = null;
    }

    // CRUD Chips

    placeChipAt(row, col, chip) {
        const oldChip = this.getChipAt(row, col);
        this.grid[row][col] = chip
        if (this.largestChip === null || this.largestChip.compare(chip) < 0) {
            this.largestChip = chip;
        }
        return oldChip;
    }

    dropChipInCol(col, chip) {
        for (let row = 0; row < GRID_HEIGHT; row++) {
            if (!this.isFilled(row, col)) {
                movingChips.push(new MovingChip(GRID_HEIGHT, col, row, col, "DOWN", chip, {
                    mergeRow: row,
                    mergeCol: col
                }));
                return true;
            }
        }
        return false;
    }

    getChipAt(row, col) {
        return (row < 0 || row >= GRID_HEIGHT || col < 0 || col >= GRID_WIDTH) ? null : this.grid[row][col];
    }

    getChipAtLeftOf(row, col) {
        return this.getChipAt(row, col - 1);
    }

    getChipAtRightOf(row, col) {
        return this.getChipAt(row, col + 1);
    }

    getChipBelow(row, col) {
        return this.getChipAt(row - 1, col);
    }

    removeChipAt(row, col) {
        if (row < 0 || row >= GRID_HEIGHT || col < 0 || col >= GRID_WIDTH) return undefined;
        const chip = this.getChipAt(row, col);
        this.placeChipAt(row, col, null);
        this.updateLargestChip()
        return chip;
    }

    removeChipAtLeftOf(row, col) {
        return this.removeChipAt(row, col - 1)
    }

    removeChipAtRightOf(row, col) {
        return this.removeChipAt(row, col + 1);
    }

    removeChipBelow(row, col) {
        return this.removeChipAt(row - 1, col);
    }

    isFilled(row, col) {
        return this.getChipAt(row, col) !== null;
    }

    // Grid logic

    getCellCoordinates(row, col) {
        return {
            x: this.gridTopLeftX + CHIP_SIZE * col + CHIP_SIZE / 2,
            y: this.gridTopLeftY + CHIP_SIZE * row + CHIP_SIZE / 2
        }
    }

    updateLargestChip() {
        let largestChip = this.largestChip;
        for (let row = 0; row < GRID_HEIGHT; row++) {
            for (let col = 0; col < GRID_WIDTH; col++) {
                const chip = this.getChipAt(row, col);
                if (chip && (largestChip === null || largestChip.compare(chip) < 0)) {
                    largestChip = chip;
                }
            }
        }
        this.largestChip = largestChip;
    }

    fall() {
        let chipsMoved = false;
        for (let col = 0; col < GRID_WIDTH; col++) {
            for (let row = 0; row < GRID_HEIGHT - 1; row++) {
                if (!this.isFilled(row, col)) {
                    const chip = this.getChipAt(row + 1, col);
                    if (chip !== null) {
                        movingChips.push(new MovingChip(row + 1, col, row, col, "UP", chip));
                        chipsMoved = true;
                    }
                }
            }
        }
        return chipsMoved;
    }

    mergeAll() {
        let chipsMerged = false;
        for (let col = 0; col < GRID_WIDTH; col++) {
            for (let row = 0; row < GRID_HEIGHT; row++) {
                const merged = this.mergeAt(row, col);
                chipsMerged ||= merged;
            }
        }

        if (chipsMerged) {
            this.mergeAll();
        }
    }


    mergeAt(row, col) {
        if (!this.isFilled(row, col)) return false;

        const currentChip = this.getChipAt(row, col);
        const leftChip = this.getChipAtLeftOf(row, col);
        const rightChip = this.getChipAtRightOf(row, col);
        const belowChip = this.getChipBelow(row, col);

        // Merge left right and below
        if (currentChip.equals(leftChip) && currentChip.equals(rightChip) && currentChip.equals(belowChip)) {
            // Combine all three chips into one
            const combinedChip = currentChip
                .combine(leftChip)
                .combine(rightChip)
                .combine(belowChip);

            // Clear all involved cells
            this.removeChipAt(row, col);
            this.removeChipAtLeftOf(row, col);
            this.removeChipAtRightOf(row, col);
            this.removeChipBelow(row, col);

            // Place the combined chip below
            this.placeChipAt(row - 1, col, combinedChip);

            this.fall();
            this.mergeAt(row, col);

            return true;
        }

        // Merge left and below
        if (currentChip.equals(leftChip) && currentChip.equals(belowChip)) {
            const combinedChip = currentChip.combine(leftChip).combine(belowChip);

            this.removeChipAt(row, col);
            this.removeChipAtLeftOf(row, col);
            this.removeChipBelow(row, col);

            this.placeChipAt(row, col, combinedChip);

            this.fall();
            this.mergeAt(row, col);

            return true;
        }

        // Merge right and below
        if (currentChip.equals(rightChip) && currentChip.equals(belowChip)) {
            const combinedChip = currentChip.combine(rightChip).combine(belowChip);

            this.removeChipAt(row, col);
            this.removeChipAtRightOf(row, col);
            this.removeChipBelow(row, col);

            this.placeChipAt(row, col, combinedChip);

            this.fall();
            this.mergeAt(row, col);

            return true;
        }

        // Merge Left and Right
        if (currentChip.equals(leftChip) && currentChip.equals(rightChip)) {
            const combinedChip = currentChip.combine(leftChip).combine(rightChip);

            this.removeChipAt(row, col);
            this.removeChipAtLeftOf(row, col);
            this.removeChipAtRightOf(row, col);

            this.placeChipAt(row, col, combinedChip);

            this.fall();
            this.mergeAt(row, col);

            return true;
        }

        // Merge Right
        if (currentChip.equals(rightChip)) {
            const combinedChip = currentChip.combine(rightChip);

            this.removeChipAtRightOf(row, col);

            this.placeChipAt(row, col, combinedChip);

            this.fall();
            this.mergeAt(row, col);

            return true;
        }

        // Merge Left
        if (currentChip.equals(leftChip)) {
            const combinedChip = currentChip.combine(leftChip);
            this.removeChipAtLeftOf(row, col);

            this.placeChipAt(row, col, combinedChip);

            this.fall();
            this.mergeAt(row, col);

            return true;
        }

        // Merge down
        if (currentChip.equals(belowChip)) {
            const combinedChip = currentChip.combine(belowChip);

            this.removeChipAt(row, col);

            this.placeChipAt(row - 1, col, combinedChip);

            this.fall();
            this.mergeAt(row, col);

            return true;
        }

        return false;
    }

    // Display

    computeSizes() {
        this.width = CHIP_SIZE * GRID_WIDTH;
        this.height = CHIP_SIZE * GRID_HEIGHT;
        this.gridTopLeftX = (width - this.width) / 2;
        this.gridTopLeftY = 0;
    }

    showGrid() {
        fill("red");
        for (let row = 0; row <= GRID_WIDTH; row++) {
            line(this.gridTopLeftX + CHIP_SIZE * row, this.gridTopLeftY, this.gridTopLeftX + CHIP_SIZE * row, this.gridTopLeftY + this.height);
        }
        for (let col = 0; col <= GRID_HEIGHT; col++) {
            line(this.gridTopLeftX, this.gridTopLeftY + CHIP_SIZE * col, this.gridTopLeftX + this.width, this.gridTopLeftY + CHIP_SIZE * col);
        }

        for (let row = 0; row < GRID_HEIGHT; row++) {
            for (let col = 0; col < GRID_WIDTH; col++) {
                if (this.grid[row][col] !== null) {
                    this.grid[row][col].display(this.gridTopLeftX + CHIP_SIZE * col + CHIP_SIZE / 2, this.gridTopLeftY + CHIP_SIZE * row + CHIP_SIZE / 2);
                }
            }
        }
    }

    // Interaction

    getClickedColumn(posX, posY) {
        if (posX < this.gridTopLeftX || posX > this.gridTopLeftX + this.width || posY < this.gridTopLeftY || posY > this.gridTopLeftY + this.height) return -1;
        return Math.floor((posX - this.gridTopLeftX) / CHIP_SIZE);
    }
}

class Chip {
    constructor({baseValue = null, reducedValue = null, suffix = "", level = 1} = {}, posX = null, posY = null) {
        if (baseValue !== null) {
            // If baseValue is provided, compute reducedValue and suffix
            const reduced = this.reduceValueAndSuffix(baseValue);
            this.value = reduced.reducedValue;
            this.suffix = reduced.suffix;
            this.level = this.getPowerOfTwo();
        } else if (reducedValue !== null && suffix !== "") {
            // If reducedValue and suffix are provided, use them directly
            this.value = reducedValue;
            this.suffix = suffix;
            this.level = this.getPowerOfTwo();
        } else {
            this.level = level;
            // If neither is provided, generate a random baseValue
            const reduced = this.reduceValueAndSuffix(this.generateRandomBaseValue());
            this.value = reduced.reducedValue;
            this.suffix = reduced.suffix;
        }

        // Handle position values
        this.posX = posX ?? width / 2;
        this.posY = posY ?? height / 2;
    }

    // Value

    generateRandomBaseValue() {
        // Generates a random value in the range 2^0 to 2^300
        return 2 ** Math.floor(Math.random() * min(this.level, 300));
    }

    getTier() {
        return SUFFIX_WITH_NAME.findIndex(([suffix]) => suffix === this.suffix);
    }

    getFullValue() {
        // Compute full value by reverse scaling
        return this.value * Math.pow(10, this.getTier() * 3);
    }

    // Value logic

    reduceValueAndSuffix(value) {
        const tier = Math.floor(Math.log10(value) / 3);
        if (tier === 0) {
            return {reducedValue: value, suffix: ""};
        }
        const reducedValue = Math.floor(value / Math.pow(10, tier * 3));
        const suffix = SUFFIX_WITH_NAME[tier][0];
        return {reducedValue, suffix};
    }

    getPowerOfTwo() {
        return Math.log2(this.getFullValue());
    }

    // Chip logic

    compare(otherChip) {
        // Compare full values
        if (!otherChip) return 1;
        const difference = this.getFullValue() - otherChip.getFullValue();
        return Math.sign(difference);
    }

    combine(otherChip) {
        // Combine full values and create a new Chip
        const largerChipValue = Math.max(this.getFullValue(), otherChip.getFullValue());
        const combinedValue = largerChipValue * 2;
        return new Chip({baseValue: combinedValue});
    }

    equals(otherChip) {
        if (!otherChip) return false;
        return this.value === otherChip.value && this.suffix === otherChip.suffix;
    }

    // Display

    displayValue() {
        return `${this.value}${this.suffix}`;
    }

    display(x, y) {
        if (x !== undefined) {
            this.posX = x;
        }

        if (y !== undefined) {
            this.posY = y;
        }

        stroke(0);
        fill(120, 80, 100);
        rectMode(CENTER);
        square(this.posX, this.posY, CHIP_SIZE);
        rectMode(CORNER);

        // Calculate font size once
        const displayText = this.displayValue();
        const fontSize = this.getFittingFontSize(displayText);
        fill("white");
        textSize(fontSize);
        rectMode(CENTER);
        textAlign(CENTER, CENTER);
        text(displayText, this.posX, this.posY);
        rectMode(CORNER);
        textAlign(LEFT, BASELINE)
    }

    getFittingFontSize(text) {
        // Dynamically calculates font size using scale factor
        let fontSize = CHIP_SIZE;
        textSize(fontSize);
        while (true) {
            const textWidthScaled = textWidth(text);
            const textHeightScaled = textAscent() + textDescent();
            if (textWidthScaled <= CHIP_SIZE * 0.9 && textHeightScaled <= CHIP_SIZE * 0.9) break;
            fontSize -= 1;
            textSize(fontSize);
        }
        return fontSize;
    }

}

function updateMovingChips() {
    movingChips.forEach(movingChip => {
        movingChip.move();
        if (movingChip.isAtTarget()) {
            const movedChip = movingChips.splice(movingChips.indexOf(movingChip), 1);
            if (movedChip && movedChip[0].mergeRow !== undefined && movedChip[0].mergeCol !== undefined) {
                grid.mergeAt(movedChip[0].mergeRow, movedChip[0].mergeCol);
            }
            grid.mergeAll();
        }
    })
}

function setSizes() {
    const container = document.getElementById('game-container');
    resizeCanvas(container.offsetWidth, container.offsetHeight);
    CHIP_SIZE = container.offsetHeight / 10;
    grid?.computeSizes();
}

function setup() {
    const container = document.getElementById('game-container');
    const canvas = createCanvas(container.offsetWidth, container.offsetHeight);
    canvas.parent('game-container');
    setSizes();

    nextChip = new Chip();
    grid = new Grid();
}

function draw() {
    background(200);
    grid.showGrid();
    nextChip.display(width / 2, height - CHIP_SIZE * 1.5);
    updateMovingChips()
}

function windowResized() {
    setSizes();
}

function handleInput(inputX, inputY) {
    if (!disableInput) {
        disableInput = true;
        const col = grid.getClickedColumn(inputX, inputY);
        if (col !== -1) {
            const chipAdded = grid.dropChipInCol(col, nextChip);
            if (chipAdded) {
                nextChip = new Chip({level: (grid.largestChip?.level || 1)});
            }
        }
        disableInput = false;
    }
}

function mousePressed() {
    handleInput(mouseX, mouseY)
}

function touchStarted() {
    const touch = touches[0];
    if(touch) handleInput(touch.x, touch.y)
}
