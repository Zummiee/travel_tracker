import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "940312",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries JOIN travellers on travellers.id=traveller_id WHERE visited_countries.traveller_id = $1", 
    [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
};

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const travelResult = await db.query("SELECT * FROM travellers");
  const users = travelResult.rows;
  const result = await db.query("SELECT color FROM travellers WHERE travellers.id = $1", [currentUserId]);
  const data = result.rows[0];
  const userColor = data.color;
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: userColor,
  });
 });

app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, traveller_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  currentUserId = req.body["user"];
  const result = await db.query("SELECT EXISTS (SELECT 1 FROM travellers WHERE id = $1)", [currentUserId]);
  const idExists = result.rows[0].exists;
  if (idExists) {
    res.redirect("/");
  } else {res.render("new.ejs")};
});

app.post("/new", async (req, res) => {
  const userName = req.body["name"];
  const userColor = req.body["color"];
  const result = await db.query("INSERT INTO travellers (name, color) VALUES ($1, $2) RETURNING *",
        [userName, userColor]
      );
  const data = result.rows[0];
  currentUserId = data.id;
  res.redirect("/");
  });

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
