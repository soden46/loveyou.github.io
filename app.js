var canvas = document.getElementById("canvas");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Initialize the GL context
var gl = canvas.getContext('webgl');
if(!gl){
  console.error("Unable to initialize WebGL.");
}

//Time
var time = 0.0;

//************** Shader sources **************

var vertexSource = `
attribute vec2 position;
void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

var fragmentSource = `
precision highp float;

uniform float width;
uniform float height;
vec2 resolution = vec2(width, height);

uniform float time;

#define POINT_COUNT 8

vec2 points[POINT_COUNT];
const float speed = -0.5;
const float len = 0.25;
float intensity = 1.3;
float radius = 0.008;

//https://www.shadertoy.com/view/MlKcDD
//Signed distance to a quadratic bezier
float sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C){    
    vec2 a = B - A;
    vec2 b = A - 2.0*B + C;
    vec2 c = a * 2.0;
    vec2 d = A - pos;

    float kk = 1.0 / dot(b,b);
    float kx = kk * dot(a,b);
    float ky = kk * (2.0*dot(a,a)+dot(d,b)) / 3.0;
    float kz = kk * dot(d,a);      

    float res = 0.0;

    float p = ky - kx*kx;
    float p3 = p*p*p;
    float q = kx*(2.0*kx*kx - 3.0*ky) + kz;
    float h = q*q + 4.0*p3;

    if(h >= 0.0){ 
        h = sqrt(h);
        vec2 x = (vec2(h, -h) - q) / 2.0;
        vec2 uv = sign(x)*pow(abs(x), vec2(1.0/3.0));
        float t = uv.x + uv.y - kx;
        t = clamp( t, 0.0, 1.0 );

        // 1 root
        vec2 qos = d + (c + b*t)*t;
        res = length(qos);
    }else{
        float z = sqrt(-p);
        float v = acos( q/(p*z*2.0) ) / 3.0;
        float m = cos(v);
        float n = sin(v)*1.732050808;
        vec3 t = vec3(m + m, -n - m, n - m) * z - kx;
        t = clamp( t, 0.0, 1.0 );

        // 3 roots
        vec2 qos = d + (c + b*t.x)*t.x;
        float dis = dot(qos,qos);
        
        res = dis;

        qos = d + (c + b*t.y)*t.y;
        dis = dot(qos,qos);
        res = min(res,dis);
        
        qos = d + (c + b*t.z)*t.z;
        dis = dot(qos,qos);
        res = min(res,dis);

        res = sqrt( res );
    }
    
    return res;
}


//http://mathworld.wolfram.com/HeartCurve.html
vec2 getHeartPosition(float t){
    return vec2(16.0 * sin(t) * sin(t) * sin(t),
                            -(13.0 * cos(t) - 5.0 * cos(2.0*t)
                            - 2.0 * cos(3.0*t) - cos(4.0*t)));
}

//https://www.shadertoy.com/view/3s3GDn
float getGlow(float dist, float radius, float intensity){
    return pow(radius/dist, intensity);
}

float getSegment(float t, vec2 pos, float offset, float scale){
    for(int i = 0; i < POINT_COUNT; i++){
        points[i] = getHeartPosition(offset + float(i)*len + fract(speed * t) * 6.28);
    }
    
    vec2 c = (points[0] + points[1]) / 2.0;
    vec2 c_prev;
    float dist = 10000.0;
    
    for(int i = 0; i < POINT_COUNT-1; i++){
        //https://tinyurl.com/y2htbwkm
        c_prev = c;
        c = (points[i] + points[i+1]) / 2.0;
        dist = min(dist, sdBezier(pos, scale * c_prev, scale * points[i], scale * c));
    }
    return max(0.0, dist);
}

