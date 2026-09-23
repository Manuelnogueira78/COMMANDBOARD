# Tech: resposta aos pendentes

```
UNIDADE: Tech
QUEM:    Fernando Prado
DATA:    23 set 2026
```

Resposta ponto a ponto à lista "What is still missing". Os links do Drive foram encontrados pelo nome e não foram abertos. Alguns são da Motorola: se não abrirem, pedir partilha.

---

## 1. Rebrand sem material de identidade

**Não existe um deck de Branding credentials preenchido.** A pasta de submissão existe, mas está vazia: Images, Mockups, Motion e Vídeos sem ficheiros, e o doc de copy é o template em branco.
- Pasta vazia: https://drive.google.com/drive/folders/1OppDNhoahqne8Dy2bpZmp3i7uhNDVMWM

**O material de identidade existe noutro sítio.** Usar este:

| O quê | Link |
|---|---|
| `[Matter] Moto Guideline for Cards.pdf` (362MB). É a fonte principal: exportar 4 a 6 páginas como JPG (sistema, voz, aplicações) | https://drive.google.com/file/d/1biNOxe_c4xKRRR7JFhzFb47vdwoPO7F1/view |
| Pasta `01. motorola-masterbrand`: Logo (Primary Lockup, Secondary Lockup, Symbol) e Fonts | https://drive.google.com/drive/folders/1hNVkPE2JWVnYTPf8cAICxXZEhmQ-5yl2 |
| `MOTO_MANIFESTO_NO_APOLOGIES_04_1.mp4` (120MB), o manifesto da masterbrand | https://drive.google.com/file/d/1_dzp5-QqwEqAYIVUXQLThSOGM1aiYb_O/view |
| Pasta do manifesto, com `MATTER_ENERGY_MOTOROLA_AUG` e referências | https://drive.google.com/drive/folders/19uvLmU9EythRNcki65xh-G3gWvBjNKMr |
| `Matter_Credentials_General (BASE).pdf` (50MB). Pode ter páginas Motorola; verificar | https://drive.google.com/file/d/1vaN8SnTSWV8WFEhWn5xOLKQD6mC43mmd/view |

**Não encontrado:** as peças de OOH "hello moto" e "unfollow the rules" como imagem. Se não estiverem no PDF de guideline, o texto de "O que fizemos" continua a nomeá-las, mas a galeria não as mostra. Não inventar mockups.

**Ordem da galeria do rebrand:** manifesto (filme de abertura) → 2 páginas do sistema (logo e cor) → 2 páginas de voz → aplicações. O objetivo é mostrar o sistema, não afirmá-lo.

## 2. Filmes históricos com download fechado no Vimeo

- **Gx3 (2023):** o Drive tem dois cortes de 36s, `Motorola GX 3 Cancun ed10 OP2 36s TR01/TR02` (54MB, .mov). Pode não ser o corte final que está no Vimeo: comparar antes de usar.
  - https://drive.google.com/file/d/1jW7RO2BLJLLXQN7RJb4n13wGmDeW8Vc2/view
- **Power to Empower (2021):** o filme não está no Drive, só o deck `(Confidential) Motorola Power to Empower Playbook`. O filme só sai do Vimeo.
- **Solução:** quem é dono da conta Vimeo abre cada vídeo e liga Settings → Privacy (ou Distribution) → Allow downloads. Depois o ficheiro vai para `~/Downloads/vimeo/hist/`. Isto é uma ação manual do Manuel; eu não tenho acesso ao Vimeo.
- **Se não der até à publicação:** o rebrand publica sem os dois históricos. Os filmes antigos contam a história, mas não são o que prova o sistema.

## 3. Peso dos filmes (Rafaella 98s, G9 137s, New Razr 90s)

**Decisão: re-encodar, não cortar, e não usar streaming por agora.**
- Um corte de 45s é uma edição nova de um filme aprovado pelo cliente. Não fazemos isso para resolver peso.
- Encode web: 1080p H.264, CRF 26 a 28, cerca de 3 Mbps, áudio AAC 128k. Isso deixa 98s em cerca de 35MB. Acrescentar uma versão 720p a cerca de 1.5 Mbps para mobile, escolhida por `<source media>` ou por largura.
- `preload="none"`, poster obrigatório e play só no toque, em mobile. O filme só descarrega quando alguém o quer ver.
- Streaming (Mux ou Cloudflare Stream) só se, depois disto, o G9 ainda passar de 25MB em 720p.

## 4. Secção de product imagery promete o GX8, que ainda não existe

