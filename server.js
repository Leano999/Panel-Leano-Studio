const express = require("express");
const axios = require("axios");
const archiver = require("archiver");

const app = express();
app.use(express.json());

app.post("/download", async (req, res) => {
  try {
    let ids = (req.body.ids || []).slice(0, 10);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=assets.zip");

    const archive = archiver("zip");
    archive.pipe(res);

    for (let id of ids) {
      try {
        const url = `https://assetdelivery.roblox.com/v1/asset/?id=${id}`;
        const file = await axios.get(url, { responseType: "arraybuffer", maxRedirects: 5 });
        archive.append(file.data, { name: `${id}.mp3` });
      } catch (e) {
        console.log("Gagal:", id);
      }
    }

    await archive.finalize();
  } catch (err) {
    res.status(500).send("Error");
  }
});

app.use(express.static("public"));

app.listen(3000, () => console.log("Server jalan di 3000"));
