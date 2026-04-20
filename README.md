# 🛒 Mercado Livre Manager

Aplicação full stack para **gerenciamento de anúncios no Mercado Livre**, permitindo criação, edição, sincronização e reconciliação entre o estado local e o marketplace.

---

## 🚀 Demo

* 🌐 Frontend: https://mercado-livre-manager-two.vercel.app
* 🔧 Backend: https://mercado-livre-manager-api.onrender.com

---

## 📌 Funcionalidades

### 🔐 Autenticação

* Login via OAuth com Mercado Livre
* Armazenamento de tokens com refresh automático

### 📦 Gestão de anúncios

* Criar anúncios
* Editar título, preço e estoque
* Excluir anúncios
* Listar anúncios com filtros

### 🔄 Sincronização

* Envio de anúncios para o Mercado Livre
* Atualização de dados remotos
* Controle de status:

  * `pending`
  * `synced`
  * `error`
  * `conflict`

### 🔍 Reconciliação

* Comparação entre:

  * estado local (MongoDB)
  * estado remoto (Mercado Livre)
* Identificação de divergências

### 📜 Logs de sincronização

* Histórico completo por anúncio
* Armazena:

  * request enviado
  * resposta da API
  * erros
  * ações executadas

### 📊 Dashboard

* Métricas:

  * total de anúncios
  * sincronizados
  * pendentes
  * conflitos

---

## 🧠 Arquitetura

### Backend

* Node.js + Express
* MongoDB (Atlas)
* Integração com API do Mercado Livre

### Frontend

* React (Vite)
* Axios
* SPA (Single Page Application)

### Deploy

* Backend: Render
* Frontend: Vercel

---

## 🗂 Estrutura do projeto

```
mercado-livre-manager/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── pages/
│   │   └── main.jsx
```

---

## ⚙️ Variáveis de ambiente

### Backend (.env)

```
PORT=5000
MONGO_URI=your_mongodb_uri

ML_APP_ID=your_app_id
ML_CLIENT_SECRET=your_secret
ML_REDIRECT_URI=https://mercado-livre-manager-api.onrender.com/api/auth/callback

FRONTEND_URL=https://mercado-livre-manager-two.vercel.app
```

### Frontend (Vercel)

```
VITE_API_URL=https://mercado-livre-manager-api.onrender.com/api
```

---

## 🧪 Como inserir dados

Para criar anúncios, o sistema utiliza um formulário com campos básicos e um campo de **atributos em JSON**.

### 🧾 Campos básicos

* **Título**
* **Preço**
* **Quantidade**
* **Categoria (ID)**
* **Imagem (URL pública direta)**

---

## ⚙️ Atributos (JSON)

Os atributos devem ser informados como um array JSON:

```json
[
  { "id": "BRAND", "value_name": "Redragon" },
  { "id": "MODEL", "value_name": "M711" },
  { "id": "COLOR", "value_name": "Preto" }
]
```

---

### 📌 Observações

* Os atributos variam por categoria
* JSON inválido impede o envio
* Os IDs devem seguir o padrão da API do Mercado Livre

---

## 🧠 Como os atributos variam por categoria

Os atributos de um anúncio **não são fixos** e dependem da categoria do produto.

### Exemplo simples (Mouse)

```json
[
  { "id": "BRAND", "value_name": "Redragon" },
  { "id": "MODEL", "value_name": "M711" }
]
```

### Exemplo complexo (Celular)

```json
[
  { "id": "BRAND", "value_name": "Samsung" },
  { "id": "MODEL", "value_name": "Galaxy A15" },
  { "id": "RAM", "value_name": "4 GB" },
  { "id": "INTERNAL_MEMORY", "value_name": "128 GB" },
  { "id": "GTIN", "value_name": "XXXXXXXXXXXX" }
]
```

---

### ⚠️ Desafios

* Cada categoria exige atributos diferentes
* Alguns atributos possuem validação (GTIN, Anatel)
* A API pode rejeitar dados incompletos

---

### 💡 Limitação atual

Os atributos são inseridos manualmente via JSON, o que não é ideal para usuários finais.

---

### 🚀 Melhorias futuras

* Formulário dinâmico baseado na categoria
* Integração com API de atributos do Mercado Livre
* Validação automática
* Autocomplete

---

## 🔁 Fluxo de sincronização

1. Usuário cria anúncio local
2. Dados são salvos no MongoDB
3. Usuário aciona sincronização
4. Backend envia para API do Mercado Livre
5. Resposta é persistida
6. Log de sincronização é registrado

---
## ⚠️ Tratamento de cenários reais

### ✔ Duplicidade

* Verificação por título

### ✔ Falhas externas

* Captura de erro da API
* Persistência em `SyncLog`

### ✔ Concorrência

* Controle com `localVersion`

### ✔ Divergência

* Reconciliação manual
* Status `conflict`

---

🔐 Autenticação com Mercado Livre
A autenticação com o Mercado Livre foi implementada com foco em demonstração da integração OAuth e das funcionalidades principais do sistema.
Na versão atual:
O token de acesso é armazenado de forma centralizada no backend
Não há isolamento por sessão ou por usuário da aplicação
Como consequência, a aplicação pode exibir a última conta conectada, independentemente do cliente que acessa o sistema

---

## 📌 Melhorias futuras

* Retry automático de sincronização
* Upload de imagem direto
* Busca dinâmica de categorias
* Dashboard avançado
* Paginação

---

## 👨‍💻 Autor

Desenvolvido por Anthony 🚀
