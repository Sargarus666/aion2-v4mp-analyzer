package com.aion2buildlab

import android.content.Intent
import android.graphics.Color as NativeColor
import android.net.Uri
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private const val SITE_URL = "https://aion2-v4mp-analyzer.pages.dev/"
private const val RELEASE_API = "https://api.github.com/repos/Sargarus666/aion2-v4mp-analyzer/releases/latest"

private enum class AppTheme(val key: String, val title: String, val subtitle: String) {
    MONET("monet", "Monet", "Цвета обоев Android"),
    MONO("mono", "Монохром", "Оттенки серого"),
    STANDARD("standard", "Обычная", "Классическая тема"),
    OLED("oled", "OLED", "Тёмная тема"),
    OLED_BLACK("oled_black", "OLED Black", "Абсолютно чёрный фон"),
    OLED_WHITE("oled_white", "OLED White", "Чистая светлая тема");

    companion object {
        fun from(key: String) = entries.firstOrNull { it.key == key } ?: MONET
    }
}

private data class ReleaseInfo(val version: String, val pageUrl: String, val apkUrl: String?)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { BuildLabApp() }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BuildLabApp() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("buildlab", 0) }
    val scope = rememberCoroutineScope()
    var selectedTheme by remember { mutableStateOf(AppTheme.from(prefs.getString("theme", "monet") ?: "monet")) }
    var showSettings by remember { mutableStateOf(false) }
    var webView by remember { mutableStateOf<WebView?>(null) }
    var loading by remember { mutableStateOf(true) }
    var updateInfo by remember { mutableStateOf<ReleaseInfo?>(null) }
    var checking by remember { mutableStateOf(false) }
    var updateMessage by remember { mutableStateOf<String?>(null) }
    val systemDark = isSystemInDarkTheme()
    val dark = when (selectedTheme) {
        AppTheme.OLED, AppTheme.OLED_BLACK -> true
        AppTheme.OLED_WHITE -> false
        else -> systemDark
    }
    val colors = when (selectedTheme) {
        AppTheme.MONET -> if (android.os.Build.VERSION.SDK_INT >= 31) {
            if (dark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        } else standardScheme(dark)
        AppTheme.MONO -> monoScheme(dark)
        AppTheme.STANDARD -> standardScheme(dark)
        AppTheme.OLED -> standardScheme(true)
        AppTheme.OLED_BLACK -> blackScheme()
        AppTheme.OLED_WHITE -> whiteScheme()
    }

    MaterialTheme(colorScheme = colors) {
        SideEffect {
            val window = (context as? ComponentActivity)?.window ?: return@SideEffect
            window.statusBarColor = NativeColor.TRANSPARENT
            window.navigationBarColor = if (selectedTheme == AppTheme.OLED_BLACK) NativeColor.BLACK else colors.background.toArgb()
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = if (!dark) {
                android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
            } else 0
        }
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text("AION 2 Build Lab", fontWeight = FontWeight.SemiBold)
                            Text("Ranger · v4mp", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    },
                    actions = {
                        IconButton(onClick = { webView?.reload() }) {
                            Icon(Icons.Default.Refresh, contentDescription = "Обновить")
                        }
                        IconButton(onClick = { showSettings = true }) {
                            Icon(Icons.Default.Settings, contentDescription = "Настройки")
                        }
                    }
                )
            }
        ) { padding ->
            Box(Modifier.fillMaxSize().padding(padding)) {
                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { ctx ->
                        WebView(ctx).apply {
                            setBackgroundColor(colors.background.toArgb())
                            settings.javaScriptEnabled = true
                            settings.domStorageEnabled = true
                            settings.javaScriptCanOpenWindowsAutomatically = false
                            settings.setSupportMultipleWindows(false)
                            settings.allowFileAccess = false
                            settings.allowContentAccess = false
                            settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
                            webChromeClient = WebChromeClient()
                            webViewClient = object : WebViewClient() {
                                override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                                    loading = true
                                }
                                override fun onPageFinished(view: WebView?, url: String?) {
                                    loading = false
                                    applyWebTheme(view, selectedTheme, colors)
                                }
                                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                                    val uri = request.url
                                    if (uri.host == "aion2-v4mp-analyzer.pages.dev") return false
                                    if (uri.scheme == "https" || uri.scheme == "http") {
                                        context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                                        return true
                                    }
                                    return true
                                }
                            }
                            loadUrl(SITE_URL)
                        }.also { webView = it }
                    },
                    update = { view ->
                        view.setBackgroundColor(colors.background.toArgb())
                        applyWebTheme(view, selectedTheme, colors)
                    }
                )
                if (loading) LinearProgressIndicator(Modifier.fillMaxWidth().align(Alignment.TopCenter))
            }
        }

        if (showSettings) {
            AlertDialog(
                onDismissRequest = { showSettings = false },
                title = { Text("Настройки") },
                text = {
                    Column(Modifier.heightIn(max = 500.dp).verticalScroll(rememberScrollState())) {
                        Text("Оформление", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.height(8.dp))
                        AppTheme.entries.forEach { theme ->
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                RadioButton(
                                    selected = selectedTheme == theme,
                                    onClick = {
                                        selectedTheme = theme
                                        prefs.edit().putString("theme", theme.key).apply()
                                        webView?.let { applyWebTheme(it, theme, colors) }
                                    }
                                )
                                Column(Modifier.weight(1f).padding(start = 8.dp)) {
                                    Text(theme.title)
                                    Text(theme.subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                        HorizontalDivider(Modifier.padding(vertical = 12.dp))
                        Text("Обновления", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary)
                        Text("Установлена версия " + BuildConfig.VERSION_NAME, style = MaterialTheme.typography.bodyMedium)
                        if (checking) {
                            Spacer(Modifier.height(8.dp))
                            LinearProgressIndicator(Modifier.fillMaxWidth())
                            Text("Проверяем GitHub Releases…", style = MaterialTheme.typography.bodySmall)
                        }
                        updateMessage?.let { Text(it, Modifier.padding(top = 8.dp), style = MaterialTheme.typography.bodySmall) }
                        updateInfo?.let {
                            Text("Доступна версия " + it.version, Modifier.padding(top = 8.dp), color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                            Text("Открой APK в GitHub и подтверди установку Android.", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                },
                confirmButton = {
                    TextButton(enabled = !checking, onClick = {
                        checking = true
                        updateInfo = null
                        updateMessage = null
                        scope.launch {
                            val result = withContext(Dispatchers.IO) { fetchLatestRelease() }
                            checking = false
                            if (result == null) updateMessage = "Не удалось проверить релизы. Попробуй позже."
                            else if (compareVersions(result.version, BuildConfig.VERSION_NAME) <= 0) updateMessage = "Установлена последняя версия."
                            else {
                                updateInfo = result
                                updateMessage = "Новая версия найдена."
                            }
                        }
                    }) { Text("Проверить обновления") }
                },
                dismissButton = {
                    Row {
                        updateInfo?.let { info ->
                            TextButton(onClick = {
                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(info.apkUrl ?: info.pageUrl)))
                            }) { Text("Скачать APK") }
                        }
                        TextButton(onClick = { showSettings = false }) { Text("Готово") }
                    }
                }
            )
        }
    }
}

private fun applyWebTheme(view: WebView?, theme: AppTheme, colors: ColorScheme) {
    if (view == null) return
    val mode = if (colors.background.luminance() < 0.5f) "dark" else "light"
    val variables = listOf(
        "--md-sys-color-primary:" + colorHex(colors.primary),
        "--md-sys-color-on-primary:" + colorHex(colors.onPrimary),
        "--md-sys-color-primary-container:" + colorHex(colors.primaryContainer),
        "--md-sys-color-on-primary-container:" + colorHex(colors.onPrimaryContainer),
        "--md-sys-color-secondary:" + colorHex(colors.secondary),
        "--md-sys-color-on-secondary:" + colorHex(colors.onSecondary),
        "--md-sys-color-secondary-container:" + colorHex(colors.secondaryContainer),
        "--md-sys-color-tertiary:" + colorHex(colors.tertiary),
        "--md-sys-color-surface:" + colorHex(colors.surface),
        "--md-sys-color-surface-container-low:" + colorHex(colors.surfaceContainerLow),
        "--md-sys-color-surface-container:" + colorHex(colors.surfaceContainer),
        "--md-sys-color-surface-container-high:" + colorHex(colors.surfaceContainerHigh),
        "--md-sys-color-surface-container-highest:" + colorHex(colors.surfaceContainerHighest),
        "--md-sys-color-outline:" + colorHex(colors.outline),
        "--md-sys-color-outline-variant:" + colorHex(colors.outlineVariant),
        "--md-sys-color-on-surface:" + colorHex(colors.onSurface),
        "--md-sys-color-on-surface-variant:" + colorHex(colors.onSurfaceVariant)
    ).joinToString(";")
    val css = ":root{color-scheme:" + mode + ";" + variables + ";color:var(--md-sys-color-on-surface);background:var(--md-sys-color-surface)}" +
        "html,body{background:var(--md-sys-color-surface)!important;color:var(--md-sys-color-on-surface)!important}"
    val script = "(function(){var id='aion-native-theme';var old=document.getElementById(id);if(old)old.remove();var s=document.createElement('style');s.id=id;s.textContent='" + css + "';document.head.appendChild(s);document.documentElement.dataset.aionNativeTheme='" + theme.key + "';})();"
    view.evaluateJavascript(script, null)
}

private fun colorHex(color: Color): String = "#%06X".format(color.toArgb() and 0xFFFFFF)

private fun fetchLatestRelease(): ReleaseInfo? = try {
    val connection = URL(RELEASE_API).openConnection() as HttpURLConnection
    connection.connectTimeout = 10000
    connection.readTimeout = 10000
    connection.setRequestProperty("Accept", "application/vnd.github+json")
    connection.setRequestProperty("User-Agent", "AION2-BuildLab-Android")
    val json = connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
    connection.disconnect()
    val tag = json.optString("tag_name")
    val version = tag.removePrefix("android-v").removePrefix("v")
    val assets = json.optJSONArray("assets")
    var apk: String? = null
    if (assets != null) {
        for (i in 0 until assets.length()) {
            val asset = assets.getJSONObject(i)
            if (asset.optString("name").endsWith(".apk", true)) {
                apk = asset.optString("browser_download_url")
                break
            }
        }
    }
    ReleaseInfo(version, json.optString("html_url"), apk)
} catch (_: Exception) { null }

private fun compareVersions(a: String, b: String): Int {
    val left = a.split(".").map { it.toIntOrNull() ?: 0 }
    val right = b.split(".").map { it.toIntOrNull() ?: 0 }
    for (i in 0 until maxOf(left.size, right.size)) {
        val diff = left.getOrElse(i) { 0 }.compareTo(right.getOrElse(i) { 0 })
        if (diff != 0) return diff
    }
    return 0
}

private fun standardScheme(dark: Boolean) = if (dark) darkColorScheme(
    primary = Color(0xFFB8C4FF), secondary = Color(0xFFBEC6E8), tertiary = Color(0xFFE3B9D2)
) else lightColorScheme(
    primary = Color(0xFF4355A5), secondary = Color(0xFF59638B), tertiary = Color(0xFF79536D)
)

private fun monoScheme(dark: Boolean) = if (dark) darkColorScheme(
    primary = Color(0xFFE0E0E0), secondary = Color(0xFFBDBDBD), tertiary = Color(0xFF9E9E9E),
    background = Color(0xFF151515), surface = Color(0xFF1D1D1D), surfaceVariant = Color(0xFF333333)
) else lightColorScheme(
    primary = Color(0xFF424242), secondary = Color(0xFF616161), tertiary = Color(0xFF757575),
    background = Color(0xFFF5F5F5), surface = Color.White, surfaceVariant = Color(0xFFE0E0E0)
)

private fun blackScheme() = darkColorScheme(
    primary = Color(0xFFD0BCFF), secondary = Color(0xFFCCC2DC), tertiary = Color(0xFFEFB8C8),
    background = Color.Black, surface = Color.Black, surfaceVariant = Color(0xFF171717)
)

private fun whiteScheme() = lightColorScheme(
    primary = Color(0xFF303F9F), secondary = Color(0xFF455A64), tertiary = Color(0xFF6A1B9A),
    background = Color.White, surface = Color.White, surfaceVariant = Color(0xFFF5F5F5)
)
