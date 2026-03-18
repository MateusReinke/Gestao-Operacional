

# Sistema de Gestão Operacional (SGO) — Frontend

## Visão Geral
Frontend React completo com todas as telas, navegação, e dados mock. Design seguindo o briefing: cockpit denso, tipografia Geist, paleta operacional com tons neutros e frios.

## Design System
- Fonte: Geist + Geist Mono para números
- Paleta: background cinza suave, foreground navy, primary azul ação, status emerald/amber
- Cards com box-shadow sutil (sem bordas sólidas), radius 12px/8px
- Transições 150ms cubic-bezier
- Skeletons no lugar de spinners

## Autenticação (Mock)
- Tela de login com JWT simulado (localStorage)
- Perfis: Admin (acesso total) e Gestor (apenas suas equipes)
- Redirecionamento baseado em role

## Layout Principal
- Sidebar fixa com navegação: Dashboard, Clientes, Equipes, Colaboradores, Gestores, Escalas, Plantões, Férias
- Header com info do usuário logado e logout
- Conteúdo principal responsivo

## Páginas

### 1. Dashboard ("Plantão Atual")
- Grid de DutyCards mostrando quem está de plantão agora
- Cada card: nome do cliente, colaborador ativo, tipo de turno, próximo plantonista
- Hover com elevação sutil (framer-motion)

### 2. Clientes
- Tabela paginada com busca e filtros
- Colunas: nome, WhatsApp ID, escalation, responsável interno, status
- Sheet lateral para criar/editar (sem modais)
- Itens inativos visualmente desaturados

### 3. Equipes
- Lista de equipes com vínculo a cliente (opcional)
- Visualização dos colaboradores de cada equipe
- CRUD via sheet lateral

### 4. Colaboradores
- Tabela com filtros por equipe, modelo de trabalho, status
- Campos: nome, email, telefone, equipe, tipo contrato, modelo trabalho
- Indicador visual de férias/disponível/em plantão

### 5. Gestores
- Lista de gestores com suas equipes vinculadas
- Gestão do relacionamento gestor ↔ equipes

### 6. Escalas
- Tipos: 12x36, 5x2, personalizada
- Detalhes com dia da semana, hora início/fim
- Vinculação de colaboradores a escalas com datas

### 7. Plantões (Calendário)
- Visualização mensal tipo calendário
- Dias com férias em cinza com padrão diagonal
- Conflito férias × plantão = toast destrutivo
- Múltiplos colaboradores por turno

### 8. Férias
- Tabela com colaborador, datas, status
- Validação: bloqueia escala durante férias

## Dados Mock
- Serviço de dados em memória simulando a API
- Colaboradores, equipes, clientes, escalas e plantões de exemplo
- Lógica de "quem está de plantão agora" funcionando com hora real

## Padrões
- Paginação com "itens por página" (sem infinite scroll)
- Sheet lateral para formulários (sem modais)
- Empty states com mensagens em português profissional
- Toasts para feedback de ações

