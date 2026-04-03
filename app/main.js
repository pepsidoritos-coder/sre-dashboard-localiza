/* === main.js — SRE Dashboard === */

/* ---- Utilities ---- */
const $ = (id) => document.getElementById(id);
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));

/* ============================================================
   1. HERO CANVAS — animated node graph
   ============================================================ */
(function heroCanvas() {
  const canvas = $('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, nodes = [], animId;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight || 350;
    buildNodes();
  }

  function buildNodes() {
    nodes = [];
    const count = Math.floor(W / 55);
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: rand(0, W), y: rand(0, H),
        vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3),
        r: rand(2, 4),
        type: Math.random() > 0.7 ? 'primary' : 'secondary'
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          const alpha = 1 - dist / 110;
          ctx.strokeStyle = `rgba(0,132,61,${alpha * 0.28})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    // nodes
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 2);
      grd.addColorStop(0, n.type === 'primary' ? 'rgba(0,168,78,0.9)' : 'rgba(120,200,0,0.7)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    });
    animId = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { cancelAnimationFrame(animId); resize(); draw(); });
  resize();
  draw();
})();

/* ============================================================
   2. SPARKLINE CHARTS
   ============================================================ */
function Sparkline(canvasId, color, initial) {
  this.canvas = $(canvasId);
  if (!this.canvas) return;
  this.ctx = this.canvas.getContext('2d');
  this.color = color;
  this.data = initial || Array.from({ length: 20 }, () => rand(20, 80));
  this.draw();
}

Sparkline.prototype.push = function (val) {
  this.data.push(val);
  if (this.data.length > 30) this.data.shift();
  this.draw();
};

Sparkline.prototype.draw = function () {
  const { canvas, ctx, data, color } = this;
  const W = canvas.width = canvas.offsetWidth;
  const H = canvas.height = 44;
  ctx.clearRect(0, 0, W, H);
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const xStep = W / (data.length - 1);
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i * xStep;
    const y = H - ((v - min) / (max - min + 0.001)) * (H - 4) - 2;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  const gradient = ctx.createLinearGradient(0, 0, W, 0);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, '#78C800');
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();
};

const spCpu   = new Sparkline('spark-cpu',   '#00843D');
const spMem   = new Sparkline('spark-mem',   '#f59e0b');
const spRps   = new Sparkline('spark-rps',   '#00A84E');
const spError = new Sparkline('spark-error', '#78C800');

/* ============================================================
   3. LIVE METRICS UPDATES
   ============================================================ */
let cpuVal = 38, memVal = 61, rpsVal = 1200, errorVal = 0.02;

function updateMetrics() {
  cpuVal   = Math.min(95, Math.max(5,  cpuVal   + rand(-4, 4)));
  memVal   = Math.min(92, Math.max(30, memVal   + rand(-2, 2)));
  rpsVal   = Math.max(200, rpsVal  + rand(-100, 150));
  errorVal = Math.max(0,   errorVal + rand(-0.01, 0.015));

  $('cpu-val').textContent   = Math.round(cpuVal) + '%';
  $('mem-val').textContent   = Math.round(memVal) + '%';
  $('rps-val').textContent   = rpsVal > 1000 ? (rpsVal / 1000).toFixed(1) + 'k' : Math.round(rpsVal);
  $('error-val').textContent = errorVal.toFixed(2) + '%';

  $('cpu-bar').style.width   = cpuVal + '%';
  $('mem-bar').style.width   = memVal + '%';
  $('rps-bar').style.width   = Math.min(100, (rpsVal / 2000) * 100) + '%';
  $('error-bar').style.width = Math.min(100, errorVal * 20) + '%';

  const cpuCard = $('mc-cpu');
  if (cpuVal > 80) { cpuCard.querySelector('.metric-badge').className = 'metric-badge badge-warn'; cpuCard.querySelector('.metric-badge').textContent = 'ALTO'; }
  else { cpuCard.querySelector('.metric-badge').className = 'metric-badge badge-ok'; cpuCard.querySelector('.metric-badge').textContent = 'OK'; }

  spCpu.push(cpuVal);
  spMem.push(memVal);
  spRps.push((rpsVal / 2000) * 100);
  spError.push(errorVal * 500);
}

setInterval(updateMetrics, 2000);

/* ============================================================
   4. NODE TABLE
   ============================================================ */
const NODES = [
  { name: 'ip-10-0-1-42',  type: 'm5.xlarge',  spot: false, cpu: 32, mem: 58, pods: 8  },
  { name: 'ip-10-0-2-17',  type: 'm5.2xlarge', spot: false, cpu: 21, mem: 42, pods: 6  },
  { name: 'ip-10-0-1-203', type: 'c5.xlarge',  spot: true,  cpu: 64, mem: 71, pods: 12 },
  { name: 'ip-10-0-2-88',  type: 'c5.2xlarge', spot: true,  cpu: 18, mem: 35, pods: 5  },
  { name: 'ip-10-0-3-55',  type: 't3.medium',  spot: false, cpu: 5,  mem: 28, pods: 3  },
  { name: 'ip-10-0-3-91',  type: 'c5.xlarge',  spot: true,  cpu: 77, mem: 84, pods: 14 },
];

function renderNodes() {
  const tbody = $('nodes-tbody');
  if (!tbody) return;
  tbody.innerHTML = NODES.map(n => {
    const spotBadge = n.spot ? '<span class="status-dot status-spot">Spot</span>' : '<span class="status-dot">On-Demand</span>';
    const prov = n.spot ? 'Karpenter' : 'EKS Managed';
    const cpuColor = n.cpu > 70 ? 'style="color:var(--yellow)"' : '';
    const memColor = n.mem > 80 ? 'style="color:var(--red)"' : '';
    return `<tr>
      <td>${n.name}</td>
      <td>${n.type}</td>
      <td>${spotBadge}</td>
      <td ${cpuColor}>${n.cpu}%</td>
      <td ${memColor}>${n.mem}%</td>
      <td>${n.pods}</td>
      <td>${prov}</td>
    </tr>`;
  }).join('');
}

renderNodes();

function fluctuateNodes() {
  NODES.forEach(n => {
    n.cpu = Math.min(98, Math.max(3, n.cpu + rand(-6, 6)));
    n.mem = Math.min(95, Math.max(10, n.mem + rand(-4, 4)));
  });
  renderNodes();
}

setInterval(fluctuateNodes, 3500);

/* ============================================================
   5. KARPENTER FEED
   ============================================================ */
const K_EVENTS = [
  { type: 'ev-provision', label: 'PROVISION', title: 'Node provisionado: c5.2xlarge', detail: 'Spot · us-east-1b · Karpenter NodePool/general' },
  { type: 'ev-spot',      label: 'SPOT',      title: 'Spot interruption recebida — m5.xlarge', detail: 'Migração automática para c5.xlarge On-Demand' },
  { type: 'ev-scale',     label: 'SCALE-IN',  title: 'Node consolidado — c5.xlarge', detail: 'Workloads redistribuídos · economia $0.12/h' },
  { type: 'ev-provision', label: 'PROVISION', title: 'Node provisionado: m5.xlarge', detail: 'On-Demand · us-east-1a · Karpenter NodePool/spot-prio' },
  { type: 'ev-scale',     label: 'SCALE-OUT', title: 'HPA disparou scale-out', detail: 'CPU 81% → 3 réplicas adicionadas' },
  { type: 'ev-term',      label: 'TERM',       title: 'Node terminado: t3.medium', detail: '0 pods ativos — removido para otimização de custo' },
  { type: 'ev-provision', label: 'PROVISION', title: 'Node provisionado: c5.xlarge', detail: 'Spot · us-east-1c · boot em 7s' },
  { type: 'ev-spot',      label: 'SPOT',      title: 'Spot capacity recuperada — c5.xlarge', detail: 'Re-provisioning concluído sem interrupção de serviço' },
];

let evIdx = 0;
const TIMES = ['1s', '4s', '12s', '28s', '45s', '1m', '2m', '4m', '7m', '10m'];

function buildFeed() {
  const feed = $('karpenter-feed');
  if (!feed) return;
  feed.innerHTML = `
    <div class="feed-header">
      <span>Eventos de Provisionamento</span>
      <span class="feed-live"><span class="pulse-dot"></span> Live</span>
    </div>
    <div class="feed-body" id="feed-body">
      ${K_EVENTS.slice().reverse().map((e, i) => `
        <div class="feed-event">
          <span class="event-type ${e.type}">${e.label}</span>
          <div class="event-body">
            <span class="event-title">${e.title}</span>
            <span class="event-detail">${e.detail}</span>
          </div>
          <span class="event-time">${TIMES[i] || '10m'} atrás</span>
        </div>
      `).join('')}
    </div>`;
}

buildFeed();

function addFeedEvent() {
  const body = $('feed-body');
  if (!body) return;
  const e = K_EVENTS[evIdx % K_EVENTS.length];
  evIdx++;
  const div = document.createElement('div');
  div.className = 'feed-event';
  div.innerHTML = `
    <span class="event-type ${e.type}">${e.label}</span>
    <div class="event-body">
      <span class="event-title">${e.title}</span>
      <span class="event-detail">${e.detail}</span>
    </div>
    <span class="event-time">agora</span>`;
  body.prepend(div);
  if (body.children.length > 12) body.lastElementChild.remove();
}

setInterval(addFeedEvent, 5000);

/* ============================================================
   6. PIPELINE TIMER + LOG
   ============================================================ */
let pipeSeconds = 23;
const pipeTimer = $('pipe-timer');
const logBody   = $('log-body');

const extraLogs = [
  'Verificando saúde dos containers...',
  'Pod localiza-app-7d8b9c-xxxxx: Running',
  'Pod localiza-app-7d8b9c-yyyyy: Running',
  'Rollout concluído — 2/2 pods saudáveis',
  'Health check endpoint: HTTP 200 ✓',
  'Deployment finalizado com sucesso ✅',
];

let logIdx = 0;

setInterval(() => {
  pipeSeconds++;
  if (pipeTimer) {
    const m = String(Math.floor(pipeSeconds / 60)).padStart(2,'0');
    const s = String(pipeSeconds % 60).padStart(2,'0');
    pipeTimer.textContent = `${m}:${s}`;
  }

  if (pipeSeconds === 35 && logBody && logIdx < extraLogs.length) {
    const line = document.createElement('div');
    line.className = 'log-line log-active';
    line.innerHTML = `<span class="log-ts">[${new Date().toTimeString().slice(0,8)}]</span> ${extraLogs[logIdx++]} <span class="blink">█</span>`;
    logBody.appendChild(line);
    logBody.scrollTop = logBody.scrollHeight;
  }

  if (pipeSeconds > 35 && pipeSeconds % 4 === 0 && logIdx < extraLogs.length && logBody) {
    const prev = logBody.querySelector('.log-active');
    if (prev) { prev.classList.remove('log-active'); prev.querySelector('.blink')?.remove(); prev.innerHTML += ' <span class="log-ok">✓</span>'; }
    if (logIdx < extraLogs.length) {
      const line = document.createElement('div');
      line.className = 'log-line log-active';
      line.innerHTML = `<span class="log-ts">[${new Date().toTimeString().slice(0,8)}]</span> ${extraLogs[logIdx++]} <span class="blink">█</span>`;
      logBody.appendChild(line);
      logBody.scrollTop = logBody.scrollHeight;
    }
  }

  // Complete pipeline
  if (pipeSeconds >= 60) {
    const running = document.querySelector('.pipe-step.running');
    if (running) {
      running.classList.remove('running');
      running.classList.add('completed');
      running.querySelector('.pipe-status').className = 'pipe-status status-done';
      running.querySelector('.pipe-status').textContent = '✓';
    }
    const pending = document.querySelector('.pipe-step.pending');
    if (pending) {
      pending.classList.remove('pending');
      pending.style.opacity = '1';
      const connector = pending.previousElementSibling;
      if (connector && connector.classList.contains('pipe-connector')) connector.classList.add('done');
      pending.classList.add('running');
      const ps = pending.querySelector('.pipe-status');
      ps.className = 'pipe-status status-running';
      ps.innerHTML = '<span class="spinner"></span>';
    }
  }
}, 1000);

/* ============================================================
   7. HERO STATS COUNTER ANIMATION
   ============================================================ */
function animateCounter(el, target, suffix, duration) {
  if (!el) return;
  const start = performance.now();
  const startVal = 0;
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 4);
    const val = startVal + eased * (target - startVal);
    el.textContent = (suffix === '%' ? val.toFixed(2) : Math.round(val)) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

window.addEventListener('load', () => {
  setTimeout(() => {
    animateCounter($('stat-pods'), 24, '', 1200);
    animateCounter($('stat-nodes'), 6, '', 1000);
  }, 400);
});

/* ============================================================
   8. LIVE HERO STATS FLUCTUATION
   ============================================================ */
let podCount = 24, nodeCount = 6;

setInterval(() => {
  podCount  = Math.max(20, Math.min(32, podCount  + randInt(-1, 1)));
  nodeCount = Math.max(4,  Math.min(8,  nodeCount + randInt(-1, 1)));
  if ($('stat-pods'))  $('stat-pods').textContent  = podCount;
  if ($('stat-nodes')) $('stat-nodes').textContent = nodeCount;

  const lat = randInt(9, 18);
  if ($('stat-latency')) $('stat-latency').textContent = lat + 'ms';
}, 4000);

/* ============================================================
   9. ARCHITECTURE SIDEBAR INTERACTION
   ============================================================ */
const COMP_IDS = ['comp-vpc','comp-eks','comp-iam','comp-alb','comp-cw','comp-ssm'];
let compIdx = 0;

setInterval(() => {
  COMP_IDS.forEach(id => $(id)?.classList.remove('active'));
  compIdx = (compIdx + 1) % COMP_IDS.length;
  $(COMP_IDS[compIdx])?.classList.add('active');
}, 2000);

/* ============================================================
   10. SCROLL ANIMATIONS (Intersection Observer)
   ============================================================ */
const observerOpts = { threshold: 0.12 };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, observerOpts);

document.querySelectorAll('.metric-card, .stack-card, .kstat-card, .arch-node, .feed-event, .pipe-step').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity .5s ease, transform .5s ease';
  observer.observe(el);
});

/* ============================================================
   11. NAVBAR SCROLL EFFECT
   ============================================================ */
window.addEventListener('scroll', () => {
  const nav = $('navbar');
  if (!nav) return;
  if (window.scrollY > 40) {
    nav.style.borderBottomColor = 'rgba(0,90,48,0.3)';
  } else {
    nav.style.borderBottomColor = 'rgba(255,255,255,0.07)';
  }
}, { passive: true });

/* ============================================================
   12. KARPENTER STATS LIVE
   ============================================================ */
let kNodes = 14, kInterrupts = 3;
setInterval(() => {
  if (Math.random() > 0.5) {
    kNodes++;
    if ($('kstat-nodes')) $('kstat-nodes').textContent = kNodes;
  }
  if (Math.random() > 0.7) {
    kInterrupts++;
    if ($('kstat-interrupts')) $('kstat-interrupts').textContent = kInterrupts;
  }
}, 7000);

console.log('%c SRE Dashboard — Marvin Costa ', 'background:#005A30;color:white;font-size:14px;font-weight:bold;padding:6px 12px;border-radius:4px;');
console.log('%c Localiza&Co Candidatura — SRE/Cloud Engineer', 'color:#78C800;font-size:12px;');
