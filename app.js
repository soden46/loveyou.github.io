const $canvas = document.getElementById('canvas');

const context = $canvas.getContext("2d");

const $path = document.createElementNS("http://www.w3.org/2000/svg", "path");
$path.setAttribute(
  "d",
  "M155,205 l-45,-45 a31.8198,31.8198,0 1 1 45,-45 a31.8198,31.8198,0 1 1 45,45 z"
);

const totalLength = $path.getTotalLength();

const path = new Path2D($path.getAttribute("d"));

globalThis.direction = 1;

render();
function render(length = 0) {
  context.clearRect(0, 0, 512, 512);
  
  const scale = length / totalLength;

  context.beginPath();
  context.setLineDash([length, totalLength]);
  context.lineWidth = scale * 5;
  context.setTransform(scale, 0, 0, scale, (1 - scale) * 130, (1 - scale) * 130);
  context.stroke(path);

  requestAnimationFrame(() => {
    render(length + totalLength / 100 * globalThis.direction);
    
    if (length < 0 && globalThis.direction === -1) {
      globalThis.direction = +1;
    }
    if (length > totalLength && globalThis.direction === 1) {
      globalThis.direction = -1;
    }
  });
}
