const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

class Carga {
  constructor(x, y, q) {
    this.x = x;
    this.y = y;
    this.q = q;
    this.raio = 15;
  }

  // Calcula a distância entre esta carga e um ponto (x, y) qualquer
  distanciaAte(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Desenha a carga na tela
  desenhar(context) {
    context.beginPath();
    context.arc(this.x, this.y, this.raio, 0, Math.PI * 2);
    context.fillStyle = this.q > 0 ? '#ff4757' : '#1e90ff';
    context.fill();
    context.strokeStyle = 'white';
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = 'white';
    context.font = '20px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(this.q > 0 ? '+' : '-', this.x, this.y);
  }
}

// Constante eletrostática
const k = 10000;
let cargas = [];

let usarMultimetro = false;
let mouseX = 0;
let mouseY = 0;
let mouseNoCanvas = false;

let isDragging = false;
let cargaArrastada = null;
let ponteiroAtivoId = null;

function ajustarCanvasAoLayout() {
  const rect = canvas.getBoundingClientRect();
  const novaLargura = Math.max(1, Math.floor(rect.width));
  const novaAltura = Math.max(1, Math.floor(rect.height));

  if (canvas.width === novaLargura && canvas.height === novaAltura) return;

  canvas.width = novaLargura;
  canvas.height = novaAltura;
}

// --- Eventos de UI ---
document.getElementById('addPos').addEventListener('click', () => {
  cargas.push(new Carga(canvas.width / 2 + (Math.random() * 50 - 25), canvas.height / 2, 1));
});

// Adiciona uma carga negativa no centro
document.getElementById('addNeg').addEventListener('click', () => {
  cargas.push(new Carga(canvas.width / 2 + (Math.random() * 50 - 25), canvas.height / 2, -1));
});

// Limpa todas as cargas da tela
document.getElementById('clear').addEventListener('click', () => {
  cargas = [];
})

// Botão de ligar/desligar multímetro
document.getElementById('toggleSensor').addEventListener('click', () => {
  usarMultimetro = !usarMultimetro;
  document.getElementById('spanMultimetro').innerHTML = usarMultimetro ? 'Desativar Multímetro' : 'Ativar Multímetro';
});

window.addEventListener('resize', ajustarCanvasAoLayout);

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', ajustarCanvasAoLayout);
  window.visualViewport.addEventListener('scroll', ajustarCanvasAoLayout);
}

if (typeof ResizeObserver !== 'undefined') {
  const painelUI = document.getElementById('ui');
  const observer = new ResizeObserver(() => ajustarCanvasAoLayout());
  if (painelUI) observer.observe(painelUI);
  observer.observe(canvas);
}

// Função principal de renderização (Loop)
function renderizar() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (cargas.length > 0) {
    desenharHeatmap(ctx);
    desenharVetoresCampo(ctx);
  }

  cargas.forEach(carga => carga.desenhar(ctx));

  desenharMultimetro(ctx);
  requestAnimationFrame(renderizar);
}

// Inicia o motor com o canvas já dimensionado ao layout real
ajustarCanvasAoLayout();
renderizar();

///////////////////////////////////////////////////////////////////////////////////

// Pega a posição do ponteiro (mouse/toque/caneta) relativa ao canvas
function getPointerPos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  mouseX = evt.clientX - rect.left;
  mouseY = evt.clientY - rect.top;
  return { x: mouseX, y: mouseY };
}

function atualizarCursor() {
  if (isDragging) {
    canvas.style.cursor = 'grabbing';
    return;
  }

  let hover = false;
  for (let carga of cargas) {
    if (carga.distanciaAte(mouseX, mouseY) <= carga.raio) {
      hover = true;
      break;
    }
  }

  canvas.style.cursor = hover ? 'grab' : 'crosshair';
}

canvas.addEventListener('pointerdown', (evt) => {
  getPointerPos(canvas, evt);
  mouseNoCanvas = true;
  ponteiroAtivoId = evt.pointerId;

  for (let i = cargas.length - 1; i >= 0; i--) {
    const carga = cargas[i];

    // Verifica se o ponteiro está dentro do hitbox da carga
    if (carga.distanciaAte(mouseX, mouseY) <= carga.raio) {
      isDragging = true;
      cargaArrastada = carga;
      break;
    }
  }

  if (typeof canvas.setPointerCapture === 'function') {
    canvas.setPointerCapture(evt.pointerId);
  }

  atualizarCursor();
  evt.preventDefault();
});

canvas.addEventListener('pointermove', (evt) => {
  if (ponteiroAtivoId !== null && evt.pointerId !== ponteiroAtivoId) return;

  getPointerPos(canvas, evt);
  mouseNoCanvas = true;

  if (isDragging && cargaArrastada) {
    cargaArrastada.x = mouseX;
    cargaArrastada.y = mouseY;
  }

  atualizarCursor();
  evt.preventDefault();
});

function finalizarInteracao(evt) {
  if (ponteiroAtivoId !== null && evt.pointerId !== ponteiroAtivoId) return;

  isDragging = false;
  cargaArrastada = null;
  ponteiroAtivoId = null;

  if (typeof canvas.releasePointerCapture === 'function') {
    try {
      canvas.releasePointerCapture(evt.pointerId);
    } catch (_) {
      // Ignora erros quando o ponteiro ja foi liberado pelo browser.
    }
  }

  atualizarCursor();
}

