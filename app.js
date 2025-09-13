//Requisições das constantes
const express = require("express");
const app = express();
const porta = 3000;
const ipDoServidor = "127.0.0.1";

//habilitar leitura de dados no express
app.use(express.urlencoded({ extended: true }));
//Conexão com o SGBD
const { Pool } = require("pg");
const pool = new Pool({
  //aqui é feita a conexão
  user: "postgres",
  host: "localhost",
  database: "noticiasBage",
  password: "postgres",
  port: 5432,
});

//raiz

app.get("/", function (req, res) {
  res.send(`
      <html>
        <head>
          <title>Portal de Notícias Bagé</title>
          <style>
            body {
              font-family: Arial, Helvetica, sans-serif;
              padding: 20px;
              background-color: #f9f9f9;
            }
            h1 {
              color: #333;
            }
            ul {
              list-style: none;
              padding: 0;
            }
            li {
              margin: 10px 0;
            }
            a{
              text-decoration: none; color: #007bff; font-weight: bold;
            }
            a:hover{text-decoration: underline;}
            
            form{
              margin-top: 30px;
            }
            input[type="number"]{
            padding: 10px;
            width: 250px;
            border: 2px solid #007bff;
            font-size: 16px;
            transition: border-color 0.3s;
            }
            button{
            padding: 10px 20px;
            margin-left: 10px;
            background-color: #007bff;
            color:white;
            border:none;
            font-size: 16px;
            cursor; pointer;
            transition: background-color 0.3s;
            }
            button:hover {
            backgournd-color: #0056b3;
            }
          </style>
        </head>
        <body>
          <h1>Bem-vindo ao Portal de Noticias de Bagé</h1>
          <ul>
            <li><a href="/inserir-noticia">Inserir Notícia</a></li>
            <li><a href="/listar-noticias">Listar Notícias</a></li>
            <li><a href="/form-cadastrar-noticia">Cadastrar Notícia</a></li>
            </ul>

           <form id="formConsulta">
              <label for="codigo">Consultar Notícia por Código: </label><br />
              <input type="number" id="codigo" name="codigo" required />
              <button type="submit">Consultar</button>
            </form>

          <script>
            document.getElementById("formConsulta").addEventListener("submit",
            function (e) {
                e.preventDefault();
                const codigo = document.getElementById("codigo").value;
                window.location.href = "/consultar-noticia/" + codigo;
            });
          </script>
        </body>
      </html>

  `);
});
//Rota para inserir uma noticia
app.get("/inserir-noticia", function (req, res) {
  pool.query(
    //o pool query executa uma consulta SQL usando o pool de conexões
    "INSERT INTO noticias (titulo,resumo,conteudo,data_criacao) VALUES ('titulo teste','resumo teste','conteudo teste', now())",
    //insert insere uma nova linha na tabela noticias nos campos citados com os novos valores citados
    function (error, results, fields) {
      // error - se algo deu errado traz os detalhes do erro, results - contem os resultados do query caso de certo e fields - informações sobre os campos retornados
      //função callback que sera chamada quando a query terminar
      if (error) throw error; // se ocorrer um erro ele sera lançado aqui e provavelmente vai derrubar o servidor
      //senão esta conectado
    }
  );
  res.send("noticia cadastrada com sucesso");
});

app.get("/listar-noticias", async function (req, res) {
  //Define a rota listar noticia e usa uma função async
  try {
    //await so pode ser usada em funções async
    const client = await pool.connect(); //conecta ao banco de dados usando o pool de conexões
    //await espera a conexão ser estabelecida antes de continuas

    const result = await client.query(
      "SELECT codigo, titulo, resumo FROM noticias ORDER BY data_criacao DESC"
    );
    //executa uma consulta sql que seleciona os campos codigo, titulo e resumo da tabela noticias
    //resultados ordenados pela data de criação em ordem descrescente

    const noticias = result.rows;
    //extrai os dados tomados da consulta
    //result.rows é um array de objetos, onde cada objeto representa uma noticia

    let table = "<table border = 1>";
    //começa a monstar uma tabela html com borda

    table += "<tr><th>Coluna 1</th><th>Coluna 2</th><th>Coluna 3</th></tr>";
    //adiciona uma linha de cabeçalho da tabela

    noticias.forEach((umaNoticia) => {
      table += `<tr><td>${umaNoticia.codigo}</td><td>${umaNoticia.titulo}</td><td>${umaNoticia.resumo}</td></tr>`;
    });
    //para cada notícia, adiciona uma nova linha da tabela com dados

    table += "</table>";
    //finaliza a tabela HTML

    client.release();
    //libera a conexão com o banco de dados para que ela possa ser reutilizada pelo pool
    //isso é importante para não executar as consexões disponíveis

    res.send(table);
    //envia a tabela HTML como esposta para o navegador
  } catch (err) {
    console.error("Erro ao executar consulta:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
  // se algo der errado, o erro é exibido no console
  // o servidor responde com status 500 e uma mensagem de erro em JSON
});

app.get("/consultar-noticia/:codigo", async function (req, res) {
  const codigo = parseInt(req.params.codigo);
  //res.send("rota consultar a noticia de codigo = " + codigo);

  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT codigo, titulo, conteudo, data_criacao FROM noticias WHERE codigo = $1",
      [codigo]
    );
    const noticias = result.rows;

    if (noticias.length === 0) {
      res.status(404).send("Registro não encontrado");
    } else {
      const registro = noticias[0];

      res.send(`
        <h1>Dados do Registro</h1>
        <p><b>Código:</b>${registro.codigo}</p>  
        <p><b>Título:</b>${registro.titulo}</p>  
        <p><b>Conteúdo:</b>${registro.conteudo}</p>  
        <p><b>Data de Criação:</b>${registro.data_criacao}</p>        
      `);
    }
  } catch (error) {
    console.error("Erro ao executar a consulta:", error);
    res.status(500).send("Erro ao consultar o registro");
  }
});

//Cadastrar a notícia
app.post("/cadastrar-noticia", async function (req, res) {
  const { titulo, resumo, conteudo } = req.body;

  try {
    const client = await pool.connect();
    await client.query(
      "INSERT INTO noticias (titulo, resumo, conteudo, data_criacao) VALUES ($1, $2, $3, NOW())",
      [titulo, resumo, conteudo]
    );
    client.release();
    res.send("Noticia cadastrada com sucesso!");
  } catch (error) {
    console.error("Erro ao cadastrar noticia:", error);
    res.status(500).send("Erro ao cadastrar notícia.");
  }
});

app.get("/form-cadastrar-noticia", function (req, res) {
  res.sendFile(__dirname + "/cadastrar_noticia.html");
});

app.listen(porta, ipDoServidor, function () {
  console.log(
    "\n Aplicacao web executando em http://" + ipDoServidor + ":" + porta
  );
});
