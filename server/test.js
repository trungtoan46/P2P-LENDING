const mongoose = require("mongoose");

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("CONNECTED"))
    .catch(err => console.log("ERROR:", err));