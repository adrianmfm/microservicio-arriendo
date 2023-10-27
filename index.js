const express = require("express");
const cors = require("cors");
const sql = require("mssql");

const app = express();
app.use(cors());

const config = {
  user: "estacionamiento",
  password: "Est.1234",
  server: "server-arquitectura.database.windows.net",
  database: "arquitectura",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

sql.connect(config, (err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err);
    return;
  }
  console.log("Conexión a SQL Server exitosa");
});

app.get("/estacionamientos", async (req, res) => {
  try {
    const resultados = await new sql.Request().query(
      "SELECT idPlaza, direccion, tarifa, descripcion, latitud, longitud, disponible  FROM Estacionamiento e INNER JOIN Plaza p ON p.idEstacionamiento = e.idEstacionamiento;"
    );
    res.json({ estacionamientos: resultados.recordset });
  } catch (error) {
    console.error("Error al ejecutar la consulta:", error);
    res.status(500).send("Error interno del servidor");
  }
});

const puerto = 3000;
app.listen(puerto, () => {
  console.log(`El servidor está corriendo en http://localhost:${puerto}`);
});

app.get("/datos-personales", async (req, res) => {
  try {
    const resultados = await new sql.Request().query("SELECT * FROM Persona");
    res.json({ datosPersonales: resultados.recordset });
  } catch (error) {
    console.error("Error al ejecutar la consulta:", error);
    res.status(500).send("Error interno del servidor");
  }
});

app.get("/datos-personales/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const resultados = await new sql.Request().query(
      `SELECT * FROM Persona WHERE idPersona = ${id}`
    );
    res.json({ datosPersonales: resultados.recordset[0]});
  } catch (error) {
    console.error("Error al ejecutar la consulta:", error);
    res.status(500).send("Error interno del servidor");
  }
});

app.get("/plaza/:idPlaza/disponible", async (req, res) => {
  try {
    const idPlaza = req.params.idPlaza;
    const result = await new sql.Request().query(`
    SELECT disponible
    FROM Estacionamiento e
    INNER JOIN Plaza p
    ON p.idEstacionamiento = e.idEstacionamiento
    WHERE p.idPlaza = ${idPlaza}`);
    if (result.recordset.length === 0) {
      res.status(404).json({ mensaje: "Plaza no encontrada" });
      return;
    }
    const disponibilidad = result.recordset[0].disponible;
    res.json({ disponible: disponibilidad });
  } catch (error) {
    console.error("Error al verificar disponibilidad de la plaza:", error);
    res.status(500).send("Error interno del servidor");
  }
});
app.post("/plaza/:idPlaza/arrendar/:idPersona", async (req, res) => {
  try {
    const idPlaza = req.params.idPlaza;
    const idPersona = req.params.idPersona;

    // Actualiza la disponibilidad de la plaza en tu base de datos
    await new sql.Request().query(
      `UPDATE Plaza SET disponible = 0, idPersona=${idPersona} WHERE idPlaza = ${idPlaza}`
    );

    res.json({ mensaje: "Plaza arrendada con éxito" });
  } catch (error) {
    console.error("Error al arrendar la plaza:", error);
    res.status(500).send("Error interno del servidor");
  }
});

app.get("/arriendos", async (req, res) => {
  try {
    const result = await new sql.Request().query(`
      SELECT a.*
      FROM Arriendo a
      INNER JOIN Persona p ON a.idPersona = p.idPersona
    `);

    res.json({ arriendos: result.recordset });
  } catch (error) {
    console.error("Error al obtener los arriendos:", error);
    res.status(500).send("Error interno del servidor");
  }
});

app.get("/contar-plazas", async (req, res) => {
  try {
    const result = await new sql.Request().query(`
    SELECT COUNT(*) as cantidadPlazas
    FROM Plaza p
    INNER JOIN Estacionamiento e ON p.idEstacionamiento = e.idEstacionamiento
    WHERE p.disponible = 1
    `);

    res.json({ arriendos: result.recordset[0].cantidadPlazas });
  } catch (error) {
    console.error("Error al obtener los arriendos:", error);
    res.status(500).send("Error interno del servidor");
  }
});

app.get("/info-estacionamientos/:idPersona", async (req, res) => {
  try {
    const idPersona = req.params.idPersona;

    const pool = await sql.connect(config);
    const result = await pool.request()
      .query(`SELECT e.descripcion, e.direccion, e.tarifa, p.alto, p.ancho, p.largo
              FROM Estacionamiento e
              INNER JOIN Plaza p ON e.idEstacionamiento = p.idEstacionamiento
              INNER JOIN Persona per ON per.idPersona = p.idPersona
              WHERE per.idPersona = ${idPersona}`);

    res.json({ infoEstacionamiento: result.recordset });
  } catch (error) {
    console.error(
      "Error al obtener la información del estacionamiento:",
      error
    );
    res.status(500).send("Error interno del servidor");
  }
});

app.post("/liberar-plaza/:idPlaza", async (req, res) => {
  //libera todas las plazas
  const idPlaza = req.params.idPlaza;

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("idPlaza", sql.Int, idPlaza)
      .query(`UPDATE Plaza SET disponible = 1, idPersona = null`);

    res.json({ mensaje: "Plaza liberada con éxito" });
  } catch (error) {
    console.error("Error al liberar la plaza:", error);
    res.status(500).send("Error interno del servidor");
  }
});

process.on("SIGINT", () => {
  sql.close(); // Cierra la conexión cuando se detiene la aplicación
  process.exit();
});
