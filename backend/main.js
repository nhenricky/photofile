



const DB_NAME = "PhotofileDB";
const DB_VERSION = 1;
const STORE_NAME = "fotos";

// Inicializa a galeria quando o HTML estiver carregado
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await carregarGaleria();
    } catch (erro) {
        console.error("Erro ao carregar a galeria:", erro);
        alert("Não foi possível carregar a galeria.");
    }
});

// Evento para adicionar foto
document.getElementById("add-btn").addEventListener("click", adicionarFoto);

// Abre ou cria o banco de dados IndexedDB
function abrirBanco() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function (event) {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                    autoIncrement: true
                });

                store.createIndex("ordem", "ordem", {
                    unique: false
                });
            }
        };

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}

// Obtém todas as fotos armazenadas
async function obterFotosDoStorage() {
    const db = await abrirBanco();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = function () {
            const fotos = request.result.sort((a, b) => a.ordem - b.ordem);
            resolve(fotos);
        };

        request.onerror = function () {
            reject(request.error);
        };

        transaction.oncomplete = function () {
            db.close();
        };

        transaction.onerror = function () {
            db.close();
        };
    });
}

// Carrega e exibe as fotos
async function carregarGaleria() {
    const fotos = await obterFotosDoStorage();
    const gallery = document.getElementById("gallery");

    gallery.innerHTML = "";

    fotos.forEach((foto, index) => {
        criarElementoFoto(foto, index);
    });
}

// Adiciona uma nova foto ao IndexedDB
async function adicionarFoto() {
    const input = document.getElementById("upload");
    const file = input.files[0];

    if (!file) {
        alert("Selecione uma imagem primeiro!");
        return;
    }

    if (!file.type.startsWith("image/")) {
        alert("Selecione um arquivo de imagem válido!");
        return;
    }

    try {
        const db = await abrirBanco();

        await new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);

            const request = store.add({
                nome: file.name,
                tipo: file.type,
                tamanho: file.size,
                imagem: file,
                ordem: Date.now() + Math.random()
            });

            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);

            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });

        db.close();

        input.value = "";
        await carregarGaleria();
    } catch (erro) {
        console.error("Erro ao adicionar foto:", erro);
        alert(
            "Não foi possível salvar a foto. " +
            "Verifique o espaço disponível no navegador."
        );
    }
}

// Cria o elemento visual de cada foto
function criarElementoFoto(foto, index) {
    const gallery = document.getElementById("gallery");

    const item = document.createElement("div");
    item.classList.add("gallery-item");

    const img = document.createElement("img");

    // IndexedDB armazena o arquivo diretamente, sem Base64
    const urlImagem = URL.createObjectURL(foto.imagem);
    img.src = urlImagem;
    img.alt = foto.nome || "Foto da galeria";

    // Libera a memória quando a imagem sair da galeria
    img.onload = function () {
        URL.revokeObjectURL(urlImagem);
    };

    img.onerror = function () {
        URL.revokeObjectURL(urlImagem);
        console.error("Não foi possível exibir:", foto.nome);
    };

    const btn = document.createElement("button");
    btn.classList.add("delete-btn");
    btn.innerHTML = "&times;";
    btn.type = "button";
    btn.setAttribute("aria-label", "Excluir foto");

    btn.onclick = async function () {
        await deletarFoto(foto.id);
    };

    item.appendChild(img);
    item.appendChild(btn);
    gallery.appendChild(item);
}

// Exclui uma foto pelo ID no IndexedDB
async function deletarFoto(id) {
    try {
        const db = await abrirBanco();

        await new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);

            store.delete(id);

            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });

        db.close();

        await carregarGaleria();
    } catch (erro) {
        console.error("Erro ao excluir foto:", erro);
        alert("Não foi possível excluir a foto.");
    }
}