void main(){
    vec2 uv = gl_FragCoord.xy/resolution.xy;
    float widthHeightRatio = resolution.x/resolution.y;
    vec2 centre = vec2(0.5, 0.5);
    vec2 pos = centre - uv;
    pos.y /= widthHeightRatio;
    //Shift upwards to centre heart
    pos.y += 0.02;
    float scale = 0.000015 * height;
    
    float t = time;
    
    //Get first segment
  float dist = getSegment(t, pos, 0.0, scale);
  float glow = getGlow(dist, radius, intensity);
  
  vec3 col = vec3(0.0);

    //White core
  col += 10.0*vec3(smoothstep(0.003, 0.001, dist));
  //Pink glow
  col += glow * vec3(1.0,0.05,0.3);
  
  //Get second segment
  dist = getSegment(t, pos, 3.4, scale);
  glow = getGlow(dist, radius, intensity);
  
  //White core
  col += 10.0*vec3(smoothstep(0.003, 0.001, dist));
  //Blue glow
  col += glow * vec3(0.1,0.4,1.0);
        
    //Tone mapping
    col = 1.0 - exp(-col);

    //Gamma
    col = pow(col, vec3(0.4545));

    //Output to screen
     gl_FragColor = vec4(col,1.0);
}
`;

//************** Utility functions **************

window.addEventListener('resize', onWindowResize, false);

function onWindowResize(){
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform1f(widthHandle, window.innerWidth);
  gl.uniform1f(heightHandle, window.innerHeight);
}


//Compile shader and combine with source
function compileShader(shaderSource, shaderType){
  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
      throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
  }
  return shader;
}

//From https://codepen.io/jlfwong/pen/GqmroZ
//Utility to complain loudly if we fail to find the attribute/uniform
function getAttribLocation(program, name) {
  var attributeLocation = gl.getAttribLocation(program, name);
  if (attributeLocation === -1) {
      throw 'Cannot find attribute ' + name + '.';
  }
  return attributeLocation;
}

function getUniformLocation(program, name) {
  var attributeLocation = gl.getUniformLocation(program, name);
  if (attributeLocation === -1) {
      throw 'Cannot find uniform ' + name + '.';
  }
  return attributeLocation;
}

//************** Create shaders **************

//Create vertex and fragment shaders
var vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
var fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

//Create shader programs
var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

gl.useProgram(program);

//Set up rectangle covering entire canvas 
var vertexData = new Float32Array([
  -1.0,  1.0,     // top left
  -1.0, -1.0,     // bottom left
   1.0,  1.0,     // top right
   1.0, -1.0,     // bottom right
]);

//Create vertex buffer
var vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

// Layout of our data in the vertex buffer
var positionHandle = getAttribLocation(program, 'position');

gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle,
  2,                 // position is a vec2 (2 values per component)
  gl.FLOAT, // each component is a float
  false,         // don't normalize values
  2 * 4,         // two 4 byte float components per vertex (32 bit float is 4 bytes)
  0                 // how many bytes inside the buffer to start from
  );

//Set uniform handle
var timeHandle = getUniformLocation(program, 'time');
var widthHandle = getUniformLocation(program, 'width');
var heightHandle = getUniformLocation(program, 'height');

gl.uniform1f(widthHandle, window.innerWidth);
gl.uniform1f(heightHandle, window.innerHeight);

var lastFrame = Date.now();
var thisFrame;

function draw(){
    
  //Update time
    thisFrame = Date.now();
  time += (thisFrame - lastFrame)/1000;    
    lastFrame = thisFrame;

    //Send uniforms to program
  gl.uniform1f(timeHandle, time);
  //Draw a triangle strip connecting vertices 0-4
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(draw);
}

draw();
const qs = document.querySelector.bind(document);
const easingHeart = mojs.easing.path('M0,100C2.9,86.7,33.6-7.3,46-7.3s15.2,22.7,26,22.7S89,0,100,0');

const el = {
  container: qs('.mo-container'),
  
  i: qs('.lttr--I'),
  l: qs('.lttr--L'),
  o: qs('.lttr--O'),
  v: qs('.lttr--V'),
  e: qs('.lttr--E'),
  y: qs('.lttr--Y'),
  o2: qs('.lttr--O2'),
  u: qs('.lttr--U'),
  
  lineLeft: qs('.line--left'),
  lineRight: qs('.line--rght'),
  
  colTxt: "#763c8c",
  colHeart: "#fa4843",
  
  blup: qs('.blup'),
  blop: qs('.blop'),
  sound: qs('.sound')
};

class Heart extends mojs.CustomShape {
  getShape() {
    return '<path d="M50,88.9C25.5,78.2,0.5,54.4,3.8,31.1S41.3,1.8,50,29.9c8.7-28.2,42.8-22.2,46.2,1.2S74.5,78.2,50,88.9z"/>';
  }
  getLength () { return 200; }
}
mojs.addShape('heart', Heart);

const crtBoom = (delay = 0, x = 0, rd = 46) => {
  parent = el.container;
  const crcl = new mojs.Shape({
    shape:        'circle',
    fill:         'none',
    stroke:        el.colTxt,
    strokeWidth:  { 5 : 0 },
    radius:       { [rd] : [rd + 20] },
    easing:       'quint.out',
    duration:     500 / 3,
    parent,
    delay,
    x
  });
  
  const brst = new mojs.Burst({
    radius:       { [rd + 15] : 110 },
    angle:        'rand(60, 180)',
    count:        3,
    timeline:     { delay },
    parent,
    x,
    children: {
      radius:       [5, 3, 7],
      fill:         el.colTxt,
      scale:        { 1: 0, easing: 'quad.in' },
      pathScale:    [ .8, null ],
      degreeShift:  [ 'rand(13, 60)', null ],
      duration:     1000 / 3,
      easing:       'quint.out'
    }
  });
  
  return [crcl, brst];
};

const crtLoveTl = () => {
  const move        = 1000;
  const boom        = 200;
  const easing      = 'sin.inOut';
  const easingBoom  = 'sin.in';
  const easingOut   = 'sin.out';
  const opts        = { duration: move, easing, opacity: 1 };
  const delta       = 150;
  
  return (new mojs.Timeline).add([
    new mojs.Tween({
      duration: move,
      onStart: () => {
        [el.i, el.l, el.o, el.v, el.e, el.y, el.o2, el.u].forEach(el => {
          el.style.opacity = 1;
          el.style = 'transform: translate(0px, 0px) rotate(0deg) skew(0deg, 0deg) scale(1, 1); opacity: 1;'
        })
      },
      onComplete: () => {
        [el.l, el.o, el.v, el.e].forEach(el => el.style.opacity = 0);
        el.blop.play();
      }
    }),
    
    new mojs.Tween({
      duration: move * 2 + boom,
      onComplete: () => {
        [el.y, el.o2].forEach(el => el.style.opacity = 0);
        el.blop.play();
      }
    }),
  
    new mojs.Tween({
      duration: move * 3 + boom * 2 - delta,
      onComplete: () => { 
        el.i.style.opacity = 0;
        el.blop.play();
      }
    }),
  
    new mojs.Tween({
      duration: move * 3 + boom * 2,
      onComplete: () => { 
        el.u.style.opacity = 0; 
        el.blup.play();
      }
    }),
  
    new mojs.Tween({
      duration: 50,
      delay: 4050,
      onUpdate: (progress) => {
        [el.i, el.l, el.o, el.v, el.e, el.y, el.o2, el.u].forEach(el => {
          el.style = `transform: translate(0px, 0px) rotate(0deg) skew(0deg, 0deg) scale(1, 1); opacity: ${1 * progress};`
        })
      },
      onComplete: () => {
        [el.i, el.l, el.o, el.v, el.e, el.y, el.o2, el.u].forEach(el => {
          el.style.opacity = 1;
          el.style = 'transform: translate(0px, 0px) rotate(0deg) skew(0deg, 0deg) scale(1, 1); opacity: 1;'
        })
      }
    }),
    
    new mojs.Html({
      ...opts,
      el: el.lineLeft,
      x: { 0 : 52 },
    }).then({
      duration: boom + move,
      easing,
      x: { to : 52 + 54 }
    }).then({
      duration: boom + move,
      easing,
      x: { to : 52 + 54 + 60 }
    }).then({
      duration: 150, // 3550
      easing,
      x: { to : 52 + 54 + 60 + 10 }
    }).then({
      duration: 300
    }).then({
      duration: 350,
      x: { to : 0 },
      easing: easingOut
    }),
    
    new mojs.Html({
      ...opts,
      el: el.lineRight,
      x: { 0 : -52 },
    }).then({
      duration: boom + move,
      easing,
      x: { to : -52 - 54 }
    }).then({
      duration: boom + move,
      easing,
      x: { to : -52 - 54 - 60 }
    }).then({
      duration: 150,
      easing,
      x: { to : -52 - 54 - 60 - 10 }
    }).then({
      duration: 300
    }).then({
      duration: 350,
      x: { to : 0 },
      easing: easingOut,
    }),
    
    new mojs.Html({ // [I] LOVE YOU
      ...opts,
      el: el.i,
      x: { 0 : 34 },
    }).then({
      duration: boom,
      easing: easingBoom,
      x: { to : 34 + 19 }
    }).then({
      duration: move,
      easing,
      x: { to : 34 + 19 + 40 }
    }).then({
      duration: boom,
      easing: easingBoom,
      x: { to : 34 + 19 + 40 + 30 }
    }).then({
      duration: move,
      easing,
      x: { to : 34 + 19 + 40 + 30 + 30 }
    }),
    
    new mojs.Html({ // I [L]OVE YOU
      ...opts,
      el: el.l,
      x: { 0 : 15 },
    }),
    
    new mojs.Html({ // I L[O]VE YOU
      ...opts,
      el: el.o,
      x: { 0 : 11 },
    }),
    
    new mojs.Html({ // I LO[V]E YOU
      ...opts,
      el: el.v,
      x: { 0 : 3 },
    }),
    
    new mojs.Html({ // I LOV[E] YOU
      ...opts,
      el: el.e,
      x: { 0 : -3 },
    }),
    
    new mojs.Html({ // I LOVE [Y]OU
      ...opts,
      el: el.y,
      x: { 0 : -20 },
    }).then({
      duration: boom,
      easing: easingBoom,
      x: { to : -20 - 33}
    }).then({
      duration: move,
      easing,
      x: { to : -20 - 33 - 24 }
    }),
    
    new mojs.Html({ // I LOVE Y[O]U
      ...opts,
      el: el.o2,
      x: { 0 : -27 },
    }).then({
      duration: boom,
      easing: easingBoom,
      x: { to : -27 - 27}
    }).then({
      duration: move,
      easing,
      x: { to : -27 - 27 - 30 }
    }),
    
    new mojs.Html({ // I LOVE YO[U]
      ...opts,
      el: el.u,
      x: { 0 : -32 },
    }).then({
      duration: boom,
      easing: easingBoom,
      x: { to : -32 - 21}
    }).then({
      duration: move,
      easing,
      x: { to : -32 - 21 - 36 }
    }).then({
      duration: boom,
      easing: easingBoom,
      x: { to : -32 - 21 - 36 - 31 }
    }).then({
      duration: move,
      easing,
      x: { to : -32 - 21 - 36 - 31 - 27 }
    }),
    
    new mojs.Shape({
      parent: el.container,
      shape: 'heart',
      delay: move,
      fill: el.colHeart,
      x: -64,
      scale: { 0 : 0.95, easing: easingHeart },
      duration: 500
    }).then({
      x: { to : -62, easing },
      scale: { to : 0.65, easing },
      duration: boom + move - 500,
    }).then({
      duration: boom - 50,
      x: { to: -62 + 48 },
      scale: { to : 0.90 },
      easing: easingBoom
    }).then({
      duration:  125,
      scale: { to : 0.8 },
      easing: easingOut
    }).then({
      duration:  125,
      scale: { to : 0.85 },
      easing: easingOut
    }).then({
      duration: move - 200,
      scale: { to : 0.45 },
      easing
    }).then({
      delay: -75,
      duration: 150,
      x: { to: 0 },
      scale: { to : 0.90 },
      easing: easingBoom
    }).then({
      duration:  125,
      scale: { to : 0.8 },
      easing: easingOut
    }).then({
      duration:  125, // 3725
      scale: { to : 0.85 },
      easing: easingOut
    }).then({
      duration: 125, // 3850
    }).then({
      duration: 350,
      scale: { to : 0 },
      easing: easingOut
    }),
    
    ...crtBoom(move, -64, 46),
    ...crtBoom(move * 2 + boom, 18, 34),
    ...crtBoom(move * 3 + boom * 2 - delta, -64, 34),
    ...crtBoom(move * 3 + boom * 2, 45, 34)
  ]);
};

const loveTl = crtLoveTl().play();
setInterval(() => { loveTl.replay() }, 4300);

const volume = 0.2;
el.blup.volume = volume;
el.blop.volume = volume;

const toggleSound = () => {
  let on = true;
  return () => {
    if (on) {
      el.blup.volume = 0.0;
      el.blop.volume = 0.0;
      el.sound.classList.add('sound--off')
    }
    else {
      el.blup.volume = volume;
      el.blop.volume = volume;
      el.sound.classList.remove('sound--off')
    }
    on = !on;
  }
}
el.sound.addEventListener('click', toggleSound());

class TextDesintegrator {
  constructor(el, options) {
    const defaultOptions = {
      padding: 160,
      density: 4,
      duration: 2500 // in ms
    };
    this.step = 0;
    this.count = 0;
    this.data = [];
    this.scale = 2; // pixel density
    this.el = el;
    this.el.style.position = "relative";
    this.el.innerHTML = `<span class="td-wrapper">${this.el.textContent}</span>`;
    this.inner = this.el.querySelector("span");
    this.options = { ...defaultOptions, ...options };
    this.reverse = false;
    // copy el to canvas

    document.fonts.ready.then(() => {
      this.createCanvas();
      this.fillCanvas();
      this.pixelize();
      setTimeout(() => {
        this.start();
      }, 0);
    });
  }
  createCanvas() {
    // get the width and the height of the span element
    // canvas will have the same dimensions
    const { width, height } = this.el.getBoundingClientRect();
    this.height = height;
    this.width = width;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.scale * (this.width + 2 * this.options.padding);
    this.canvas.height = this.scale * (this.height + 2 * this.options.padding);
    this.canvas.style.width = `${this.width + 2 * this.options.padding}px`;
    this.canvas.style.height = `${this.height + 2 * this.options.padding}px`;
    this.canvas.style.transform = `translate3d(${-this.options
      .padding}px, ${-this.options.padding}px, 0)`;
    this.context = this.canvas.getContext("2d");
    this.context.scale(this.scale, this.scale);
    this.el.append(this.canvas);
  }
  clearContext() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  fillCanvas() {
    const style = getComputedStyle(this.el);
    this.color = style.getPropertyValue("color");
    this.context.fillStyle = this.color;
    this.context.font = style.getPropertyValue("font");
    this.context.textBaseline = "ideographic";
    this.context.fillText(
      this.el.textContent,
      this.options.padding,
      (this.canvas.height / this.scale + this.height) / 2
    );
  }
  start() {
    this.t0 = 0;
    this.id = window.requestAnimationFrame((t) => this.render(t));
  }
  stop() {
    if (this.id) {
      window.cancelAnimationFrame(this.id);
    }
  }
  pixelize() {
    const { padding, density, duration } = this.options;
    for (
      let y = 0;
      y < this.canvas.height + 2 * padding - Math.floor(density / 2);
      y += density
    ) {
      for (
        let x = 0;
        x < this.canvas.width + 2 * padding - Math.floor(density / 2);
        x += density
      ) {
        const { data } = this.context.getImageData(
          x + Math.floor(density / 4),
          y + Math.floor(density / 4),
          1,
          1
        );
        const [, , , a] = data;
        if (a > 0) {
          this.data.push({
            alpha: a / 255,
            longevity: Math.min(
              duration * 0.25 + Math.random() * duration * 0.75,
              duration - 1
            ),
            x,
            y,
            initialX: x,
            initialY: y,
            finalX: x + 2 * (Math.random() - 0.5) * this.canvas.width,
            finalY: y + 2 * (Math.random() - 0.5) * this.canvas.width
          });
        }
      }
    }
  }

  render(timestamp) {
    if (!this.t0) {
      this.t0 = timestamp;
    }
    const elapsed = timestamp - this.t0;
    if (this.step < Math.min(500, this.options.duration * 0.5)) {
      if (this.reverse) {
        this.inner.classList.remove("td-hide");
      } else {
        this.inner.classList.add("td-hide");
      }
    }
    this.updateData();
    this.clearContext();
    for (const sq of this.data) {
      this.context.globalAlpha = sq.alpha;
      this.context.fillStyle = this.color;
      this.context.fillRect(
        sq.x / 2,
        sq.y / 2,
        this.options.density / 2,
        this.options.density / 2
      );
    }
    this.step = this.reverse ? this.options.duration - elapsed : elapsed;
    if (elapsed > this.options.duration) {
      this.onComplete();
    }
    this.id = requestAnimationFrame((t) => this.render(t));
  }
  onComplete() {
    this.reverse = !this.reverse;
    this.t0 = 0;
  }
  updateData() {
    for (const sq of this.data) {
      sq.alpha = this.calculateOpacity(sq.longevity, this.step);
      sq.x = this.calculatePosition(
        sq.initialX,
        sq.finalX,
        sq.longevity,
        this.step
      );
      sq.y = this.calculatePosition(
        sq.initialY,
        sq.finalY,
        sq.longevity,
        this.step
      );
    }
  }
  calculatePosition(xS, xE, l, x) {
    const expo = (l, x) => {
      return x < l ? 1 - Math.pow(2, 10 * (x / l) - 10) : 0;
    };
    const val = (xS - xE) * expo(l, x) + xE;
    return val;
  }
  calculateOpacity(l, x) {
    return x <= l ? 1 - Math.pow(x / l, 1) : 0;
  }
}

const h1 = document.querySelectorAll("h1 span");

h1.forEach((el) => new TextDesintegrator(el));
