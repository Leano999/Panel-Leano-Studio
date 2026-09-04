--[[
  ============================================================
  TIKTOK LIVE -> ROBLOX POLLING (versi "simulasi keybind")
  ============================================================
  Tempel blok ini di bagian BAWAH script server "StreamerPro
  Server Handler" (yang ada fungsi runEffect(), getPlayerKeybinds(),
  dan onPlayerAdded).

  BEDA DARI VERSI SEBELUMNYA:
  Dulu tiap gift di-hardcode ke satu efek+durasi tertentu lewat
  GIFT_EFFECT_MAP di website. Sekarang gift cuma "menekan" satu
  tombol (misal "P"), dan efek + durasi yang jalan 100% ikut
  keybind yang KAMU atur sendiri lewat StreamerPanel di dalam game.
  Jadi ganti efek tombol P di in-game, otomatis gift Rose ikut
  berubah -- gak perlu ubah kode/re-deploy.

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
  5. Di dalam game, buka StreamerPanel, simpan keybind buat tombol
     yang kamu tulis di GIFT_KEY_MAP (roblox-bridge.js), misal tombol
     "P" -> efek Jail 15 detik. Tanpa ini, gift gak akan ngapa-ngapain.
]]

local HttpService = game:GetService("HttpService")

local TIKTOK_BRIDGE_URL = "https://GANTI-DENGAN-URL-RAILWAY-LO.up.railway.app/roblox/events"
local TIKTOK_BRIDGE_KEY = "GANTI-DENGAN-ROBLOX_BRIDGE_KEY-YANG-SAMA-DENGAN-RAILWAY"
local STREAM_TARGET_USERNAME = "YubiLeon" -- ganti sesuai kebutuhan

local POLL_INTERVAL_SECONDS = 3 -- makin kecil = makin cepat respon, tapi makin banyak request

-- ============================================================
-- TIKTOK LIVE BRIDGE (polling ke website Railway)
-- GANTI seluruh bagian ini di script Server Handler kamu, dari
-- komentar "TIKTOK LIVE BRIDGE" sampai baris print() paling bawahnya.
-- ============================================================
local function getStreamTargetPlayer()
	return Players:FindFirstChild(STREAM_TARGET_USERNAME)
end

-- Simulasi "menekan" satu tombol untuk `player`, PERSIS seperti kalau
-- dia beneran mencet tombol itu di keyboard. Efek + durasi yang jalan
-- 100% ikut keybind yang sudah di-set streamer sendiri lewat
-- StreamerPanel in-game (SaveKeybindSlot) -- bukan dari kode ini.
-- Return true kalau ketemu & dijalankan, false kalau tombol itu
-- belum ada keybind-nya.
local function simulateKeyPress(player, keyName)
	if not keyName or keyName == "" then
		return false
	end
	local kb = getPlayerKeybinds(player)
	for effect, slots in pairs(kb) do
		for slot, entry in pairs(slots) do
			if entry.key == keyName then
				entry.isRunning = true
				runEffect(player, effect, entry.time)
				KeybindActionResult:FireClient(player, effect, slot, true, "Efek dijalankan (gift TikTok)")
				return true
			end
		end
	end
	return false
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
		warn("[TikTokBridge] STREAM_TARGET_USERNAME ('" .. STREAM_TARGET_USERNAME .. "') belum join server, gift dilewati.")
		return
	end

	for _, evt in ipairs(data.events) do
		print(("[TikTokBridge] Gift '%s' x%d dari %s -> pencet tombol '%s'"):format(
			evt.giftName or "?", evt.count or 1, evt.username or "?", evt.key or "?"
			))
		local triggered = simulateKeyPress(target, evt.key)
		if not triggered then
			warn(("[TikTokBridge] '%s' belum punya keybind buat tombol '%s'. Atur dulu di StreamerPanel in-game."):format(
				target.Name, evt.key or "?"
				))
		end
	end
end

task.spawn(function()
	while true do
		task.wait(POLL_INTERVAL_SECONDS)
		pollTikTokEvents()
	end
end)

print("[TikTokBridge] Polling aktif ke " .. TIKTOK_BRIDGE_URL .. " tiap " .. POLL_INTERVAL_SECONDS .. " detik.")
