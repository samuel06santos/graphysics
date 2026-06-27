# [GraPhysics](https://samuel06santos.github.io/graphysics/)

<div style="display: flex; align-items: center; justify-content: center;">
  <img src="./public/images/graphysics-logo.png" alt="GraPhysics Logo" width="200"/>
</div>

**Simulador Interativo de Campos Elétricos e Potencial Elétrico**

O **GraPhysics** é uma aplicação web educacional e interativa focada na simulação realista do comportamento de cargas pontuais em um campo eletrostático. O projeto une computação gráfica através da API do Canvas HTML5 com cálculos matemáticos e físicos executados puramente em JavaScript. 

Criado com o intuito de facilitar o ensino e a visualização de grandezas físicas invisíveis, o GraPhysics atua como um laboratório virtual heurístico, ideal para estudantes e professores de Física que desejam observar e testar os princípios do eletromagnetismo de forma didática, sem a necessidade de instalar plugins pesados.

Disponível em [https://samuel06santos.github.io/graphysics/](https://samuel06santos.github.io/graphysics/)

---

## Tecnologias Utilizadas

Este projeto foi desenvolvido adotando uma arquitetura *client-side* (processamento inteiramente no navegador), utilizando as seguintes tecnologias:

* **HTML5 Canvas:** Motor principal para a renderização gráfica 2D (vetores, cargas e heatmap).
* **Vanilla JavaScript (ES6+):** Lógica da aplicação, física matemática e manipulação do DOM.
* **Tailwind CSS (v4):** Framework CSS para construção de uma interface responsiva, utilizando design moderno com *glassmorphism*.
* **KaTeX:** Biblioteca veloz para renderização tipográfica e matematicamente precisa de fórmulas e equações físicas direto na tela do usuário.
* **Font Awesome & Material Symbols:** Para os ícones de interface de usuário.

---

## Funcionalidades

- **Interação Intuitiva (Drag & Drop):** Adicione cargas positivas (prótons, vermelho) e negativas (elétrons, azul) e arraste-as livremente pelo espaço simulado.
- **Menu de Contexto de Cargas:** Clique com o botão direito sobre qualquer carga inserida para abrir opções avançadas, como mover para coordenadas exatas (X, Y) ou excluí-la.
- **Mapa de Calor (Heatmap de Potencial Escalar):** Visualização topográfica onde cores quentes (vermelho) indicam áreas de alto potencial positivo e cores frias (azul) indicam vales de potencial negativo. Áreas escuras apontam regiões de potencial nulo ($V = 0$).
- **Grade Vetorial Interativa:** Representação em tempo real do vetor Campo Elétrico ($\vec{E}$). A opacidade das setas brancas ilustra dinamicamente a intensidade da força em cada ponto.
- **Multímetro (Ponta de Prova Virtual):** Um sensor acoplado ao ponteiro do mouse que calcula e exibe instantaneamente a posição $(x,y)$ na grade, o valor do Potencial em Volts ($V$) e a magnitude do Campo em Volts por metro ($V/m$).
- **Seletor de Meio Material (Constante Dielétrica):** Simule como diferentes materiais (Vácuo, Óleo, Borracha, Vidro, Silício, Água, etc.) atenuam a força do campo elétrico ao alterar a permissividade relativa ($\kappa$).

---

## Como a Física Funciona

A *engine* do simulador baseia-se estritamente no **Princípio da Superposição**. Para cada pixel analisado na tela, o sistema realiza o somatório das contribuições individuais de cada partícula presente usando as leis da eletrostática clássica.

### Potencial Elétrico (Grandeza Escalar)
O potencial $V$ no espaço é dado pela soma algébrica:

$$V = k \sum_{i=1}^{n} \frac{q_i}{r_i}$$

Onde:
* $k$: constante eletrostática do meio selecionado.
* $q_i$: valor da i-ésima carga (incluindo seu sinal, em Coulombs).
* $r_i$: distância entre a carga e o ponto de interesse (em metros).
> *Nota: Por ser uma grandeza escalar, potenciais gerados por cargas de sinais opostos podem se anular em certos pontos do espaço (representado pelas áreas pretas no Heatmap).*

### Campo Elétrico (Grandeza Vetorial)
A magnitude e direção da força resultante em um ponto do espaço:

$$\vec{E}_{total} = \sum_{i=1}^{n} \vec{E}_i = \sum_{i=1}^{n} \left( k \frac{q_i}{r_i^2} \hat{r}_i \right)$$

O simulador decompõe continuamente esses vetores nas coordenadas ortogonais ($X$ e $Y$) para realizar a soma vetorial antes de renderizar as hastes brancas na tela. A unidade de medida lida pelo sensor é o **V/m** (Volt por metro), que é dimensionalmente equivalente a N/C (Newton por Coulomb).

---

### Autor
Desenvolvido por João Samuel Dias Santos [@samuel06santos](https://github.com/samuel06santos) como parte prática da disciplina de Física para Computação (Sistemas de Informação) - UFPA [Lattes](http://lattes.cnpq.br/1763125013579875)

Com a orientação e feedbacks do professor Dr. Leandro Oliveira do Nascimento [Lattes](http://lattes.cnpq.br/1873253517088633)
