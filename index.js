const express = require("express");
const app = express();
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const { object } = require("better-auth");
app.use(express.json());
dotenv.config();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);



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
    // await client.connect();

    const database = client.db("lessons_up");
    const lessonsCollection = database.collection("lessons");
    const likesCollection = database.collection("likes");
    const savesCollection = database.collection("savePosts");
    const userCollection = database.collection("user");
    const reportsCollection = database.collection("reports");
    const sessionCollection = database.collection("session");

   


    const verifyToken = async (req, res, next) => {
      try {
        console.log("headers", req.headers?.authorization);
        const authHeader = req.headers.authorization;

        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res
            .status(401)
            .send({ message: "Unauthorized: No token provided" });
        }

        // এখন split করা ১০০% নিরাপদ
        const token = authHeader.split(" ")[1];
        console.log("Token found:", token);

        if (!token) {
          return res.status(401).send({ message: "Unauthorized: Empty token" });
        }

        const query = { token: token };
        const session = await sessionCollection.findOne(query);
        console.log(session, "session");

        const userId = session?.userId;
        if (!userId) {
          return res
            .status(401)
            .send({ message: "Unauthorized: Invalid session" });
        }

        const userQuery = { _id: new ObjectId(userId) };
        const user = await userCollection.findOne(userQuery);

        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }

        req.user = user;
        console.log(user, "user data");
        next();
      } catch (error) {
        console.error("Token verification error:", error);
        return res
          .status(500)
          .send({ message: "Internal Server Error", error: error.message });
      }
      
    };
    const verifyUser = async (req, res, next) => {
      if (req.user?.role !== "user") {
        return res.status(403).send({ message: "Forbidden" });
      }
      next();
    };
    const verifyAdmin = async (req, res, next) => {
      if (req.user?.role !== "admin") {
        return res.status(403).send({ message: "Forbidden" });
      }
      next();
    };
    const verifyAll = async (req, res, next) => {
      const user = req?.user;
      if (!user) {
        return;
      }
      next();
    };
    app.get("/users/top-contributors", async (req, res) => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const topContributors = await lessonsCollection
          .aggregate([
            {
              
              $match: {
                date: { $gte: sevenDaysAgo.toISOString() },
              },
            },
            {
              
              $group: {
                _id: "$userId",
                name: { $first: "$name" },
                userImage: { $first: "$userImage" },
                lessonCount: { $sum: 1 },
              },
            },
            {
             
              $sort: { lessonCount: -1 },
            },
            {
              $limit: 5, 
            },
          ])
          .toArray();

        res.json({ success: true, data: topContributors });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    app.get("/lessons/most-saved", async (req, res) => {
      try {
        const mostSaved = await savesCollection
          .find({})
          .sort({ favorites: -1 }) 
          .limit(4) 
          .toArray();

        res.json({ success: true, data: mostSaved });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    app.get("/lessons/monthly-count",verifyToken, verifyAdmin, async (req, res) => {
      try {
        const monthlyData = await lessonsCollection
          .aggregate([
            {
              $match: {
                date: { $exists: true, $type: "string", $ne: "" },
              },
            },
            {
              $project: {
                convertedDate: { $toDate: "$date" },
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$convertedDate" },
                  month: { $month: "$convertedDate" },
                },
                count: { $sum: 1 },
              },
            },
            {
              $sort: { "_id.year": 1, "_id.month": 1 },
            },
          ])
          .toArray();

        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];

        const formattedData = monthlyData.map((item) => ({
          month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
          count: item.count,
        }));

        res.json({ success: true, data: formattedData });
      } catch (error) {
        console.error("Error in monthly aggregation:", error);
        res.status(500).json({ success: false, message: error.message });
      }
    });
    app.delete("/lessons/delete/:lessonId", async (req, res) => {
      try {
        console.log("➡️ Params received:", req.params);
        const lessonId = req.params.lessonId;
        console.log(lessonId, "lessonId");
        console.log("➡️ Received delete request for lessonId:", lessonId);

        if (
          !lessonId ||
          lessonId === "undefined" ||
          !ObjectId.isValid(lessonId)
        ) {
          return res.status(400).json({
            success: false,
            message: "Valid 24-character hex MongoDB Lesson ID is required",
          });
        }

        const query = { _id: new ObjectId(lessonId) };
        const result = await lessonsCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Lesson not found in database" });
        }

        return res.json({
          success: true,
          message: "Lesson deleted successfully",
          result,
        });
      } catch (error) {
        console.error("Backend Delete Error:", error);
        return res
          .status(500)
          .json({ success: false, message: "Server error occurred" });
      }
    });
    app.get("/lessons/count",verifyToken, verifyAdmin, async (req, res) => {
      try {
        const count = await lessonsCollection.countDocuments({});
        res.status(200).json({ totalLessons: count });
      } catch (error) {
        console.error("Error in /lessons/count:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });
    app.patch("/user/update-plan/:userId",verifyToken, verifyUser, async (req, res) => {
        try {
        
          const userId = req.params.userId;

          if (!userId || userId === "undefined") {
            return res
              .status(400)
              .json({ message: "Valid User ID is required" });
          }

          const query = {
            _id: new ObjectId(userId),
          };

          const data = {
            $set: {
              plan: "Premium",
              updatedAt: new Date(), 
            },
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
      },
    );
   
    app.get("/lesson-up/user/count",  async (req, res) => {
      try {
        const count = await userCollection.countDocuments({});
        res.status(200).json({ totalUser: count });
      } catch (error) {
        console.error("Error in /lesson-up/user/count:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

   
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

   
    app.get("/savePosts/:userId",verifyToken, verifyAll, async (req, res) => {
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
    app.patch("/lesson/feature/:lessonId",verifyToken, verifyAdmin, async (req, res)=>{
        try {
          const lessonId = req.params.lessonId;

          if (!lessonId || lessonId === "undefined") {
            return res
              .status(400)
              .json({ success: false, message: "Valid Lesson ID is required" });
          }

          const query = { _id: new ObjectId(lessonId) };
          const currentLesson = await lessonsCollection.findOne(query);

          if (!currentLesson) {
            return res
              .status(404)
              .json({ success: false, message: "Lesson not found" });
          }

          const nextStatus = currentLesson.isFeatured === true ? false : true;

          const result = await lessonsCollection.updateOne(query, {
            $set: { isFeatured: nextStatus, updatedAt: new Date() },
          });

          if (result.modifiedCount === 0) {
            return res
              .status(500)
              .json({ success: false, message: "Update failed" });
          }

          
          res.json({
            success: true,
            message: nextStatus
              ? "Lesson marked as featured"
              : "Lesson removed from featured",
            isFeatured: nextStatus,
          });
        } catch (error) {
          console.error("Backend Error:", error);
          res
            .status(500)
            .json({ success: false, message: "Internal Server Error" });
        }
      },
    );

   
    app.get("/lessons/user/:userId",verifyToken, verifyAll, async (req, res) => {
      try {
        const userId = req.params.userId;
        if (!userId || userId === "undefined") {
          return res
            .status(400)
            .send({ message: "Invalid or missing User ID parameter" });
        }
        const query = { userId: userId };
        const result = await lessonsCollection.find(query).toArray();
        res.status(200).send(result);
      } catch (error) {
        console.error("Backend Error in /lessons/user/:userId:", error);
        res
          .status(500)
          .send({ message: "Error retrieving lessons", error: error.message });
      }
    });


    app.get("/lessons/count/:userId",   async (req, res) => {
      try {
        const userId = req.params.userId;
        const query = { userId: userId };
        const count = await lessonsCollection.countDocuments(query);
        res.send({ totalLessons: count });
      } catch (error) {
        console.error("Error in counting lessons:", error);
        res
          .status(500)
          .send({ message: "Error counting lessons", error: error.message });
      }
    });

  
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
    app.get("/lessons", async (req, res) => {
      try {
        const query = {};
        if (req.query.search) {
          query.$or = [
            { title: { $regex: req.query.search, $options: "i" } },
            { tone: { $regex: req.query.search, $options: "i" } },
          ];
        }

        if (req.query.category) {
          query.category = req.query.category;
        }
        const result = await lessonsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error occurred" });
      }
    });

    app.get("/users",verifyToken,verifyAdmin,  async (req, res) => {
      try {
       
        const result = await userCollection
          .find()
          .toArray();
        res.status(200).send(result);
      } catch (error) {
        console.error("Error in GET /users:", error);
        res.status(500).send({ message: "Server error occurred" });
      }
    });


    app.post("/lessons",verifyToken, verifyAdmin, async (req, res) => {
      try {
        const lessons = req.body;
        const result = await lessonsCollection.insertOne(lessons);
        res.status(201).json(result);
      } catch (error) {
        console.error("Error inserting lesson:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

   
    app.get("/lessons/:id", verifyToken, verifyAll, async (req, res) => {
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

   
    app.patch("/lessons/:id",verifyToken, verifyUser,  async (req, res) => {
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

    


   

    app.post("/lessons/report", async (req, res) => {
      try {
        const reportedData = req.body;

        console.log("Received report data:", reportedData); // ← add this
        console.log("reportsCollection:", reportsCollection); // ← add this

        if (!reportedData.lessonId) {
          return res
            .status(400)
            .json({ success: false, message: "Lesson ID is required" });
        }

        const result = await reportsCollection.insertOne(reportedData);

        if (result.acknowledged) {
          return res.status(201).json({
            success: true,
            message: "Report submitted successfully",
            insertedId: result.insertedId,
          });
        } else {
          return res
            .status(500)
            .json({ success: false, message: "Failed to insert report" });
        }
      } catch (error) {
        console.error("FULL ERROR:", error); // ← change this to log full error
        res.status(500).json({ success: false, message: error.message }); // ← send actual error message
      }
    });
    app.get("/lessons/report/get", verifyToken, verifyAdmin,async (req, res) => {
        try {
          const reports = req.body;
          const result = await reportsCollection.find(reports).toArray();
          res.send(result);
        } catch (error) {
          console.error("FULL ERROR:", error); // ← change this to log full error
          res.status(500).json({ success: false, message: error.message });
        }
      },
    );

    app.delete("/lessons/delete/report/:reportedId",verifyToken, verifyAdmin, async (req, res) => {
        try {
          const reportedId = req.params.reportedId;
          console.log(reportedId);

          // ⚡ ফিক্স ৩: ব্যাকএন্ড সিনট্যাক্স ঠিক করা হলো ও আইডি চেক স্ট্রং করা হলো
          if (
            !reportedId ||
            reportedId === "undefined" ||
            !ObjectId.isValid(reportedId)
          ) {
            return res.status(400).json({
              success: false,
              message: "A valid MongoDB ObjectId is required",
            });
          }

          const query = { _id: new ObjectId(reportedId) };
          const result = await reportsCollection.deleteOne(query);

          if (result.deletedCount === 0) {
            return res.status(404).json({
              success: false,
              message: "Lesson not found or already deleted",
            });
          }

          res.json({
            success: true,
            message: "Lesson deleted successfully",
            result,
          });
        } catch (error) {
          console.error("Backend Error:", error);
          res.status(500).json({
            success: false,
            message: "Server error occurred on deleting lesson",
          });
        }
      },
    );
    app.get("/lessons/reports/count",verifyToken, verifyAdmin, async (req, res) => {
        try {
          const result = await reportsCollection.countDocuments();
          
          res.json({ success: true, count: result });
        } catch (error) {
          res
            .status(500)
            .send({ message: "Internal Server Error", error: error.message });
        }
      },
    );

    app.get(
      "/lessons/today/count",
      
      async (req, res) => {
        try {
         
          const todayStr = new Date().toISOString().split("T")[0];
          console.log("Searching for date prefix:", todayStr); 

          
          const query = {
            date: { $regex: `^${todayStr}` },
          };

          const count = await lessonsCollection.countDocuments(query);

          res.json({
            success: true,
            count: count,
          });
        } catch (error) {
          console.error("Error fetching today's lesson count:", error);
          res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
          });
        }
      },
    );

    // MongoDB Ping
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } catch (error) {
    console.error("Database connection error:", error);
  }
}

run().catch(console.dir);

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