**Decisão: trocar o filme do slot por Moto Indigo.** O Indigo foi feito sem câmara, a partir de imagem existente, arquivo e texturas. É a prova real de "sem re-shoot" que já temos hoje, ao contrário do Cloud Dancer, que foi um shoot.
- `sections[2].media[0]` → `2026 MOTO INDIGO CUTDOWN COLOR AS IDENTITY 15S HORIZONTAL 16X9.mp4` (98MB, re-encodar): https://drive.google.com/file/d/19d6Jd66FXhF2K0kBICI6eJRzX8KWEMV1/view
- O texto de `sections[2]` fica como está.
- Quando o GX8 entregar (está em pós desde 21 set), o before-and-after substitui o Indigo.

## 5. Página do studio abre com muito texto antes da primeira imagem

**Decisão: uma imagem em cada coluna, usando só assets que o site já tem.**

| Secção | Media |
|---|---|
| `sections[0]` The market | `brd-cloud-dancer-01.jpg` (cor, craft e parceria: é o argumento da coluna) |
| `sections[1]` What we build | `fifa-hero.jpg` (o sistema FIFA) |
| `sections[2]` What gets handled underneath | Moto Indigo 15s (ponto 4) |
| `sections[3]` What you get | `kunumi-ev-4429.jpg` (as pessoas que ficam com o trabalho) |

Se o template só aceita media em `sections[2]`, subir o mosaico (secção 8) para logo depois da Oferta (secção 2).

## 6. Edge Neo 50

**Decisão: fica fora do site.**
- É um filme de produto de 2024, sem case escrito pelo Joao, sem papel da MATTER documentado e sem resultado. Mais um case Motorola numa página que já tem dez cases.
- Os ficheiros existem e são nossos, se um dia houver case: `2024 MOTO EDGE 50 NEO VIDEO 30S HORIZONTAL 16X9.mp4` https://drive.google.com/file/d/1tu7apM0oPp38SBohSfonyQGtFoM5TrdK/view

## 7. Fora de Tech

Nexxus, Spotify Creme, Palome, a decisão de analytics e o push não são de Tech. Ficam com os donos.

## 8. Resultados e PR do rebrand (pesquisa de 23 set)

**Não há clipping nem deck de resultados do rebrand.** O que existe:

| O quê | O que é | Link |
|---|---|---|
| `[EXT] MATTER_PR_MOTOROLA - Brand Guidelines, Final, Nov 28 2025.pdf` (85MB) | O brand book final entregue no projeto Brand VI. Melhor fonte de identidade do que o guideline de cards do ponto 1: usar este primeiro | https://drive.google.com/file/d/1HNVtOZ11NvfXCW9gt_j5Wi0D9_R4xLAt/view |
| Figma "MATTER - Motorola Brandbook - PR Story" | A história de PR do rebrand, preparada para a Jessica (For The Right Reasons) | https://www.figma.com/slides/3zbayPgv5u4zVV7puYkHhl/MATTER---Motorola-Brandbook---PR-Story |
| `MATTER+Energy, PR Pipeline` | Linha 2, "Brand VI": ângulos como o sprint de cinco dias em Lake Como. Sem press release e sem cobertura registada | https://docs.google.com/spreadsheets/d/1K6lM8BfWjDUfu09S2rzsob4CkPKmn9RXTVqOZUO9ixY/edit |
| `Matter × Motorola` (abril 2026) | Dados públicos de mercado com fontes (LatAm #2 com cerca de 20% de share; NA #1 em flip e prepaid; 50% do mercado de foldables nos EUA). É desempenho da Motorola, não resultado da MATTER | https://docs.google.com/document/d/15AW0ZjBy6JBehL4tNongO5c9spb2xjaeCB6D2iucXG0/edit |
| `On What Motorola Is Building` (maio 2026) | Pesquisa própria sobre como o público lê a marca: 2.694 posts em 7 línguas. Tem citações de consumidores, não métricas de campanha | https://docs.google.com/document/d/1y5tn17kqW5CqkyQVWyDBgGPO0chXEiza3EQR80tQcvE/edit |

**Para o site:**
- O case do rebrand foi criado a partir de um deck "Matter_Credentials_Branding (Feb 26)" que não aparece no Drive com esse nome. Pedir o ficheiro a quem montou o site em agosto.
- O número atual (+20%, best-ever 2024, #1 flip) é da Motorola. Fica atribuído à Motorola, como está no texto novo.
- Não usar os documentos internos da Motorola que aparecem no Drive (KPI deck de 2023, BrandPulse Australia). São confidenciais e são de antes do rebrand.
