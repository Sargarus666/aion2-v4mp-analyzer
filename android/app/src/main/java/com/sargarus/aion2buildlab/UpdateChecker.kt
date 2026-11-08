package com.sargarus.aion2buildlab

import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL

data class ReleaseInfo(val tag: String, val name: String, val pageUrl: String, val apkUrl: String)

object UpdateChecker {
    const val RELEASES_API = "https://api.github.com/repos/Sargarus666/aion2-v4mp-analyzer/releases?per_page=30"
    const val RELEASES_PAGE = "https://github.com/Sargarus666/aion2-v4mp-analyzer/releases"

    fun isNewer(latest: String, current: String): Boolean {
        fun parts(value: String) = value.trim().removePrefix("android-v").removePrefix("v")
            .substringBefore("-").split(".").map { it.toIntOrNull() ?: 0 }
        val a = parts(latest)
        val b = parts(current)
        for (i in 0 until maxOf(a.size, b.size)) {
            val left = a.getOrElse(i) { 0 }
            val right = b.getOrElse(i) { 0 }
            if (left != right) return left > right
        }
        return false
    }

    fun fetchLatest(): ReleaseInfo? {
        val connection = (URL(RELEASES_API).openConnection() as HttpURLConnection).apply {
            connectTimeout = 7000
            readTimeout = 7000
            requestMethod = "GET"
            setRequestProperty("Accept", "application/vnd.github+json")
            setRequestProperty("X-GitHub-Api-Version", "2022-11-28")
        }
        return try {
            if (connection.responseCode !in 200..299) return null
            val releases = JSONArray(connection.inputStream.bufferedReader().use { it.readText() })
            var latest: ReleaseInfo? = null
            for (index in 0 until releases.length()) {
                val release = releases.optJSONObject(index) ?: continue
                if (release.optBoolean("draft", false)) continue
                val tagName = release.optString("tag_name")
                if (!tagName.startsWith("android-v")) continue
                val version = tagName.removePrefix("android-v")
                val assets = release.optJSONArray("assets") ?: continue
                var apkUrl = ""
                for (assetIndex in 0 until assets.length()) {
                    val asset = assets.optJSONObject(assetIndex) ?: continue
                    if (asset.optString("name") == "app-release.apk") {
                        apkUrl = asset.optString("browser_download_url")
                        break
                    }
                }
                if (apkUrl.isBlank()) continue
                val candidate = ReleaseInfo(
                    version,
                    release.optString("name", version),
                    release.optString("html_url", RELEASES_PAGE),
                    apkUrl
                )
                if (latest == null || isNewer(candidate.tag, latest.tag)) latest = candidate
            }
            latest
        } finally {
            connection.disconnect()
        }
    }
}
