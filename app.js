const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const appRoot = document.getElementById('appRoot');
const menuCarga = document.getElementById('menuCarga');
const btnRemoverCarga = document.getElementById('btnRemoverCarga');

class Carga {
  constructor(x, y, q) {
    this.x = x;
    this.y = y;
    this.q = q; // Carga elétrica em Coulomb Positiva = +1 // Negativa = -1
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

let usarMultimetro = true;
let mostrarHeatmap = true;
let mouseX = 0;
let mouseY = 0;
let mouseNoCanvas = false;

// Modos de visualização de vetores: 0 = com opacidade, 1 = sem opacidade (100%), 2 = oculto
let modoVetores = 0;

const GRID_SPACING = 25;
const GRID_MAJOR_SPACING = 100;

let isDragging = false;
let cargaArrastada = null;
let ponteiroAtivoId = null;
let cargaMenuSelecionada = -1;

function aplicarModoLayoutViewport() {
  const viewport = window.visualViewport;
  const largura = viewport ? viewport.width : window.innerWidth;
  const altura = viewport ? viewport.height : window.innerHeight;
  const modoRetrato = largura < altura;

  if (appRoot) {
    appRoot.classList.toggle('viewport-portrait', modoRetrato);
  }
}

function atualizarLayout() {
  aplicarModoLayoutViewport();
  ajustarCanvasAoLayout();
}

function atualizarTextoBotao(id, texto) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = texto;
}

function getGridOrigin() {
  return { x: canvas.width / 2, y: canvas.height / 2 };
}

function coordenadasDaGrade(px, py) {
  const origem = getGridOrigin();
  return {
    x: px - origem.x,
    y: py - origem.y,
  };
}

function formatarCoordenada(valor) {
  if (Math.abs(valor) < 0.5) return '0';
  const sinal = valor >= 0 ? '+' : '-';
  return `${sinal}${Math.round(Math.abs(valor))}`;
}

function formatarNumero(valor, casas = 1) {
  return Number(valor).toFixed(casas).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function formatarCarga(q) {
  return q > 0 ? '+1' : '-1';
}

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

document.getElementById('toggleHeatmap').addEventListener('click', () => {
  mostrarHeatmap = !mostrarHeatmap;
  atualizarTextoBotao('spanHeatmap', mostrarHeatmap ? 'Desativar Mapa de Potencial' : 'Ativar Mapa de Potencial');
});


const modoVetoresTextos = ['Vetores com opacidade', 'Vetores sem opacidade', 'Ocultar Vetores'];

document.getElementById('toggleVectors').addEventListener('click', () => {
  modoVetores = (modoVetores + 1) % 3;
  atualizarTextoBotao('spanVetores', modoVetoresTextos[modoVetores]);
});

window.addEventListener('resize', atualizarLayout);

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', atualizarLayout);
  window.visualViewport.addEventListener('scroll', atualizarLayout);
}

if (typeof ResizeObserver !== 'undefined') {
  const painelUI = document.getElementById('ui');
  const observer = new ResizeObserver(() => atualizarLayout());
  if (painelUI) observer.observe(painelUI);
  observer.observe(canvas);
}

// Função principal de renderização (Loop)
function renderizar() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (cargas.length > 0 && mostrarHeatmap) {
    desenharHeatmap(ctx);
  }

  desenharGrade(ctx);

  if (cargas.length > 0 && modoVetores < 2) {
    desenharVetoresCampo(ctx);
  }

  cargas.forEach(carga => carga.desenhar(ctx));

  desenharMultimetro(ctx);
  desenharRastreadorMouse(ctx);
  atualizarPainelPotencial();
  requestAnimationFrame(renderizar);
}

// Inicia o motor com o layout e canvas dimensionados ao viewport real
atualizarLayout();
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

function getCargaSobPonteiro() {
  for (let i = cargas.length - 1; i >= 0; i--) {
    const carga = cargas[i];
    if (carga.distanciaAte(mouseX, mouseY) <= carga.raio) {
      return i;
    }
  }

  return -1;
}

function fecharMenuCarga() {
  menuCarga.classList.add('hidden');
  cargaMenuSelecionada = -1;
}

function abrirMenuCarga(clientX, clientY, indiceCarga) {
  cargaMenuSelecionada = indiceCarga;
  menuCarga.style.left = clientX + 'px';
  menuCarga.style.top = clientY + 'px';
  menuCarga.classList.remove('hidden');
}

