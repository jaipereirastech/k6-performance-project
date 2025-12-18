// Simula o comportamento de uma lib como Faker
export function gerarUsuarioAleatorio() {
    const randomID = Math.floor(Math.random() * 1000000);
    return {
        nome: `User K6 ${randomID}`,
        email: `k6_desafio_${randomID}@qa.com.br`,
        password: "teste",
        administrador: "true"
    };
}

export function obterHeaderAuth(token) {
    return {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        }
    };
}