import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { SharedArray } from 'k6/data';
import { gerarUsuarioAleatorio, obterHeaderAuth } from './modules/helpers.js';

// 1. Conceito: Trends (Métrica customizada para tempo de login)
const loginDuration = new Trend('login_duration');

// 2. Conceito: Data-Driven Testing (Carregando massa de dados)
const dadosProdutos = new SharedArray('produtos', function () {
    return JSON.parse(open('./data/produtos.json'));
});

// 3. Conceito: Variável de Ambiente (Definir URL base via linha de comando ou default)
// Uso: k6 run -e URL_BASE=https://serverest.dev script.js
const BASE_URL = __ENV.URL_BASE || 'https://serverest.dev';

export const options = {
    // 4. Conceito: Stages (Ramp-up e Ramp-down de carga)
    stages: [
        { duration: '5s', target: 5 },  // Sobe para 5 VUs
        { duration: '10s', target: 5 }, // Mantém 5 VUs
        { duration: '5s', target: 0 },  // Desce para 0
    ],
    // 5. Conceito: Thresholds (Critérios de aceitação)
    thresholds: {
        http_req_failed: ['rate<0.01'], 
        // Aumentando para 3000ms (3 segundos) para tolerar a lentidão da API pública
        http_req_duration: ['p(95)<3000'], 
        login_duration: ['p(99)<3000'] 
    }
};

export default function () {
    let token;
    let usuario = gerarUsuarioAleatorio(); // Uso do Helper/Faker

    // 6. Conceito: Groups (Organização lógica)
    group('Criação de Usuário e Login', function () {
        
        // Passo 1: Criar usuário
        const resCreate = http.post(`${BASE_URL}/usuarios`, JSON.stringify(usuario), {
            headers: { 'Content-Type': 'application/json' },
        });
        
        // 7. Conceito: Checks (Validações)
        check(resCreate, {
            'usuario criado com sucesso': (r) => r.status === 201,
        });

        // Passo 2: Login
        const resLogin = http.post(`${BASE_URL}/login`, JSON.stringify({
            email: usuario.email,
            password: usuario.password
        }), {
            headers: { 'Content-Type': 'application/json' },
        });

        // Alimentando a Trend customizada
        loginDuration.add(resLogin.timings.duration);

        check(resLogin, {
            'login realizado': (r) => r.status === 200,
            'tem token': (r) => r.json('authorization') !== '',
        });

        // 8. Conceito: Reaproveitamento de Resposta e Token de Autenticação
        // Extraímos o token da resposta anterior para usar nas próximas
        token = resLogin.json('authorization');
    });

    group('Operações de Produtos (Data Driven)', function () {
        // Itera sobre o JSON de produtos
        const produto = dadosProdutos[Math.floor(Math.random() * dadosProdutos.length)];
        
        // Usa o Helper para montar o header com o Token capturado acima
        const params = obterHeaderAuth(token);
        
        const payload = JSON.stringify({
            nome: `${produto.nome} ${Date.now()}`, // Garante unicidade
            preco: produto.preco,
            descricao: "Produto teste k6",
            quantidade: 10
        });

        const resProd = http.post(`${BASE_URL}/produtos`, payload, params);

        check(resProd, {
            'produto cadastrado': (r) => r.status === 201,
        });
    });

    sleep(1);
}

// 9. Relatório HTML (Necessário para o entregável)
export function handleSummary(data) {
    return {
        "relatorio_k6.html": htmlReport(data),
    };
}