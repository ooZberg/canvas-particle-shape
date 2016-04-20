// ---------------------------------------------------
// Animated particle visualization using HTML5 canvas
// Copyright (c) 2016 John Åsberg
// ---------------------------------------------------

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
		  window.webkitRequestAnimationFrame ||
		  window.mozRequestAnimationFrame    ||
		  window.oRequestAnimationFrame      ||
		  window.msRequestAnimationFrame     ||
		  function( callback ){
			window.setTimeout(callback, 1000 / 30);
		  };
})();

// check if we can use html5 canvas
function isCanvasSupported(){
  var elem = document.createElement('canvas');
  return !!(elem.getContext && elem.getContext('2d'));
}

// variables
var	particles = [],
  minDist,
  dist,
  mouseX, mouseY,
  W, H, scale,
  particleCount = 0;


function updateCanvasSize(){
    // get the dimensions of the viewport
    W = window.innerWidth ||
        document.documentElement.clientWidth ||
        document.body.clientWidth;
    H = window.innerHeight ||
        document.documentElement.clientHeight ||
        document.body.clientHeight;

    // set the canvas width and height to occupy full window
    canvas.width = W;
    canvas.height = H;

    // scale factor for acceleration/velocity to adapt to different screens
    scale = Math.max(800,W)/1200;
    particleCount = 150*scale;
    minDist = 70*scale;
}

// make it responsive
window.onresize = updateCanvasSize;

if (isCanvasSupported()) {
  // get canvas
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  updateCanvasSize();
}

function mouseMove(evt) {
  var rect = canvas.getBoundingClientRect();
  mouseX = evt.clientX - rect.left;
  mouseY = evt.clientY - rect.top;
}

function touchMove(evt) {
  var rect = canvas.getBoundingClientRect();
  mouseX = evt.targetTouches[0].pageX - rect.left;
  mouseY = evt.targetTouches[0].pageY - rect.top;
}

// add events to interact with particles
window.addEventListener('mousemove', mouseMove, false);
window.addEventListener('touchstart', touchMove, false);
window.addEventListener('touchmove', touchMove, false);
window.addEventListener('touchend', touchMove, false);

// prevent elastic scrolling
window.addEventListener('touchmove', function (event) {
  event.preventDefault();
}, false);



// this is the function that describes where the particles should be located
// it is easy to replace sinus with something else to make it different
function shape(t) {
  var x = t * W;
  var y = H * 0.5 + Math.sin(x/W*6)*H*0.3;
  return {x: x, y: y};
}

// caluclate the target position based on the shape
function targetPos(p) {
  var s = shape(p.t);
  var offs = p.r;
  var vinv = 1/(p.vx*p.vx + p.vy*p.vy);
  s.x += p.vx*p.vx*vinv * offs * 80;
  s.y += p.vy*p.vy*vinv * offs * 80;
  return s;
}

// the particle object that is moved around on the screen
function Particle(t) {

  // parameter t (position and speed within shape)
  this.t = t;
  this.vt = (Math.random() + 0.2) * 1e-3 * scale;

  // use parameter r to specify relative position to t
  this.r = Math.random();

  // put along the shape
  var pos = shape(this.t);
  this.x = pos.x + (Math.random() - 0.5) * 100 * scale;
	this.y = pos.y + (Math.random() - 0.5) * 100 * scale;

	// add random start velocity
	this.vx = (Math.random() - 0.5) * 0.2 * scale;
	this.vy = (Math.random() - 0.5) * 0.2 * scale;

	this.radius = 4;

	this.draw = function() {
		ctx.fillStyle = "white";
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
		ctx.fill();
	};
}

// create a bunch of particles
for(var i = 0; i < particleCount; i++) {
  particles.push(new Particle(i/particleCount-1));
}


// make the particles move
function updateParticleMotion() {

	// In this function, we are first going to update every
	// particle's position according to their velocities
	for (var i = particles.length - 1; i >= 0; i--) {
		p = particles[i];

		// update the velocities
		p.x += p.vx * scale;
		p.y += p.vy * scale;

    var p2 = targetPos(p);

    // calculate the vector to target position
    var dx = p.x - p2.x,
      dy = p.y - p2.y;
    var dist2 = dx*dx + dy*dy;
    var ax = 0, ay = 0;

    // if particle is far away from target pos, accelerat in right direction
    if (dist2 > 20*20*scale*scale) {
      ax = dx*1e-3;
      ay = dy*1e-3;
    }

    // reject mouse
    dx = p.x - mouseX;
    dy = p.y - mouseY;
    dist2 = dx*dx + dy*dy;
    if (dist2 < 50*50*scale*scale) {
      ax -= dx*1e-1;
      ay -= dy*1e-1;
    }

		// apply acceleration
		p.vx -= ax;
		p.vy -= ay;

    // slow down particle
    p.vx *= 0.95;
    p.vy *= 0.95;

    // move particle in shape
    p.t += p.vt;
    if (p.t > 1.1) {
      p.t = -0.1;
      var pos = targetPos(p);
      p.x = pos.x;
      p.y = pos.y;

      // check particle count
      if (particles.length > particleCount) {
        // remove current particle
        particles.splice(i, 1);
      } else if (particles.length < particleCount) {
        particles.push(new Particle(-0.1));
      }
    }

	}
}

function renderBackground() {

  // make a diagonal gradiant
  var my_gradient = ctx.createLinearGradient(0,0,W,H);
  my_gradient.addColorStop(0, "#e54fff");
  my_gradient.addColorStop(1, "#1f57ff");
  ctx.fillStyle = my_gradient;

	ctx.fillRect(0,0,W,H);
}

// render everything inclueded on the canvas
function renderFrame() {

	// clear canvas
	renderBackground();

	// draw particles
	for (var i = 0; i < particles.length; i++) {
		p = particles[i];
		p.draw();

    // draw connecting lines
    for(var j = i + 1; j < particles.length; j++) {
      p2 = particles[j];
      drawConnectingLine(p, p2);
    }
	}

	// update motion
	updateParticleMotion();
}

// draw line between particles, depending on distance
function drawConnectingLine(p1, p2) {
	var dist,
		dx = p1.x - p2.x,
		dy = p1.y - p2.y;

	var dist2 = dx*dx + dy*dy;

	// draw the line when distance is smaller
	if(dist2 <= minDist*minDist) {

		// draw the line
		ctx.beginPath();
		ctx.strokeStyle = "rgba(255,255,255,"+ (1.2-dist2/(minDist*minDist)) +")";
    ctx.lineWidth = 1;
		ctx.moveTo(p1.x, p1.y);
		ctx.lineTo(p2.x, p2.y);
		ctx.stroke();
		ctx.closePath();
	}
}

// start the main animation loop using requestAnimFrame
function renderLoop() {
	renderFrame();
	requestAnimFrame(renderLoop);
}

// start animation if canvas is supported
if (isCanvasSupported()) {
  renderLoop();
}
