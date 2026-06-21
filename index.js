const express = require("express");
const app = express();
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const likesCollection = database.collection("likes");
    const savesCollection = database.collection("savePosts");

    // ১. নতুন লেসন পোস্ট করার রাউট
    app.post("/lessons", async (req, res) => {
      try {
        const lessons = req.body;
        const result = await lessonsCollection.insertOne(lessons);
        res.status(201).json(result);
      } catch (error) {
        console.error("Error inserting lesson:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // ২. লাইক পোস্ট করার রাউট
    app.post("/likes", async (req, res) => {
      try {
        const likes = req.body;
        const result = await likesCollection.insertOne(likes);
        res.status(201).json(result);
      } catch (error) {
        console.error("Error inserting like:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // ৩. সেভ/বুকমার্ক পোস্ট করার রাউট (এখানে ফিক্স করা হয়েছে)
    app.post("/savePosts", async (req, res) => {
      try {
        const saves = req.body;
        const result = await savesCollection.insertOne(saves);
        res.status(201).json(result);
      } catch (error) {
        console.error("Error inserting savePost:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });
    app.get("/savePosts/:userId", async (req, res) => {
      try {
        const userId = req.params.userId;
        const query = { userId: userId };

        const result = await savesCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Backend error in /savePosts/:userId:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/lessons/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const result = await lessonsCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Lesson not found" });
        }

        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Internal Server Error", error: error.message });
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
        const query = { userId: userId };
        const count = await lessonsCollection.find(query).toArray();

        res.send({ totalLessons: count.length });
      } catch (error) {
        res.status(500).send({ message: "Error counting lessons", error });
      }
    });
    
 app.get("/lessons/count/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const query = { userId: userId };
    
    const count = await lessonsCollection.countDocuments(query);

    
    res.send({ totalLessons: count });
  } catch (error) {
    console.error("Error in counting lessons:", error);
    res.status(500).send({ message: "Error counting lessons", error: error.message });
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

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
