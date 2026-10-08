# 🎮 Jogo de Rotina da Clarice

Um jogo web interativo estilo RPG 2D desenvolvido para ajudar a organizar e gamificar a rotina diária de uma criança. A criança controla a personagem "Clarice" em um mundo interativo onde atividades reais (como escovar os dentes, ir para a escola e ajudar em casa) geram pontos que podem ser trocados por recompensas pré-definidas pelos pais.

## ✨ Funcionalidades

* **🗺️ 5 Mapas Interativos:** Apartamento, Cidade, Escola, Corpo de Bombeiros e Igreja.
* **☀️ Ciclo Dia/Noite:** O cenário da cidade escurece e clareia automaticamente acompanhando o horário real do computador/celular.
* **📱 Rotina-Dex:** Uma central estilo Pokédex que contém o Calendário, Alarmes e uma **Lojinha de Pontos** onde a criança pode comprar recompensas.
* **⏰ Sistema de Alarmes:** Alarmes configurados fazem a tela tremer e disparam notificações interativas no horário exato para lembrar das tarefas.
* **🎶 Trilha Sonora Dinâmica:** Músicas de fundo de videogame (8-bits) que mudam suavemente quando a personagem transita entre os diferentes mapas.
* **🕹️ Suporte Mobile:** Totalmente responsivo! Funciona perfeitamente em celulares e tablets, incluindo controles direcionais (D-Pad) virtuais na tela de toque.
* **💾 Auto-Save:** O progresso, tarefas completadas e pontos são salvos automaticamente na memória do aparelho (localStorage).

## 🛠️ Tecnologias Utilizadas

* **HTML5 Canvas** (Para renderização do mapa e spritesheet dos personagens)
* **CSS3** (Estilização, animações e responsividade da interface)
* **JavaScript (Vanilla)** (Lógica do motor de jogo, sistema de colisões e eventos)
* **WebAudio API** (Sintetização de efeitos sonoros retrô como pegar moedas, alertas e conversas)

## 🚀 Como Jogar

Por ser um jogo construído inteiramente com tecnologias web estáticas, não é necessário instalar nenhum programa!
  
1. Clone este repositório ou baixe a pasta em ZIP.
2. Como o projeto usa músicas dinâmicas, coloque suas próprias faixas `.mp3` na pasta `assets/` (Ex: `bgm_casa.mp3`, `bgm_cidade.mp3`, `bgm_escola.mp3`, `bgm_igreja.mp3`, `bgm_bombeiro.mp3`).
3. Abra o arquivo `index.html` em qualquer navegador web moderno.
4. (Opcional) Faça o deploy da pasta gratuitamente em plataformas estáticas como **Netlify** ou **GitHub Pages** para jogar de qualquer lugar.

---
*Desenvolvido por Tiago Lima.*
