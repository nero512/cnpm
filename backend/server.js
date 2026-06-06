const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Gắn routeno
app.use("/api/account", require("./routes/account"));
app.use("/api/persons", require("./routes/person"));
app.use("/api/household", require("./routes/household"));
app.use('/api/events', require("./routes/event"));
app.use('/api/requests', require("./routes/request"));

const PORT = 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});