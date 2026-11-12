# 📸 Fotomania — Catálogo Digital

<div align="center">

**Suas lembranças, do seu jeito.**

Um catálogo digital para explorar produtos fotográficos personalizados e realizar pedidos de forma simples e intuitiva.

🔗 **[Acessar o site](https://cipher-169.github.io/catalogo-loja/)**

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-ff916b?style=for-the-badge)
![Firebase](https://img.shields.io/badge/Firebase-integrado-FFCA28?style=for-the-badge&logo=firebase&logoColor=111827)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-f1c879?style=for-the-badge&logo=javascript&logoColor=111827)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)

</div>

<!-- Coloque aqui um print da tela principal: ![Print do catálogo](img/print.png) -->

---

## ✨ Sobre o projeto

A **Fotomania** é uma aplicação web desenvolvida para modernizar a apresentação e a comercialização de produtos fotográficos personalizados.

O projeto reúne um catálogo digital, recursos de personalização e uma sacola de compras, permitindo que os clientes explorem os produtos, consultem preços e encaminhem seus pedidos diretamente pelo WhatsApp.

Além da experiência voltada aos clientes, a aplicação possui um painel administrativo próprio para gerenciar produtos, categorias e imagens do catálogo.

## 📸 Funcionalidades

**Catálogo e produtos**
- Exibição dinâmica de produtos e categorias.
- Visualização de imagens e detalhes dos produtos.
- Produtos personalizados com opções configuráveis.
- Apresentação de preços e condições de compra.

**Personalização e pedidos**
- Seleção de opções e quantidades.
- Inserção manual de quantidades.
- Cálculo automático de subtotais e valores.
- Preços progressivos para produtos elegíveis.
- Sacola de compras com resumo do pedido.
- Redirecionamento para o WhatsApp para finalizar a solicitação.

**Painel administrativo**
- Autenticação de administradores.
- Controle de acesso por usuários autorizados.
- Cadastro, edição e exclusão de produtos.
- Gerenciamento de categorias.
- Publicação e despublicação de produtos.
- Gerenciador de imagens com visualização e pesquisa.
- Exclusão manual de imagens sem vínculo com produtos, mediante confirmação e validação no servidor.

**Experiência do usuário**
- Interface responsiva.
- Tema claro e escuro.
- Persistência da preferência de tema.
- Apresentação adaptada para diferentes dispositivos.

## 🛍️ Sistema de preços e personalização

Um dos diferenciais do projeto é a possibilidade de configurar produtos com diferentes opções e regras de preço.

Nos produtos fotográficos elegíveis, o sistema utiliza **preços progressivos por quantidade**, permitindo que o valor unitário varie conforme a quantidade solicitada dentro de cada faixa.

O cálculo considera separadamente os tamanhos e as respectivas quantidades, evitando combinar produtos de dimensões diferentes para alcançar uma faixa de preço.

## 🧩 Tecnologias

- **HTML5, CSS3 e JavaScript** para a estrutura, interface e lógica da aplicação.
- **Firebase Authentication** para autenticação administrativa.
- **Cloud Firestore** para armazenamento e gerenciamento dos dados.
- **ImageKit** para armazenamento e entrega de imagens.
- **Cloudflare Workers** para operações protegidas no servidor e intermediação de uploads.
- **GitHub Pages** para hospedagem da aplicação.

A arquitetura utiliza serviços independentes para separar a interface pública, os dados do catálogo, o armazenamento de imagens e as operações que exigem validação no servidor.

## 🔐 Segurança

O projeto utiliza mecanismos de controle de acesso para proteger as funcionalidades administrativas e operações sensíveis.

- Autenticação por Firebase Authentication.
- Autorização baseada em UIDs previamente definidos.
- Verificação de identidade e permissões no Cloudflare Worker.
- Credenciais privadas mantidas no ambiente do servidor.
- Validação de operações de gerenciamento de imagens.

Tokens, chaves privadas e outras credenciais sensíveis não devem ser disponibilizados neste repositório.

## 🚀 Próximos passos

O projeto continua em evolução, com possibilidades de expansão planejadas:

- Recebimento de fotografias dos clientes diretamente pelo site.
- Integração com meios de pagamento online.
- Gerenciamento ampliado de pedidos e processos de produção.
- Melhorias contínuas na experiência administrativa.

## 📌 Projeto

- **Aplicação:** [Fotomania — Catálogo Digital](https://cipher-169.github.io/catalogo-loja/)
- **Repositório:** [GitHub — catalogo-loja](https://github.com/Cipher-169/catalogo-loja)

---

<div align="center">

Desenvolvido para a **Fotomania**.

*Suas lembranças, do seu jeito.* 📸

</div>
