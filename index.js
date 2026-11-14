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
const applications = database.collection("applications");

app.get("/", (req, res) => {
  res.send(`Server is running on port: ${PORT}`);
});

app.get("/users", async (req, res) => {
  const cursor = users.find({});
  const result = await cursor.toArray();
  res.send(result);
});

app.get("/jobs", async (req, res) => {
  try {
    const filters = {};

    // Job Type
    if (req.query.jobType) {
      filters.jobType = String(req.query.jobType).toLowerCase();
    }

    // Category
    if (req.query.category) {
      filters.category = req.query.category;
    }

    // Build combined conditions
    const conditions = [];

    if (Object.keys(filters).length > 0) {
      conditions.push(filters);
    }

    // Remote / On-site
    if (
      req.query.remoteAllowed === "true" ||
      req.query.remoteAllowed === "false"
    ) {
      const remoteValue = req.query.remoteAllowed === "true";

      conditions.push({
        $or: [{ remoteAllowed: remoteValue }, { isRemote: remoteValue }],
      });
    }

    // Search
    if (req.query.search) {
      const searchRegex = {
        $regex: String(req.query.search).trim(),
        $options: "i",
      };

      conditions.push({
        $or: [
          { title: searchRegex },
          { jobTitle: searchRegex },
          { company: searchRegex },
          { companyName: searchRegex },
          { responsibilities: searchRegex },
          { requirements: searchRegex },
          { qualifications: searchRegex },
        ],
      });
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};

    console.log("MongoDB filter:", query);

    const result = await jobs.find(query).toArray();

    res.send(result);
  } catch (error) {
    console.error("Get jobs error:", error);
    res.status(500).send({ message: "Failed to fetch jobs" });
  }
});

// Get single job details
app.get("/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid job ID",
      });
    }

    const job = await jobs.findOne({
      _id: new ObjectId(id),
    });

    if (!job) {
      return res.status(404).send({
        message: "Job not found",
      });
    }

    res.send(job);
  } catch (error) {
    console.error("Get job details error:", error);

    res.status(500).send({
      message: "Failed to fetch job details",
    });
  }
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

// application api

app.post("/applications", async (req, res) => {
  try {
    const { jobId, userId, name, email, phone, resumeUrl, coverLetter } =
      req.body;

    if (
      !jobId ||
      !ObjectId.isValid(jobId) ||
      !userId ||
      !name ||
      !email ||
      !phone ||
      !resumeUrl ||
      !coverLetter
    ) {
      return res.status(400).send({
        message: "Please provide all required application details.",
      });
    }

    // Check whether the job exists
    const job = await jobs.findOne({
      _id: new ObjectId(jobId),
    });

    if (!job) {
      return res.status(404).send({
        message: "Job not found.",
      });
    }

    // Prevent duplicate applications
    const existingApplication = await applications.findOne({
      jobId,
      userId,
    });

    if (existingApplication) {
      return res.status(409).send({
        message: "You have already applied for this job.",
      });
    }

    const application = {
      jobId,
      userId,
      name,
      email,
      phone,
      resumeUrl,
      coverLetter,
      status: "pending",
      createdAt: new Date(),
    };

    const result = await applications.insertOne(application);

    res.status(201).send({
      success: true,
      message: "Application submitted successfully.",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Submit application error:", error);

    res.status(500).send({
      message: "Failed to submit application.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Hireloop is running on server ${PORT}`);
});

export default app;
