const express = require("express");
const axios = require("axios");
const archiver = require("archiver");

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/download", async (req, res) => {
  let ids = (req.body.ids || []).slice(0, 10);

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", "attachment; filename=assets.zip");

  const archive = archiver("zip");
  archive.pipe(res);

  for (let i = 0; i < ids.length; i++) {
    let id = ids[i];
    try {
      const url = `https://assetdelivery.roblox.com/v1/asset/?id=${id}`;
      const file = await axios.get(url, { responseType: "arraybuffer" });
      archive.append(file.data, { name: `${id}.mp3` });
    } catch {}
  }

  archive.finalize();
});

app.listen(3000, () => console.log("Running on 3000"));
