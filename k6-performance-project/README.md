Com base no arquivo **Orientações Desafio.txt**, o README é a parte mais crítica da sua entrega. O documento diz explicitamente: *"Se o script estiver perfeito, mas o README não demonstrar onde os conceitos foram aplicados no código, você perderá pontos"* .

Abaixo está o **README.md completo**, formatado exatamente conforme as exigências (apresentando os trechos de código e explicando os conceitos).

Você pode copiar e colar este conteúdo diretamente no seu arquivo `README.md`.

---

# Desafio de Performance com K6

Este repositório contém a resolução do desafio de testes de performance, validando a API **Serverest**. O projeto utiliza o framework **k6** para simular carga e validar requisitos de infraestrutura e performance da aplicação.

## 📂 Arquitetura do Projeto

O projeto segue a estrutura solicitada, organizando os testes dentro do diretório `test/k6` :

```text
├── test/
│   └── k6/
│       ├── data/
│       │   └── produtos.json       # Massa de dados (Data-Driven)
│       ├── modules/
│       │   └── helpers.js          # Funções auxiliares e Faker
│       └── desafio-performance.js  # Script principal do teste
├── README.md                       # Documentação dos conceitos
└── relatorio_k6.html               # Relatório de execução

```

## 🚀 Como Executar

Para rodar o teste e gerar o relatório HTML, execute o comando abaixo na raiz do projeto:

```bash
k6 run test/k6/desafio-performance.js

```

Para alterar a URL alvo via variável de ambiente:

```bash
k6 run -e URL_BASE=https://serverest.dev test/k6/desafio-performance.js

```

---

## 🛠 Conceitos Aplicados

Conforme solicitado no desafio, abaixo demonstro como cada um dos conceitos exigidos foi implementado no código .

### 1. Stages

Utilizei `stages` nas `options` para definir o perfil de carga, simulando um ramp-up (subida), carga constante e ramp-down (descida).

```javascript
// test/k6/desafio-performance.js
stages: [
    { duration: '5s', target: 5 },  // Ramp-up para 5 VUs
    { duration: '10s', target: 5 }, // Carga constante
    { duration: '5s', target: 0 },  // Ramp-down
],

```

### 2. Thresholds

Defini critérios de aceitação para o teste. Se a taxa de erros for > 1% ou se 95% das requisições demorarem mais que 500ms (ou 3000ms ajustado), o teste será considerado falho.

```javascript
// test/k6/desafio-performance.js
thresholds: {
    http_req_failed: ['rate<0.01'], 
    http_req_duration: ['p(95)<3000'], // Tolerância para API pública
    login_duration: ['p(99)<3000']     // Trend customizada
}

```

### 3. Checks

Utilizei `check` para validar se as respostas HTTP retornam os status esperados (200 ou 201) e se o corpo da resposta contém os dados necessários.

```javascript
// test/k6/desafio-performance.js
check(resLogin, {
    'login realizado': (r) => r.status === 200,
    'tem token': (r) => r.json('authorization') !== '',
});

```

### 4. Helpers e Faker

Para gerar dados dinâmicos e evitar código duplicado, criei o arquivo `helpers.js`. Ele simula uma biblioteca "Faker" gerando usuários aleatórios.

```javascript
// test/k6/modules/helpers.js
export function gerarUsuarioAleatorio() {
    const randomID = Math.floor(Math.random() * 1000000);
    return {
        nome: `User K6 ${randomID}`,
        email: `k6_${randomID}@qa.com.br`,
        // ...
    };
}

```

### 5. Groups

Organizei o fluxo lógico do teste em blocos nomeados usando `group`, separando a autenticação das operações de produtos para facilitar a leitura do relatório.

```javascript
// test/k6/desafio-performance.js
group('Criação de Usuário e Login', function () {
   // ... Lógica de login
});

group('Operações de Produtos (Data Driven)', function () {
   // ... Lógica de produtos
});

```

### 6. Variável de Ambiente

A URL base não é fixa. Utilizei `__ENV` para permitir a injeção da URL via linha de comando, facilitando a troca entre ambientes (Dev, QA, Prod).

```javascript
// test/k6/desafio-performance.js
const BASE_URL = __ENV.URL_BASE || 'https://serverest.dev';

```

### 7. Uso de Token e Reaproveitamento de Resposta

Implementei a correlação: extraio o token da resposta do login e o armazeno em uma variável para ser reutilizado no header das requisições seguintes.

```javascript
// test/k6/desafio-performance.js
// 1. Extração (Reaproveitamento)
token = resLogin.json('authorization');

// 2. Uso do Token (via Helper)
const params = obterHeaderAuth(token);
const resProd = http.post(`${BASE_URL}/produtos`, payload, params);

```

### 8. Data-Driven Testing

Utilizei `SharedArray` para carregar um arquivo JSON externo (`produtos.json`), permitindo que o teste itere sobre uma massa de dados pré-definida.

```javascript
// test/k6/desafio-performance.js
const dadosProdutos = new SharedArray('produtos', function () {
    return JSON.parse(open('./data/produtos.json'));
});
// Uso no loop:
const produto = dadosProdutos[Math.floor(Math.random() * dadosProdutos.length)];

```

### 9. Trends

Criei uma métrica personalizada (`Trend`) chamada `login_duration` para monitorar especificamente o tempo de resposta do endpoint de login, separado da média geral.

```javascript
// test/k6/desafio-performance.js
const loginDuration = new Trend('login_duration');

// Adicionando métrica durante a execução
loginDuration.add(resLogin.timings.duration);

```

---

## 📊 Relatório

Após a execução, um arquivo `relatorio_k6.html` é gerado automaticamente na raiz do projeto contendo o dashboard detalhado da execução.