canvas.addEventListener('pointerup', finalizarInteracao);
canvas.addEventListener('pointercancel', finalizarInteracao);

canvas.addEventListener('pointerleave', () => {
  mouseNoCanvas = false;
  if (!isDragging) {
    canvas.style.cursor = 'crosshair';
  }
});


// Calcula o vetor resultante do Campo Elétrico (Ex, Ey) em um ponto (px, py)
function calcularCampoEletrico(px, py) {
  let Ex = 0;
  let Ey = 0;

  for (let carga of cargas) {
    let dx = px - carga.x;
    let dy = py - carga.y;
    let r2 = dx * dx + dy * dy;

    // Evita divisão por zero ou campos infinitos se o ponto estiver no centro da carga
    if (r2 < 100) continue;

    let r = Math.sqrt(r2);

    // Magnitude do campo: E = k * q / r^2
    let E = (k * carga.q) / r2;

    // Decomposição vetorial (superposição)
    // dx/r é o cosseno do ângulo, dy/r é o seno do ângulo
    Ex += E * (dx / r);
    Ey += E * (dy / r);
  }

  return { Ex, Ey };
}

// Desenha vetores apontando na direção do campo
function desenharVetoresCampo(context) {
  const espacamento = 30;
  const tamanhoVetor = 15;

  for (let x = 0; x < canvas.width; x += espacamento) {
    for (let y = 0; y < canvas.height; y += espacamento) {

      let campo = calcularCampoEletrico(x, y);

      // Calcula a força total (magnitude) usando Pitágoras
      let mag = Math.sqrt(campo.Ex * campo.Ex + campo.Ey * campo.Ey);

      if (mag === 0) continue;

      // Normaliza o vetor (descobre apenas a direção, ignorando a força original)
      let nx = campo.Ex / mag;
      let ny = campo.Ey / mag;

      let opacidade = Math.min(mag / 5, 0.8);

      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + nx * tamanhoVetor, y + ny * tamanhoVetor);
      context.strokeStyle = `rgba(255, 255, 255, ${opacidade})`;
      context.lineWidth = 1.5;
      context.stroke();

      // seta para mostrar o sentido
      context.beginPath();
      context.arc(x + nx * tamanhoVetor, y + ny * tamanhoVetor, 1.5, 0, Math.PI * 2);
      context.fillStyle = `rgba(255, 255, 255, ${opacidade})`;
      context.fill();
    }
  }
}


// Calcula o Potencial Escalar (V) em um ponto (px, py)
function calcularPotencial(px, py) {
  let V = 0;

  for (let carga of cargas) {
    let dx = px - carga.x;
    let dy = py - carga.y;
    let r = Math.sqrt(dx * dx + dy * dy);

    // Se estivermos exatamente no centro da carga, o V tenderia ao infinito.
    if (r < 5) r = 5;

    // V = k * q / r
    V += (k * carga.q) / r;
  }

  return V;
}

// Pinta o fundo do Canvas baseado no Potencial
function desenharHeatmap(context) {
  const tamanhoBloco = 3;
  const limiteV = 800; // 1000

  // Varre a tela pulando de bloco em bloco
  for (let x = 0; x < canvas.width; x += tamanhoBloco) {
    for (let y = 0; y < canvas.height; y += tamanhoBloco) {

      // Pega o potencial no centro deste bloco
      let v = calcularPotencial(x + (tamanhoBloco / 2), y + (tamanhoBloco / 2));

      // Transforma o valor do potencial em uma intensidade de 0.0 a 1.0 (para usar na opacidade das cores)
      let intensidade = Math.abs(v) / limiteV;
      if (intensidade > 1) intensidade = 1;

      // Só desenha o bloco se houver alguma intensidade relevante (poupa processamento)
      if (intensidade > 0.05) {
        if (v > 0) {
          // Potencial Positivo: Tons de Vermelho
          context.fillStyle = `rgba(255, 71, 87, ${intensidade * 0.7})`;
        } else {
          // Potencial Negativo: Tons de Azul
          context.fillStyle = `rgba(30, 144, 255, ${intensidade * 0.7})`;
        }
        context.fillRect(x, y, tamanhoBloco, tamanhoBloco);
      }
    }
  }
}

function desenharMultimetro(context) {
  if (!usarMultimetro || !mouseNoCanvas) return;

  let V = calcularPotencial(mouseX, mouseY);
  let campo = calcularCampoEletrico(mouseX, mouseY);

  let magE = Math.sqrt(campo.Ex * campo.Ex + campo.Ey * campo.Ey);

  let textoV = `V: ${V.toFixed(1)} Volts`;
  let textoE = `|E|: ${magE.toFixed(1)} V/m`;

  context.beginPath();
  context.arc(mouseX, mouseY, 6, 0, Math.PI * 2);
  context.strokeStyle = '#f1c40f';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = 'rgba(0, 0, 0, 0.85)';
  context.fillRect(mouseX + 15, mouseY - 30, 160, 50);

  context.strokeStyle = '#f1c40f';
  context.lineWidth = 1;
  context.strokeRect(mouseX + 15, mouseY - 30, 160, 50);

  context.fillStyle = '#f1c40f';
  context.font = '14px monospace';
  context.textAlign = 'left';
  context.textBaseline = 'middle';

  context.fillText(textoV, mouseX + 25, mouseY - 15);
  context.fillText(textoE, mouseX + 25, mouseY + 5);
}