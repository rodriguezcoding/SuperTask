const express = require("express");
const mongoose = require("mongoose");
const app = express();
const cors = require("cors");
require("dotenv").config();

//routes
const authentication = require("./routes/authentication");
const team = require("./routes/team.js");
const project = require("./routes/project.js");

mongoose
  .connect(
    "mongodb://localhost:27017/newapp",
    { useNewUrlParser: true, useCreateIndex: true }
  )
  .then(() => console.log("connected to mongodb"))
  .catch(() => console.log("Could not connect to mongodb"));

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:3000" }));

app.use(express.json());
app.use(authentication);
app.use(team);
app.use(project);

const port = process.env.PORT || 4741;

app.listen(port, () => console.log(`Running on port ${port}`));
