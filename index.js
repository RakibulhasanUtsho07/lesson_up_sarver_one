const express = require("express");
const app = express();
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = 5000;

// Middleware & Configuration
app.use(cors());
app.use(express.json());
dotenv.config();

const uri = process.env.MONGO_DB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

async function run() {
  try {
    await client.connect();

    const database = client.db("lessons_up");
    const lessonsCollection = database.collection("lessons");

    app.post("/lessons", async (req, res) => {
      try {
        const lessons = req.body;
        console.log(lessons, "lessons data received");

        const result = await lessonsCollection.insertOne(lessons);
        res.status(201).json(result);
      } catch (error) {
        console.error("Error inserting lesson:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });
    app.get("/lessons", async (req, res) => {
      try {
        const result = await lessonsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error occurred" });
      }
    });
    app.get("/lessons/:userId", async (req, res) => {
      try {
        
        const userId = req.params.userId;
        console.log(userId)
         
        const query = { userId: userId };

        
        const count = await lessonsCollection.find(query).toArray();

        res.send({ totalLessons: count });
      } catch (error) {
        res.status(500).send({ message: "Error counting lessons", error });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } catch (error) {
    console.error("Database connection error:", error);
  }
}

// run ফাংশন কল করা
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
