// Simple Pong game
(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const playerScoreEl = document.getElementById('playerScore');
  const cpuScoreEl = document.getElementById('cpuScore');

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  // Paddles
  const PADDLE_WIDTH = 12;
  const PADDLE_HEIGHT = 100;
  const PADDLE_MARGIN = 10;

  const player = {
    x: PADDLE_MARGIN,
    y: (HEIGHT - PADDLE_HEIGHT) / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: 6,
    dy: 0
  };

  const cpu = {
    x: WIDTH - PADDLE_WIDTH - PADDLE_MARGIN,
    y: (HEIGHT - PADDLE_HEIGHT) / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: 4
  };

  // Ball
  const ball = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    radius: 8,
    speed: 6,
    dx: 0,
    dy: 0
  };

  let playerScore = 0;
  let cpuScore = 0;
  let running = true;
  let lastTime = 0;
  let serveTimeout = null;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function resetBall(winner) {
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    ball.speed = 6;
    const dir = winner === 'player' ? 1 : -1;
    // randomize angle a bit
    const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8); // -22.5 to 22.5 degrees
    ball.dx = dir * ball.speed * Math.cos(angle);
    ball.dy = ball.speed * Math.sin(angle);

    // briefly pause before serve
    running = false;
    if (serveTimeout) clearTimeout(serveTimeout);
    serveTimeout = setTimeout(() => { running = true; }, 700);
  }

  function serveRandom() {
    // start with random direction
    const dir = Math.random() < 0.5 ? -1 : 1;
    const angle = (Math.random() * Math.PI / 3) - (Math.PI / 6); // -30 to 30
    ball.dx = dir * ball.speed * Math.cos(angle);
    ball.dy = ball.speed * Math.sin(angle);
  }

  // Initialize
  (function init() {
    serveRandom();
  })();

  // Input - mouse control
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    // center paddle on mouse
    player.y = clamp(mouseY - player.height / 2, 0, HEIGHT - player.height);
  });

  // Input - keyboard
  const keys = { ArrowUp: false, ArrowDown: false };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp') keys.ArrowUp = true;
    if (e.code === 'ArrowDown') keys.ArrowDown = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp') keys.ArrowUp = false;
    if (e.code === 'ArrowDown') keys.ArrowDown = false;
  });

  // Collisions
  function rectCircleColliding(circle, rect) {
    // Find closest point to circle within rectangle
    const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
    const closestY = clamp(circle.y, rect.y, rect.y + rect.height);

    const dx = circle.x - closestX;
    const dy = circle.y - closestY;

    return (dx * dx + dy * dy) < (circle.radius * circle.radius);
  }

  function update(dt) {
    if (!running) return;

    // Keyboard velocity for player (mouse and keyboard both available; mouse sets directly)
    if (keys.ArrowUp) player.y -= player.speed;
    if (keys.ArrowDown) player.y += player.speed;
    player.y = clamp(player.y, 0, HEIGHT - player.height);

    // CPU simple AI: follow ball with limited speed
    const cpuCenter = cpu.y + cpu.height / 2;
    if (ball.y < cpuCenter - 10) {
      cpu.y -= cpu.speed;
    } else if (ball.y > cpuCenter + 10) {
      cpu.y += cpu.speed;
    }
    cpu.y = clamp(cpu.y, 0, HEIGHT - cpu.height);

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collision (top/bottom)
    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.dy = -ball.dy;
    } else if (ball.y + ball.radius >= HEIGHT) {
      ball.y = HEIGHT - ball.radius;
      ball.dy = -ball.dy;
    }

    // Paddle collisions
    const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height };
    const cpuRect = { x: cpu.x, y: cpu.y, width: cpu.width, height: cpu.height };

    if (rectCircleColliding(ball, playerRect) && ball.dx < 0) {
      // reflect and add angle based on hit position
      const relativeIntersectY = (player.y + player.height / 2) - ball.y;
      const normalized = relativeIntersectY / (player.height / 2); // -1..1
      const bounceAngle = normalized * (Math.PI / 3); // up to 60 degrees
      const speedIncrease = 1.05;
      ball.speed *= speedIncrease;
      ball.dx = Math.abs(ball.speed * Math.cos(bounceAngle)); // move right
      ball.dy = -ball.speed * Math.sin(bounceAngle);
      // nudge out to prevent sticking
      ball.x = player.x + player.width + ball.radius + 0.5;
    }

    if (rectCircleColliding(ball, cpuRect) && ball.dx > 0) {
      const relativeIntersectY = (cpu.y + cpu.height / 2) - ball.y;
      const normalized = relativeIntersectY / (cpu.height / 2);
      const bounceAngle = normalized * (Math.PI / 3);
      const speedIncrease = 1.05;
      ball.speed *= speedIncrease;
      ball.dx = -Math.abs(ball.speed * Math.cos(bounceAngle)); // move left
      ball.dy = -ball.speed * Math.sin(bounceAngle);
      ball.x = cpu.x - ball.radius - 0.5;
    }

    // Score: ball passed left or right bounds
    if (ball.x - ball.radius <= 0) {
      // CPU scores
      cpuScore++;
      cpuScoreEl.textContent = cpuScore;
      resetBall('cpu');
    } else if (ball.x + ball.radius >= WIDTH) {
      playerScore++;
      playerScoreEl.textContent = playerScore;
      resetBall('player');
    }
  }

  function drawNet() {
    const netWidth = 2;
    const segment = 12;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let y = 0; y < HEIGHT; y += segment * 2) {
      ctx.fillRect(WIDTH / 2 - netWidth / 2, y, netWidth, segment);
    }
  }

  function draw() {
    // Clear
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // background gradient subtle
    const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    g.addColorStop(0, 'rgba(255,255,255,0.02)');
    g.addColorStop(1, 'rgba(255,255,255,0.00)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // net
    drawNet();

    // paddles
    ctx.fillStyle = '#e6eef6';
    roundRect(ctx, player.x, player.y, player.width, player.height, 6, true, false);
    roundRect(ctx, cpu.x, cpu.y, cpu.width, cpu.height, 6, true, false);

    // ball
    ctx.beginPath();
    ctx.fillStyle = '#00d1ff';
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // shadow / glow
    ctx.beginPath();
    ctx.fillStyle = 'rgba(0,209,255,0.08)';
    ctx.arc(ball.x, ball.y, ball.radius * 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // simple rounded rectangle helper
  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (r === undefined) r = 5;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function loop(ts) {
    const dt = lastTime ? (ts - lastTime) / 16.666 : 1;
    lastTime = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  // Pause / Resume on focus/blur for niceness
  window.addEventListener('blur', () => running = false);
  window.addEventListener('focus', () => running = true);

  // Optional: handle window resize to keep canvas centered (canvas size fixed)
  window.addEventListener('resize', () => {
    // nothing to do — canvas fixed size; but you could add responsiveness here
  });

  // Allow spacebar to reset scores and restart quickly
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      playerScore = 0;
      cpuScore = 0;
      playerScoreEl.textContent = playerScore;
      cpuScoreEl.textContent = cpuScore;
      resetBall(Math.random() < 0.5 ? 'player' : 'cpu');
    }
  });
})();
