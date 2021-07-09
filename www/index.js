import { Universe3D, Cell } from "wasm-game-of-life";
import { memory } from "wasm-game-of-life/wasm_game_of_life_bg";
import { OrbitControls } from "three";
import * as THREE from 'three'
import { Color } from "three";

const CELL_SIZE = 2; // px
const GRID_COLOR = "#CCCCCC";
const DEAD_COLOR = "#FFFFFF";
const ALIVE_COLOR = "#000000";

// Construct the universe, and get its width and height.
const universe = Universe3D.new();
const width = universe.width();
const height = universe.height();
const depth = universe.depth();

// Give the canvas room for all of our cells and a 1px border
// around each of them.
const canvas = document.getElementById("game-of-life-canvas");
const rootDiv = document.getElementById("three-stuff")
canvas.height = (CELL_SIZE + 1) * height + 1;
canvas.width = (CELL_SIZE + 1) * width + 1;

const ctx = canvas.getContext('2d');

const threeRenderer = new THREE.WebGLRenderer({antialias: true});
threeRenderer.domElement.width = 600;
threeRenderer.domElement.height = 500;
threeRenderer.setViewport(0, 0, 600, 500)
const threeScene = new THREE.Scene();
const threeCamera = new THREE.PerspectiveCamera();
threeScene.background = new THREE.Color("white")
const controls = new OrbitControls(threeCamera, threeRenderer.domElement)
threeCamera.position.set(height / 2, width / 2, 50)
threeCamera.lookAt(height / 2, width / 2, 0);


console.log("creating cubes", height, width, depth)
const cubeRows = new Array();
for(var i = 0; i < height; i++){
  const cubeCol = new Array();
  for (var j = 0; j < width; j++){
    const cubeRow = new Array();
    for (var k = 0; k < depth; k++){
      const cubeGeo = new THREE.BoxBufferGeometry(.5, .5, .5);
      const cubeMesh = new THREE.Mesh(cubeGeo, new THREE.MeshBasicMaterial({color: "purple"}));
      cubeMesh.position.set(i, j, k);

      threeScene.add(cubeMesh);
      cubeRow.push(cubeMesh);
    }
    cubeCol.push(cubeRow)
  }
  cubeRows.push(cubeCol)
}
console.log("cubes created")


rootDiv.appendChild(threeRenderer.domElement);

threeRenderer.render(threeScene, threeCamera)
  

const fps = new class {
  constructor() {
    this.fps = document.getElementById("fps");
    this.frames = [];
    this.lastFrameTimeStamp = performance.now();
  }

  render() {
    // Convert the delta time since the last frame render into a measure
    // of frames per second.
    const now = performance.now();
    const delta = now - this.lastFrameTimeStamp;
    this.lastFrameTimeStamp = now;
    const fps = 1 / delta * 1000;

    // Save only the latest 100 timings.
    this.frames.push(fps);
    if (this.frames.length > 100) {
      this.frames.shift();
    }

    // Find the max, min, and mean of our 100 latest timings.
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (let i = 0; i < this.frames.length; i++) {
      sum += this.frames[i];
      min = Math.min(this.frames[i], min);
      max = Math.max(this.frames[i], max);
    }
    let mean = sum / this.frames.length;

    // Render the statistics.
    this.fps.textContent = `
Frames per Second:
         latest = ${Math.round(fps)}
avg of last 100 = ${Math.round(mean)}
min of last 100 = ${Math.round(min)}
max of last 100 = ${Math.round(max)}
`.trim();
  }
};

let animationId = null;

const renderLoop = () => {
  fps.render();

  controls.update();
  drawGridThree();
  drawCellsThree();
  // drawGridCanvas();
  // drawCellsCanvas();
  threeRenderer.render(threeScene, threeCamera)

  for (let i = 0; i < 9; i++) {
    universe.tick();
  }

  animationId = requestAnimationFrame(renderLoop);
};

const isPaused = () => {
  return animationId === null;
};

const playPauseButton = document.getElementById("play-pause");

const play = () => {
  playPauseButton.textContent = "⏸";
  renderLoop();
};

const pause = () => {
  playPauseButton.textContent = "▶";
  cancelAnimationFrame(animationId);
  animationId = null;
};

playPauseButton.addEventListener("click", event => {
  if (isPaused()) {
    play();
  } else {
    pause();
  }
});


const drawGridThree = () => {
  // no op
}

const drawGridCanvas = () => {
  ctx.beginPath();
  ctx.strokeStyle = GRID_COLOR;

  // Vertical lines.
  for (let i = 0; i <= width; i++) {
    ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
    ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
  }

  // Horizontal lines.
  for (let j = 0; j <= height; j++) {
    ctx.moveTo(0,                           j * (CELL_SIZE + 1) + 1);
    ctx.lineTo((CELL_SIZE + 1) * width + 1, j * (CELL_SIZE + 1) + 1);
  }

  ctx.stroke();
};

const getIndex = (row, column, lan) => {
  return row * width + column * height + lan;
};

console.log(cubeRows[0][0][0].material.color)


const blue = new Color("blue");
const purple = new Color("purple");
const orange = new Color("orange");
const red = new Color("red");

const drawCellsThree = () => {
  const cellsPtr = universe.cells();
  const cells = new Uint8Array(memory.buffer, cellsPtr, width * height);
  const adjacentCountsPtr = universe.adjacent_counts();
  const adjacentCounts = new Uint8Array(memory.buffer, cellsPtr, width * height);
  
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      for (let lan = 0; lan < depth; lan++){
        const idx = getIndex(row, col, lan);
        if (cells[idx] !== Cell.Alive) {
          cubeRows[row][col][lan].visible = false;
          continue;
        }
        else { 
          // console.log(adjacentCounts[idx])
          cubeRows[row][col][lan].material.color = 
            adjacentCounts[idx] === 1 ? 
              blue : 
              (adjacentCounts[idx] === 2 ?
                purple :
                (adjacentCounts[idx] === 3 ?
                  orange :
                  red
                )
              )
          cubeRows[row][col][lan].visible = true;
        }
      }
    }
  } 
}

const drawCellsCanvas = () => {
  const cellsPtr = universe.cells();
  const cells = new Uint8Array(memory.buffer, cellsPtr, width * height);

  ctx.beginPath();

  // Alive cells.
  ctx.fillStyle = ALIVE_COLOR;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = getIndex(row, col);
      if (cells[idx] !== Cell.Alive) {
        continue;
      }

      ctx.fillRect(
        col * (CELL_SIZE + 1) + 1,
        row * (CELL_SIZE + 1) + 1,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  // Dead cells.
  ctx.fillStyle = DEAD_COLOR;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = getIndex(row, col);
      if (cells[idx] !== Cell.Dead) {
        continue;
      }

      ctx.fillRect(
        col * (CELL_SIZE + 1) + 1,
        row * (CELL_SIZE + 1) + 1,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  ctx.stroke();
};

canvas.addEventListener("click", event => {
  const boundingRect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / boundingRect.width;
  const scaleY = canvas.height / boundingRect.height;

  const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
  const canvasTop = (event.clientY - boundingRect.top) * scaleY;

  const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
  const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);

  universe.toggle_cell(row, col);

  drawCellsCanvas();
  drawGridCanvas();
});

play();
