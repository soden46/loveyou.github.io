var canvas = document.getElementById("myCanvas");
var context = canvas.getContext('2d');
var i = 0; j = 0.1, t = 0;
var col = new Array('green', 'blue', 'red', 'cyan', 'magenta', 'yellow
function timing() {
t = t + 1;
i = i + j;
if (t > 5) { t = 0; }
//var r=Math.pow(10000*Math.cos(2*i),0.5);
var x = 250 + 160*Math.sin(i)*Math.sin(i)*Math.sin(i); var y = -(-170+ 10*(13*Math.cos(i)- 5*Math.cos(2*i) - 2*Math.cos(3*i) - Math.cos(4*i)));
//context.font="40px Georgia";
//context.textAlign='center';
//context.fillText('.',x,y);
//context.fillStyle='purple';
context.beginPath();
context.moveTo(250, 200);
context.lineTo(x, y);
context.lineCap = 'round';
context.strokeStyle = 'rgba(0,0,255,0.6)';
context.stroke();
context.beginPath();
context.moveTo(250, 200
context.arc(x, y, 8, 0, 2 * Math.PI);
context.fillStyle = col[t];
context.fill();
if (i > 6.5) { j = -0.1; context.clearRect(0, 0, 500, 400); }
if (i < -0.1) { j = 0.1; context.clearRect(0, 0, 500, 400);
}
window.setInterval('timing()', 300)
