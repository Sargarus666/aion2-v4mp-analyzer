package com.sargarus.aion2buildlab
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class ReleaseInfo(val tag: String, val name: String, val pageUrl: String, val apkUrl: String)
object UpdateChecker {
    const val RELEASES_API = "https://api.github.com/repos/Sargarus666/aion2-v4mp-analyzer/releases/tags/android-latest"
    const val RELEASES_PAGE = "https://github.com/Sargarus666/aion2-v4mp-analyzer/releases"
    fun isNewer(latest: String, current: String): Boolean {
        fun parts(value: String) = value.trim().removePrefix("v").substringBefore("-").split(".").map { it.toIntOrNull() ?: 0 }
        val a = parts(latest); val b = parts(current)
        for (i in 0 until maxOf(a.size, b.size)) {
            val left = a.getOrElse(i) { 0 }; val right = b.getOrElse(i) { 0 }
            if (left != right) return left > right
        }
        return false
    }
    fun fetchLatest(): ReleaseInfo? {
        val connection = (URL(RELEASES_API).openConnection() as HttpURLConnection).apply {
            connectTimeout=7000; readTimeout=7000; requestMethod="GET"
            setRequestProperty("Accept", "application/vnd.github+json")
            setRequestProperty("X-GitHub-Api-Version", "2022-11-28")
        }
        return try {
            if (connection.responseCode !in 200..299) return null
            val json = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
            val body = json.optString("body")
            val version = Regex("""Version:\s*([0-9]+(?:\.[0-9]+){1,2})""", RegexOption.IGNORE_CASE)
                .find(body)?.groupValues?.getOrNull(1) ?: json.optString("tag_name")
            val assets = json.optJSONArray("assets")
            var apkUrl = ""
            if (assets != null) {
                for (index in 0 until assets.length()) {
                    val asset = assets.optJSONObject(index) ?: continue
                    if (asset.optString("name") == "app-debug.apk") {
                        apkUrl = asset.optString("browser_download_url")
                        break
                    }
                }
            }
            ReleaseInfo(version, json.optString("name", version), json.optString("html_url", RELEASES_PAGE), apkUrl)
        } finally { connection.disconnect() }
    }
}