canvas.addEventListener('pointerdown', (evt) => {
  getPointerPos(canvas, evt);
  mouseNoCanvas = true;

  if (evt.button === 2) {
    const indiceCarga = getCargaSobPonteiro();
    if (indiceCarga !== -1) {
      abrirMenuCarga(
        evt.clientX,
        evt.clientY,
        indiceCarga
      );
    }

    evt.preventDefault();
    return;
  }

  ponteiroAtivoId = evt.pointerId;

  const indiceCarga = getCargaSobPonteiro();
  if (indiceCarga !== -1) {
    isDragging = true;
    cargaArrastada = cargas[indiceCarga];
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

canvas.addEventListener('contextmenu', (evt) => {
  evt.preventDefault();
});

canvas.addEventListener('pointerleave', () => {
  mouseNoCanvas = false;
  if (!isDragging) {
    canvas.style.cursor = 'crosshair';
  }
});

// Fechar menu ao clicar fora dele
document.addEventListener('click', (evt) => {
  if (!menuCarga.classList.contains('hidden') && evt.target !== btnRemoverCarga && !menuCarga.contains(evt.target)) {
    fecharMenuCarga();
  }
});

// Remover carga ao clicar no botão do menu
btnRemoverCarga.addEventListener('click', () => {
  if (cargaMenuSelecionada !== -1 && cargaMenuSelecionada < cargas.length) {
    cargas.splice(cargaMenuSelecionada, 1);
    fecharMenuCarga();
    atualizarCursor();
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

       // Determina opacidade conforme modoVetores: 0 = natural, 1 = 100%, 2 = oculto
       let opacidade;
       if (modoVetores === 1) {
         opacidade = 1;
       } else {
         opacidade = Math.min(mag / 5, 0.8);
       }

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

function desenharGrade(context) {
  const origem = getGridOrigin();

  context.save();
  context.font = '11px monospace';
  context.fillStyle = 'rgba(255, 255, 255, 0.55)';

  for (let offset = -Math.ceil(origem.x / GRID_SPACING) * GRID_SPACING; offset <= canvas.width; offset += GRID_SPACING) {
    const x = origem.x + offset;
    const isMajor = offset % GRID_MAJOR_SPACING === 0;
    const isAxis = offset === 0;

    context.beginPath();
    context.strokeStyle = isAxis ? 'rgba(255, 255, 255, 0.28)' : isMajor ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.08)';
    context.lineWidth = isAxis ? 1.4 : isMajor ? 1.1 : 0.8;
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();

    if (isMajor || isAxis) {
      context.textAlign = 'center';
      context.textBaseline = 'top';
      context.fillText(formatarCoordenada(offset), x, 4);
    }
  }

  for (let offset = -Math.ceil(origem.y / GRID_SPACING) * GRID_SPACING; offset <= canvas.height; offset += GRID_SPACING) {
    const y = origem.y + offset;
    const isMajor = offset % GRID_MAJOR_SPACING === 0;
    const isAxis = offset === 0;

    context.beginPath();
    context.strokeStyle = isAxis ? 'rgba(255, 255, 255, 0.28)' : isMajor ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.08)';
    context.lineWidth = isAxis ? 1.4 : isMajor ? 1.1 : 0.8;
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();

    if (isMajor || isAxis) {
      context.textAlign = 'left';
      context.textBaseline = 'middle';
      context.fillText(formatarCoordenada(offset), 6, y);
    }
  }

  context.restore();
}


// Calcula o Potencial Escalar (V) em um ponto (px, py)
function calcularPotencial(px, py) {
  return calcularDetalhesPotencial(px, py).V;
}

function calcularDetalhesPotencial(px, py) {
  let V = 0;
  const termos = [];

  cargas.forEach((carga, indice) => {
    let dx = px - carga.x;
    let dy = py - carga.y;
    let r = Math.sqrt(dx * dx + dy * dy);

    // Se estivermos exatamente no centro da carga, o V tenderia ao infinito.
    if (r < 5) r = 5;

    // V = k * q / r
    const contribuicao = (k * carga.q) / r;
    V += contribuicao;

    termos.push({
      indice: indice + 1,
      carga,
      r,
      contribuicao,
    });
  });

  return { V, termos };
}

function atualizarPainelPotencial() {
  const painel = document.getElementById('painelPotencial');
  if (!painel) return;

  if (!usarMultimetro || !mouseNoCanvas) {
    painel.classList.add('hidden');
    return;
  }

  const detalhes = calcularDetalhesPotencial(mouseX, mouseY);

  // Monta expressões LaTeX
  if (detalhes.termos.length === 0) {
    painel.innerHTML = '<div class="linha-equacao">Nenhuma carga presente.</div>';
    painel.classList.remove('hidden');
    return;
  }

  // 1) Expressão simbólica: V = \sum k q_i / r_i
  const simbolica = `V = ${detalhes.termos.map((t, i) => `\\frac{k q_{${i+1}}}{r_{${i+1}}}`).join(' + ')}`;

  // 2) Substituindo k, q_i e r_i
  const substituida = `V = ${detalhes.termos.map((t, i) => `\\frac{${k}\\cdot(${t.carga.q > 0 ? '+' : '-'}1)}{${formatarNumero(t.r,1)}}`).join(' + ')}`;

  // 3) Valores numéricos das contribuições
  const contribuicoes = `V = ${detalhes.termos.map((t) => `${formatarNumero(t.contribuicao,1)}`).join(' + ')}`;

  // 4) Valor total
  const total = `V = ${formatarNumero(detalhes.V,1)}\\ {Volts}`;

  // Monta o HTML com KaTeX (renderToString)
  let html = '';
  try {
    html += `<div class="linha-equacao">${katex.renderToString('Potencial \\ Elétrico\\ (V)', { throwOnError: false, displayMode: false })}</div>`;
    html += `<div class="linha-equacao">${katex.renderToString(simbolica, { throwOnError: false, displayMode: false })}</div>`;
    html += `<div class="linha-equacao">${katex.renderToString(substituida, { throwOnError: false, displayMode: false })}</div>`;
    html += `<div class="linha-equacao">${katex.renderToString(contribuicoes, { throwOnError: false, displayMode: false })}</div>`;
    html += `<div class="linha-equacao">${katex.renderToString(total, { throwOnError: false, displayMode: false })}</div>`;
  } catch (e) {
    // Fallback: texto simples
    html = `<div class="linha-equacao">${simbolica}</div><div class="linha-equacao">${substituida}</div><div class="linha-equacao">${contribuicoes}</div><div class="linha-equacao">${total}</div>`;
  }

  painel.innerHTML = html;
  painel.style.left = `${canvas.getBoundingClientRect().left * 2}px`;
  painel.classList.remove('hidden');
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
  let grade = coordenadasDaGrade(mouseX, mouseY);

  let magE = Math.sqrt(campo.Ex * campo.Ex + campo.Ey * campo.Ey);

  let textoV = `V: ${V.toFixed(1)} Volts`;
  let textoE = `|E|: ${magE.toFixed(1)} V/m`;
  let textoX = `X: ${formatarCoordenada(grade.x)} px`;
  let textoY = `Y: ${formatarCoordenada(grade.y)} px`;

  const caixaX = Math.max(12, Math.min(mouseX + 15, canvas.width - 200));
  const caixaY = Math.max(12, Math.min(mouseY - 45, canvas.height - 82));

  context.beginPath();
  context.arc(mouseX, mouseY, 6, 0, Math.PI * 2);
  context.strokeStyle = '#f1c40f';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = 'rgba(0, 0, 0, 0.85)';
  context.fillRect(caixaX, caixaY, 190, 72);

  context.strokeStyle = '#f1c40f';
  context.lineWidth = 1;
  context.strokeRect(caixaX, caixaY, 190, 72);

  context.fillStyle = '#f1c40f';
  context.font = '14px monospace';
  context.textAlign = 'left';
  context.textBaseline = 'middle';

  context.fillText(textoV, caixaX + 10, caixaY + 14);
  context.fillText(textoE, caixaX + 10, caixaY + 32);
  context.fillText(textoX, caixaX + 10, caixaY + 50);
  context.fillText(textoY, caixaX + 10, caixaY + 66);
}

function desenharRastreadorMouse(context) {
  if (!mouseNoCanvas) return;

  const grade = coordenadasDaGrade(mouseX, mouseY);
  const linhas = [
    'Mouse / Grade',
    `X: ${formatarCoordenada(grade.x)} px`,
    `Y: ${formatarCoordenada(grade.y)} px`,
  ];

  context.save();
  context.font = '12px monospace';
  context.textAlign = 'left';
  context.textBaseline = 'middle';

  const largura = Math.max(...linhas.map((linha) => context.measureText(linha).width)) + 20;
  const altura = 18 + linhas.length * 16;
  const x = 12;
  const y = 12;

  context.fillStyle = 'rgba(0, 0, 0, 0.72)';
  context.fillRect(x, y, largura, altura);

  context.strokeStyle = 'rgba(52, 211, 153, 0.9)';
  context.lineWidth = 1;
  context.strokeRect(x, y, largura, altura);

  context.fillStyle = '#34d399';
  context.fillText(linhas[0], x + 10, y + 14);
  context.fillText(linhas[1], x + 10, y + 30);
  context.fillText(linhas[2], x + 10, y + 46);
  context.restore();
}



