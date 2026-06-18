const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const appRoot = document.getElementById('appRoot');
const menuCarga = document.getElementById('menuCarga');
const painel = document.getElementById('painelPotencial');
const btnMoverCarga = document.getElementById('btnMoverCarga');
const btnRemoverCarga = document.getElementById('btnRemoverCarga');

class Carga {
  constructor({id, x, y, q}) {
    this.id = id;
    this.label = `q${id}`;
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

    context.font = 'italic 20px Times New Roman';
    context.fillText(`q`, this.x + this.raio + 1, this.y + this.raio);

    context.font = 'italic 14px Times New Roman';
    context.textBaseline = 'top';
    const offsetX = this.id >= 10 ? 12 : 8;
    context.fillText(this.id, this.x + this.raio + offsetX, this.y + this.raio);
  }
}

// Constante eletrostática
const materiais = {
  "vacuo": { name: "Vácuo / Ar", dielectricConstant: 1.0, k_value: 10000.0 },
  "oleo": { name: "Óleo", dielectricConstant: 2.2, k_value: 4545.45 },
  "borracha": { name: "Borracha", dielectricConstant: 3.0, k_value: 3333.33 },
  "papel": { name: "Papel", dielectricConstant: 3.5, k_value: 2857.14 },
  "vidro": { name: "Vidro", dielectricConstant: 6.0, k_value: 1666.67 },
  "etanol": { name: "Etanol", dielectricConstant: 24.0, k_value: 416.67 },
  "agua": { name: "Água Pura", dielectricConstant: 80.0, k_value: 125.0 }
}
let materialSelecionado = 'vacuo';
let K_CONSTANT = materiais[materialSelecionado].k_value;
let cargas = [];

let usarMultimetro = true;
let mostrarHeatmap = true;
let mouseX = 0;
let mouseY = 0;
let mouseNoCanvas = false;
let painelHover = false;
let proximaCargaIndex = 1;

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

/**
 * Obtém a origem da grade, que é o centro do canvas.
 * @returns {Object} - Objeto com as coordenadas da origem: { x, y }
 */
function getGridOrigin() {
  return { x: canvas.width / 2, y: canvas.height / 2 };
}

/**
* Converte coordenadas de pixel (px, py) para coordenadas relativas à grade, onde a origem (0,0) está no centro do canvas.
* Isso é útil para exibir coordenadas de carga e do multímetro de forma mais intuitiva, com o centro do canvas representando (0,0) na grade.
* @param {number} px - Coordenada x em pixels (relativa ao canto superior esquerdo do canvas)
* @param {number} py - Coordenada y em pixels (relativa ao canto superior esquerdo do canvas)
* @return {Object} - Objeto com as coordenadas relativas à grade: { x, y }
*/
function coordenadasDaGrade(px, py) {
  const origem = getGridOrigin();
  return {
    x: Math.round(px - origem.x),
    y: Math.round(py - origem.y)
  };
}

/**
* Formata um valor de coordenada para exibição, arredondando e adicionando um sinal de + ou -.
* @param {number} valor - O valor da coordenada a ser formatado.
* @return {string} - O valor formatado.
*/
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
// Preencher o seletor de meio no carregamento
const materialSelect = document.getElementById('materialSelect');
if (materialSelect) {
  Object.keys(materiais).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = materiais[key].name;
    option.className = 'bg-gray-800! cursor-pointer! hover:bg-gray-700!';
    materialSelect.appendChild(option);
  });
  // Seleciona o padrão
  materialSelect.value = materialSelecionado;

  // Atualiza a constante quando o usuário muda de meio
  materialSelect.addEventListener('change', e => {
    materialSelecionado = e.target.value;
    K_CONSTANT = materiais[materialSelecionado].k_value;
  });
}

document.getElementById('addPos').addEventListener('click', () => {
  const novaCarga = new Carga({
    id: proximaCargaIndex++,
    x: canvas.width / 2 + (Math.random() * 50 - 25),
    y: canvas.height / 2,
    q: 1
  });
  cargas.push(novaCarga);
});

// Adiciona uma carga negativa no centro
document.getElementById('addNeg').addEventListener('click', () => {
  const novaCarga = new Carga({
    id: proximaCargaIndex++,
    x: canvas.width / 2 + (Math.random() * 50 - 25),
    y: canvas.height / 2,
    q: -1
  });
  cargas.push(novaCarga);
});

