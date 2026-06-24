const express = require("express");
const app = express();
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { object } = require("better-auth");
const port = 5000;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

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
    const userCollection = database.collection("user");

    // 👥 [GET] Fetch All Users (🔐 Secure & Clean)
    app.get("/users", async (req, res) => {
      try {
        // পাসওয়ার্ড এবং ইন্টারনাল মঙ্গোডিবি ভার্সন বাদ দিয়ে ক্লিন ডাটা রিট্রিভ করা হচ্ছে
        const result = await userCollection.find().project({ password: 0, __v: 0 }).toArray();
        res.status(200).send(result);
      } catch (error) {
        console.error("Error in GET /users:", error);
        res.status(500).send({ message: "Server error occurred" });
      }
    });

    // 📝 [POST] Create a Lesson
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

    // 📊 [GET] Total Lessons Count
    app.get("/lessons/count", async (req, res) => {
      try {
        const count = await lessonsCollection.countDocuments({});
        res.status(200).json({ totalLessons: count });
      } catch (error) {
        console.error("Error in /lessons/count:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });
   app.patch("/user/update-plan/:userId", async (req, res) => {
  try {
    // ⚡ ভুল সংশোধন: req.body নয়, আইডি আসবে req.params থেকে
    const userId = req.params.userId;

    if (!userId || userId === 'undefined') {
      return res.status(400).json({ message: "Valid User ID is required" });
    }

    const query = {
      _id: new ObjectId(userId)
    };

    const data = {
      $set: {
        plan: 'Premium',
        updatedAt: new Date() // বানান ঠিক করা হয়েছে: updateAt -> updatedAt
      }
    };

    const result = await userCollection.updateOne(query, data);
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

    // 📊 [GET] Total Users Count
    app.get("/lesson-up/user/count", async (req, res) => {
      try {
        const count = await userCollection.countDocuments({});
        res.status(200).json({ totalUser: count });
      } catch (error) {
        console.error("Error in /lesson-up/user/count:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // ❤️ [POST] Insert Like
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

    // 💾 [POST] Save Post
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

    // 📂 [GET] Saved Posts by User ID
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

    // 🎯 [GET] Lessons by User ID
    app.get("/lessons/user/:userId", async (req, res) => {
      try {
        const userId = req.params.userId;
        if (!userId || userId === "undefined") {
          return res.status(400).send({ message: "Invalid or missing User ID parameter" });
        }
        const query = { userId: userId };
        const result = await lessonsCollection.find(query).toArray();
        res.status(200).send(result);
      } catch (error) {
        console.error("Backend Error in /lessons/user/:userId:", error);
        res.status(500).send({ message: "Error retrieving lessons", error: error.message });
      }
    });

    // 📈 [GET] Lessons Count by User ID
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

    // 📉 [GET] Saved Posts Count by User ID
    app.get("/savePosts/count/:userId", async (req, res) => {
      try {
        const userId = req.params.userId;
        const query = { userId: userId };
        const count = await savesCollection.countDocuments(query);
        res.send({ totalSavedLessons: count });
      } catch (error) {
        console.error("Backend error in /savePosts/count/:userId:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // 🔍 [GET] Single Lesson by Object ID
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
        res.status(500).send({ message: "Internal Server Error", error: error.message });
      }
    });
   
    // ✏️ [PATCH] Update Single Lesson
    app.patch("/lessons/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updatedData = req.body;
        if (updatedData._id) delete updatedData._id;

        const query = { _id: new ObjectId(id) };
        const updateDoc = { $set: updatedData };

        const result = await lessonsCollection.updateOne(query, updateDoc);
        res.status(200).send(result);
      } catch (error) {
        console.error("Error updating lesson:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // 🔄 [GET] Specific Lesson Target for Update
    app.get("/lesson-update/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const result = await lessonsCollection.findOne(query);
        if (!result) {
          return res.status(404).send({ message: "Lesson not found" });
        }
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Internal Server Error", error: error.message });
      }
    });

    // 📄 [GET] All Lessons
    app.get("/lessons", async (req, res) => {
      try {
        const result = await lessonsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error occurred" });
      }
    });

    // MongoDB Ping
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Database connection error:", error);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});