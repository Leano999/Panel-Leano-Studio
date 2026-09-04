--[[
  ============================================================
  TIKTOK LIVE -> ROBLOX POLLING
  ============================================================
  Tempel blok ini di bagian BAWAH script server "StreamerPro
  Server Handler" (yang ada fungsi runEffect() dan onPlayerAdded).

  SEBELUM DIPAKAI:
  1. Di Roblox Studio: Game Settings > Security > "Allow HTTP
     Requests" harus ON.
  2. Ganti TIKTOK_BRIDGE_URL di bawah dengan URL Railway lo, contoh:
       https://nama-project-lo.up.railway.app/roblox/events
  3. Ganti TIKTOK_BRIDGE_KEY dengan NILAI YANG SAMA PERSIS seperti
     yang lo isi di environment variable ROBLOX_BRIDGE_KEY di
     Railway (lihat README-ROBLOX-BRIDGE.md).
  4. Ganti STREAM_TARGET_USERNAME dengan username Roblox yang mau
     kena efek pas ada gift masuk (biasanya akun streamer sendiri).
]]

local HttpService = game:GetService("HttpService")

local TIKTOK_BRIDGE_URL = "https://GANTI-DENGAN-URL-RAILWAY-LO.up.railway.app/roblox/events"
local TIKTOK_BRIDGE_KEY = "GANTI-DENGAN-ROBLOX_BRIDGE_KEY-YANG-SAMA-DENGAN-RAILWAY"
local STREAM_TARGET_USERNAME = "YubiLeon" -- ganti sesuai kebutuhan

local POLL_INTERVAL_SECONDS = 3 -- makin kecil = makin cepat respon, tapi makin banyak request

local function getStreamTargetPlayer()
	return Players:FindFirstChild(STREAM_TARGET_USERNAME)
end

local function pollTikTokEvents()
	local ok, response = pcall(function()
		return HttpService:RequestAsync({
			Url = TIKTOK_BRIDGE_URL,
			Method = "GET",
			Headers = {
				["x-api-key"] = TIKTOK_BRIDGE_KEY,
			},
		})
	end)

	if not ok then
		warn("[TikTokBridge] Gagal connect ke bridge:", response)
		return
	end

	if not response.Success then
		warn("[TikTokBridge] Bridge merespon error, status:", response.StatusCode, response.Body)
		return
	end

	local ok2, data = pcall(function()
		return HttpService:JSONDecode(response.Body)
	end)
	if not ok2 or not data or not data.events then
		return
	end

	if #data.events == 0 then
		return
	end

	local target = getStreamTargetPlayer()
	if not target then
		warn("[TikTokBridge] STREAM_TARGET_USERNAME ('" .. STREAM_TARGET_USERNAME .. "') belum join server, efek dilewati.")
		return
	end

	for _, evt in ipairs(data.events) do
		print(("[TikTokBridge] Gift '%s' x%d dari %s -> efek %s"):format(
			evt.giftName or "?", evt.count or 1, evt.username or "?", evt.effect or "?"
		))
		runEffect(target, evt.effect, evt.time)
	end
end

task.spawn(function()
	while true do
		task.wait(POLL_INTERVAL_SECONDS)
		pollTikTokEvents()
	end
end)

print("[TikTokBridge] Polling aktif, cek bridge tiap " .. POLL_INTERVAL_SECONDS .. " detik.")
