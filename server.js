const express = require("express");
const mongoose = require("mongoose");
const app = express();
require("dotenv").config();

//routes
const authentication = require("./routes/authentication");
mongoose
  .connect(
    "mongodb://localhost:27017/newapp",
    { useNewUrlParser: true, useCreateIndex: true }
  )
  .then(() => console.log("connected to mongodb"))
  .catch(() => console.log("Could not connect to mongodb"));

app.use(express.json());
app.use(authentication);
const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Running on port ${port}`));