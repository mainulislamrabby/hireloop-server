import express from "express";

const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send(`Server is running on port: ${PORT}`);
});

app.listen(PORT, () => {
  console.log(`Hireloop is running on server ${PORT}`);
});

export default app;
