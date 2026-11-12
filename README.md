# Fotomania — Catálogo Digital

<p align="center">
  <strong>Suas lembranças, do seu jeito.</strong>
</p>

<p align="center">
  Um catálogo digital para apresentar produtos fotográficos personalizados, facilitar a escolha dos clientes e otimizar o processo de solicitação de pedidos.
</p>

<p align="center">
  <a href="https://cipher-169.github.io/catalogo-loja/">Acessar projeto</a>
</p>

---

## Sobre o projeto

A **Fotomania** é uma aplicação web desenvolvida para uma loja de produtos fotográficos personalizados. O projeto busca modernizar a apresentação dos produtos e proporcionar uma experiência de navegação simples, intuitiva e acessível.

A aplicação permite que os clientes explorem o catálogo, consultem informações e preços, personalizem produtos, organizem suas escolhas em uma sacola e encaminhem seus pedidos diretamente pelo WhatsApp.

Além da interface voltada aos clientes, o projeto conta com um painel administrativo para gerenciamento do catálogo, permitindo que os responsáveis pela loja mantenham produtos e categorias atualizados.

## Funcionalidades

### Catálogo de produtos
- Exibição dinâmica de produtos e categorias.
- Consulta de informações, imagens e preços.
- Produtos personalizados com opções configuráveis.
- Suporte a diferentes modalidades de produtos fotográficos.

### Personalização e pedidos
- Seleção de opções e quantidades.
- Campo para inserção manual de quantidades.
- Cálculo automático de preços e subtotais.
- Aplicação de preços progressivos para produtos elegíveis.
- Sacola de compras com resumo do pedido.
- Integração com WhatsApp para encaminhamento dos pedidos.

### Painel administrativo
- Autenticação de usuários administradores.
- Controle de acesso por usuários autorizados.
- Cadastro, edição e exclusão de produtos.
- Gerenciamento de categorias.
- Publicação e despublicação de produtos.
- Gerenciamento de imagens utilizadas no catálogo.

### Experiência do usuário
- Interface responsiva.
- Tema claro e escuro.
- Persistência das preferências de tema.
- Tratamento de imagens e apresentação adaptável a diferentes dispositivos.

## Tecnologias utilizadas

| Tecnologia | Aplicação |
|---|---|
| HTML5 | Estrutura da aplicação |
| CSS3 | Estilização e responsividade |
| JavaScript | Lógica e interatividade |
| Firebase Authentication | Autenticação administrativa |
| Cloud Firestore | Armazenamento de produtos e categorias |
| ImageKit | Armazenamento e entrega de imagens |
| Cloudflare Workers | Processamento seguro de operações no servidor |
| GitHub Pages | Hospedagem da aplicação |

## Arquitetura

A aplicação utiliza uma arquitetura baseada em serviços, separando a interface do usuário, o armazenamento de dados e as operações que exigem processamento no servidor.

- **Frontend:** interface construída com HTML, CSS e JavaScript.
- **Firebase:** gerenciamento de autenticação e persistência dos dados do catálogo.
- **ImageKit:** armazenamento e disponibilização das imagens dos produtos.
- **Cloudflare Workers:** intermediação de operações protegidas, incluindo o processamento de uploads.
- **GitHub Pages:** disponibilização pública da aplicação.

## Acesso ao projeto

**Aplicação em produção:**

https://cipher-169.github.io/catalogo-loja/

O catálogo pode ser acessado publicamente. As funcionalidades administrativas são restritas a usuários autorizados.

## Segurança

O projeto adota medidas para proteger operações administrativas e credenciais de serviços externos.

Entre elas:

- Controle de acesso administrativo por identificação de usuários autorizados.
- Verificação de autenticação nas operações protegidas.
- Utilização de Cloudflare Workers para intermediar operações sensíveis.
- Separação de credenciais privadas do código público do frontend.

**Observação:** credenciais privadas e configurações sensíveis não devem ser disponibilizadas no repositório.

## Desenvolvimento

O projeto está em evolução contínua, com foco na melhoria da experiência do cliente, na organização dos processos administrativos e na expansão gradual das funcionalidades.

---

<p align="center">
  Desenvolvido para a <strong>Fotomania</strong>.
</p>
