import express from "express";
import cors from "cors";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const connectedClient = await connectToMongoDB();
const database = connectedClient.db("hireloop");
const users = database.collection("user");
const jobs = database.collection("jobs");

app.get("/", (req, res) => {
  res.send(`Server is running on port: ${PORT}`);
});

app.get("/users", async (req, res) => {
  const cursor = users.find({});
  const result = await cursor.toArray();
  res.send(result);
});

app.get("/jobs", async (req, res) => {
  const query = {};

  // Job type filter
  if (req.query.jobType) {
    query.jobType = req.query.jobType;
  }

  // Remote filter
  if (req.query.remoteAllowed !== undefined) {
    query.isRemote = req.query.remoteAllowed === "true";
  }

  // Category filter
  if (req.query.category) {
    query.category = req.query.category;
  }

  // Search filter
  if (req.query.search) {
    query.$or = [
      { jobTitle: { $regex: req.query.search, $options: "i" } },
      { companyName: { $regex: req.query.search, $options: "i" } },
      { responsibilities: { $regex: req.query.search, $options: "i" } },
      { qualifications: { $regex: req.query.search, $options: "i" } },
    ];
  }

  console.log("MongoDB filter:", query);
  const cursor = jobs.find(query);
  const result = await cursor.toArray();

  res.send(result);
});

app.post("/jobs", async (req, res) => {
  const job = req.body;
  const result = await jobs.insertOne(job);
  res.send(result);
});

app.patch("/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedJob = req.body;

    const result = await jobs.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          title: updatedJob.title,
          company: updatedJob.company,
          category: updatedJob.category,
          jobType: updatedJob.jobType,
          remoteAllowed: updatedJob.remoteAllowed,
          location: updatedJob.location,
          deadline: updatedJob.deadline,
          minSalary: updatedJob.minSalary,
          maxSalary: updatedJob.maxSalary,
          frequency: updatedJob.frequency,
          responsibilities: updatedJob.responsibilities,
          requirements: updatedJob.requirements,
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Job not found" });
    }

    res.send({
      success: true,
      message: "Job updated successfully",
    });
  } catch (error) {
    console.error("Update job error:", error);

    res.status(500).send({
      message: "Failed to update job",
    });
  }
});

app.delete("/jobs/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await jobs.deleteOne(query);
  res.send(result);
});

app.listen(PORT, () => {
  console.log(`Hireloop is running on server ${PORT}`);
});

export default app;