// Limpa todas as cargas da tela
document.getElementById('clear').addEventListener('click', () => {
  cargas = [];
  proximaCargaIndex = 1;
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

/**
 * Pega a posição do ponteiro (mouse/toque/caneta) relativa ao canvas
 * A função calcula a posição do ponteiro subtraindo as coordenadas do canto superior esquerdo do canvas (obtidas com getBoundingClientRect) das coordenadas do ponteiro (evt.clientX e evt.clientY).
 * 
 * O resultado é arredondado para o inteiro mais próximo para garantir que as coordenadas sejam precisas e correspondam aos pixels do canvas.
 * @param {HTMLCanvasElement} canvas - O elemento canvas onde a posição será calculada
 * @param {PointerEvent} evt - O evento de ponteiro que contém as coordenadas do ponteiro
 * @return {Object} - Um objeto contendo as coordenadas x e y do ponteiro relativas ao canvas: { x, y }
 */
function getPointerPos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  mouseX = Math.floor(evt.clientX - rect.left);
  mouseY = Math.floor(evt.clientY - rect.top);
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
  const carga = cargas[indiceCarga];

  const { x: xCargaGrade, y: yCargaGrade } = coordenadasDaGrade(carga.x, carga.y);
  document.getElementById('infoCargaContainer').classList.remove('border-red-300', 'border-blue-300');
  document.getElementById('infoCargaContainer').classList.add(carga.q > 0 ? 'border-red-300' : 'border-blue-300');
  document.getElementById('labelCarga').innerHTML = `<div class="linha-equacao text-center">${katex.renderToString(`q_${carga.id}`, { throwOnError: false, displayMode: false })}</div>`;
  document.getElementById('infoCarga').textContent = `Carga: ${carga.q > 0 ? '+' : ''}${carga.q} Coulomb`;
  document.getElementById('posicaoXCarga').textContent = `X: ${formatarCoordenada(xCargaGrade)} px`;
  document.getElementById('posicaoYCarga').textContent = `Y: ${formatarCoordenada(yCargaGrade)} px`;
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

// Mover carga para X e Y 
btnMoverCarga.addEventListener('click', () => {
  if (cargaMenuSelecionada !== -1 && cargaMenuSelecionada < cargas.length) {
    let newX = parseFloat(prompt("Digite a nova coordenada X:"));
    let newY = parseFloat(prompt("Digite a nova coordenada Y:"));
    if (!isNaN(newX) && !isNaN(newY)) {
      // traduz as coordenadas do grid para coordenadas do canvas
      const origem = getGridOrigin();
      const canvasX = Math.floor(origem.x + newX);
      const canvasY = Math.floor(origem.y + newY);

      cargas[cargaMenuSelecionada].x = canvasX;
      cargas[cargaMenuSelecionada].y = canvasY;
    }
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

if (painel) {
  painel.addEventListener('mouseenter', () => {
    painelHover = true;
    atualizarPainelPotencial();
  });

  painel.addEventListener('mouseleave', () => {
    painelHover = false;
    atualizarPainelPotencial();
  });
}


/**
 * Calcula o vetor resultante do Campo Elétrico (Ex, Ey) em um ponto (px, py)
 * O campo elétrico é a soma vetorial dos campos gerados por cada carga individual.
 * O campo elétrico de uma carga pontual é dado por:
 * E = k * q / r^2
 * Onde:
 * - k é a constante eletrostática (K_CONSTANT)
 * - q é a carga elétrica
 * - r é a distância entre a carga e o ponto de interesse
 * 
 * O vetor resultante é obtido somando as componentes x e y de cada campo individual.
 * @param {number} px - Coordenada x do ponto de interesse
 * @param {number} py - Coordenada y do ponto de interesse
 * @return {Object} - Objeto com as componentes do campo elétrico: { Ex, Ey }
 */
function calcularCampoEletrico(px, py) {
  // Garante inteiros para px/py
  px = Math.floor(px);
  py = Math.floor(py);

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
    let E = (K_CONSTANT * carga.q) / r2;

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


/**
 * Calcula o Potencial Escalar (V) em um ponto (px, py)
 * @param {number} px - Coordenada x do ponto de interesse
 * @param {number} py - Coordenada y do ponto de interesse
 * @return {number} - O potencial escalar no ponto (px, py)
 */
function calcularPotencial(px, py) {
  return calcularDetalhesPotencial(px, py).V;
}

/**
 * Calcula o Potencial Escalar (V) e detalhes das contribuições de cada carga em um ponto (px, py)
 * O potencial escalar é a soma das contribuições de cada carga individual, dado por:
 * V = Σ(k * q / r)
 * Onde:
 * - k é a constante eletrostática (K_CONSTANT)
 * - q é a carga elétrica
 * - r é a distância entre a carga e o ponto de interesse
 * 
 * Cada contribuição é armazenada em um array de termos, contendo o índice da carga, a carga em si, a distância r e a contribuição individual para o potencial.
 * @param {number} px - Coordenada x do ponto de interesse
 * @param {number} py - Coordenada y do ponto de interesse
 * @return {Object} - Objeto com o potencial escalar e os detalhes das contribuições
 */
function calcularDetalhesPotencial(px, py) {
  // Garante inteiros para px/py
  px = Math.floor(px);
  py = Math.floor(py);
  
  let V = 0;
  const termos = [];
  
  cargas.forEach((carga, indice) => {
    let dx = px - carga.x;
    let dy = py - carga.y;
    let r = Math.sqrt(dx * dx + dy * dy);
    
    // Se estivermos exatamente no centro da carga, o V tenderia ao infinito.
    if (r < 5) r = 5;
    
    // V = k * q / r
    const contribuicao = (K_CONSTANT * carga.q) / r;
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

// Atualiza o painel potencial e detalhes das contribuições das cargas
function atualizarPainelPotencial() {
  if (!painel) return;

  if (!usarMultimetro || (!mouseNoCanvas && !painelHover)) {
    painel.classList.add('hidden');
    return;
  }

  const detalhes = calcularDetalhesPotencial(mouseX, mouseY);

  const canvasRect = canvas.getBoundingClientRect();
  const canvasCenter = canvasRect.left + (canvasRect.width / 2);

  // Monta expressões LaTeX
  if (detalhes.termos.length === 0) {
    painel.innerHTML = '<div class="linha-equacao">Nenhuma carga presente.</div>';
    painel.style.left = `${canvasCenter}px`;
    painel.classList.remove('hidden');
    return;
  }

  // 1) Expressão simbólica: V = \sum k q_i / r_i
  const simbolica = `V = ${detalhes.termos.map((t, i) => `\\frac{k q_{${t.carga.id}}}{r_{${t.carga.id}}}`).join(' + ')}`;

  // 2) Substituindo k, q_i e r_i
  const substituida = `V = ${detalhes.termos.map((t, i) => `\\frac{${K_CONSTANT}\\cdot(${t.carga.q > 0 ? '+' : '-'}1)}{${formatarNumero(t.r, 1)}}`).join(' + ')}`;

  // 3) Valores numéricos das contribuições
  const contribuicoes = `V \\approx ${detalhes.termos.map((t) => {
    const valorFormatado = formatarNumero(t.contribuicao, 1);
    return (t.contribuicao < 0) ? `(${valorFormatado})` : `${valorFormatado}`;
  }).join(' + ')}`;
  

  // 4) Valor total
  const total = `V \\approx ${formatarNumero(detalhes.V, 1)}\\ {Volts}`;

  // Monta o HTML com KaTeX (renderToString)
  let html = '';
  try {
    html += `<div class="linha-equacao">${katex.renderToString('\\text{Potencial Elétrico } (V)', { throwOnError: false, displayMode: false })}</div>`;
    html += `<div class="linha-equacao">${katex.renderToString(simbolica, { throwOnError: false, displayMode: false })}</div>`;
    html += `<div class="linha-equacao">${katex.renderToString(substituida, { throwOnError: false, displayMode: false })}</div>`;
    html += `<div class="linha-equacao">${katex.renderToString(contribuicoes, { throwOnError: false, displayMode: false })}</div>`;
    html += `<div class="linha-equacao">${katex.renderToString(total, { throwOnError: false, displayMode: false })}</div>`;
  } catch (e) {
    // Fallback: texto simples
    html = `<div class="linha-equacao">${simbolica}</div><div class="linha-equacao">${substituida}</div><div class="linha-equacao">${contribuicoes}</div><div class="linha-equacao">${total}</div>`;
  }

  painel.innerHTML = html;
  painel.style.left = `${canvasCenter}px`;
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

// Desenha o multímetro seguindo o ponteiro, mostrando o potencial, campo elétrico e coordenadas
function desenharMultimetro(context) {
  if (!usarMultimetro || !mouseNoCanvas) return;

  let V = calcularPotencial(mouseX, mouseY);
  let campo = calcularCampoEletrico(mouseX, mouseY);
  let grade = coordenadasDaGrade(mouseX, mouseY);

  // Calcula a magnitude do campo elétrico usando Pitágoras (|E| = sqrt(Ex^2 + Ey^2))
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

// Desenha um rastreador de mouse fixo no canto superior esquerdo, mostrando as coordenadas relativas à grade
function desenharRastreadorMouse(context) {
  if (!mouseNoCanvas) return;

  const grade = coordenadasDaGrade(mouseX, mouseY);
  const linhas = [
    `X: ${formatarCoordenada(grade.x)} px`,
    `Y: ${formatarCoordenada(grade.y)} px`,
  ];

  context.save();
  context.font = '12px monospace';
  context.textAlign = 'left';
  context.textBaseline = 'middle';

  const largura = Math.max(...linhas.map((linha) => context.measureText(linha).width)) + 20;
  const altura = 10 + linhas.length * 16;
  const x = 36;
  const y = 20;

  context.fillStyle = 'rgba(0, 0, 0, 0.52)';
  context.fillRect(x, y, largura, altura);

  context.strokeStyle = 'rgba(47,50,47,0.9)';
  context.lineWidth = 1;
  context.strokeRect(x, y, largura, altura);

  context.fillStyle = '#34d399';
  context.fillText(linhas[0], x + 10, y + 14);
  context.fillText(linhas[1], x + 10, y + 30);
  context.restore();
}

