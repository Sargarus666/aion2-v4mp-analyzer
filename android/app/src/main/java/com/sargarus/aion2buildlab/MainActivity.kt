package com.sargarus.aion2buildlab

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.IntentFilter
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.widget.Toast

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.clickable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext

private val ComponentActivity.dataStore by preferencesDataStore(name = "build_lab_settings")
private val THEME_KEY = stringPreferencesKey("theme")
private const val APP_URL = "https://aion2-v4mp-analyzer.pages.dev/"
private const val BUILD_SCREENSHOT_URL = "https://raw.githubusercontent.com/Sargarus666/aion2-v4mp-analyzer/main/IMG_20261104_190217_860.jpg"
private const val VERSION_NAME = "0.2.0"

private enum class AppTab(val label: String) {
    HOME("Главная"), BUILD("Билд"), DATABASE("База"), SETTINGS("Настройки")
}

private data class ResourceLink(val title: String, val subtitle: String, val url: String)

private val resourceLinks = listOf(
    ResourceLink("Официальный профиль NCSOFT", "Поиск персонажей · Европа", "https://aion2.plaync.com/en-us/characters/index?region=eu"),
    ResourceLink("Shugo.GG", "Профиль персонажа v4mp", "https://shugo.gg/character/global/eu-kromede/v4mp"),
    ResourceLink("NotMeter", "Статистика персонажа v4mp", "https://notmeter.com/?view=character&serverId=2316&characterId=6Q-UpcYBkUxRaoy_p3rjpM_kwjwWlBxUxx2BTNdYXHY%3D&name=v4mp&region=ww&globalRegion=eu"),
    ResourceLink("AION 2 Guides", "Гайды по классам и контенту", "https://aion2-guides.info/ru/ranger/"),
    ResourceLink("Mobalytics", "PvE-сборка Стрелка", "https://mobalytics.gg/gamebase/guides/aion-2-ranger-pve-build"),
    ResourceLink("AION2 Companion", "Билды и справочник Стрелка", "https://aion2companion.com/builds/ranger/"),
    ResourceLink("AION 2 META", "Гайды по Стрелку", "https://aion2-meta.com/guides/ranger/"),
    ResourceLink("DBAION2", "Русская база игровых названий", "https://dbaion2.ru/classes/ranger/"),
    ResourceLink("AION 2 Gaming Tools", "Игровые инструменты и база", "https://aion2.gaming.tools/ru/classes/ranger"),
    ResourceLink("AION2Quest", "База умений и заданий", "https://aion2quest.pro/ru/skills/ranger")
)

class MainActivity : ComponentActivity() {
    private var activeDownloadId: Long = -1L

    private val downloadReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
            if (completedId != activeDownloadId) return
            val manager = getSystemService(DOWNLOAD_SERVICE) as DownloadManager
            val cursor = manager.query(DownloadManager.Query().setFilterById(completedId))
            cursor?.use {
                if (it.moveToFirst()) {
                    val status = it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
                    if (status == DownloadManager.STATUS_SUCCESSFUL) {
                        val apkUri = manager.getUriForDownloadedFile(completedId)
                        if (apkUri != null) {
                            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                                setDataAndType(apkUri, "application/vnd.android.package-archive")
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            }
                            runCatching { startActivity(installIntent) }
                                .onFailure { Toast.makeText(this@MainActivity, "Не удалось открыть установщик APK", Toast.LENGTH_LONG).show() }
                        }
                    } else {
                        Toast.makeText(this@MainActivity, "Не удалось скачать обновление", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
    }

    private fun registerDownloadReceiver() {
        val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(downloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(downloadReceiver, filter)
        }
    }

    private fun startApkDownload(url: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !packageManager.canRequestPackageInstalls()) {
            Toast.makeText(this, "Разреши установку неизвестных приложений для AION 2 Build Lab и нажми обновление ещё раз", Toast.LENGTH_LONG).show()
            startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:$packageName")))
            return
        }
        val request = DownloadManager.Request(Uri.parse(url))
            .setTitle("AION 2 Build Lab")
            .setDescription("Скачивание обновления приложения")
            .setMimeType("application/vnd.android.package-archive")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(false)
            .setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, "aion2-build-lab-update.apk")
        activeDownloadId = (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
        Toast.makeText(this, "Обновление скачивается. После загрузки откроется установщик Android.", Toast.LENGTH_LONG).show()
    }

    override fun onDestroy() {
        runCatching { unregisterReceiver(downloadReceiver) }
        super.onDestroy()
    }

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        registerDownloadReceiver()
        setContent {
            var selectedTheme by remember { mutableStateOf(AppTheme.MONET) }
            var selectedTab by remember { mutableStateOf(AppTab.HOME) }
            var updateMessage by remember { mutableStateOf<String?>(null) }
            var releaseUrl by remember { mutableStateOf(UpdateChecker.RELEASES_PAGE) }
            var apkDownloadUrl by remember { mutableStateOf("") }
            var checking by remember { mutableStateOf(false) }
            val scope = rememberCoroutineScope()
            val context = LocalContext.current

            LaunchedEffect(Unit) {
                val stored = dataStore.data.first()[THEME_KEY]
                selectedTheme = AppTheme.entries.firstOrNull { it.name == stored } ?: AppTheme.MONET
            }

            BuildLabTheme(selectedTheme) {
                Scaffold(
                    bottomBar = {
                        NavigationBar(windowInsets = NavigationBarDefaults.windowInsets) {
                            AppTab.entries.forEach { tab ->
                                NavigationBarItem(
                                    selected = selectedTab == tab,
                                    onClick = { selectedTab = tab },
                                    icon = {
                                        if (tab == AppTab.BUILD) {
                                            AsyncImage(
                                                model = BUILD_SCREENSHOT_URL,
                                                contentDescription = "Миниатюра билда v4mp",
                                                modifier = Modifier.size(28.dp).clip(RoundedCornerShape(9.dp))
                                            )
                                        } else {
                                            Icon(
                                                imageVector = when (tab) {
                                                    AppTab.HOME -> Icons.Filled.Home
                                                    AppTab.DATABASE -> Icons.Filled.Storage
                                                    AppTab.SETTINGS -> Icons.Filled.Settings
                                                    AppTab.BUILD -> Icons.Filled.Person
                                                },
                                                contentDescription = null
                                            )
                                        }
                                    },
                                    label = { Text(tab.label, maxLines = 1) },
                                    alwaysShowLabel = true
                                )
                            }
                        }
                    }
                ) { padding ->
                    Box(Modifier.fillMaxSize().padding(padding)) {
                        when (selectedTab) {
                            AppTab.HOME -> HomeScreen()
                            AppTab.BUILD -> BuildScreen(onOpenBuild = { selectedTab = AppTab.HOME })
                            AppTab.DATABASE -> DatabaseScreen(onOpenLink = { url ->
                                runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
                            })
                            AppTab.SETTINGS -> SettingsScreen(
                                selectedTheme = selectedTheme,
                                onThemeSelected = { theme ->
                                    selectedTheme = theme
                                    scope.launch { dataStore.edit { it[THEME_KEY] = theme.name } }
                                },
                                checking = checking,
                                onCheckUpdates = {
                                    checking = true
                                    scope.launch {
                                        val info = withContext(Dispatchers.IO) {
                                            runCatching { UpdateChecker.fetchLatest() }.getOrNull()
                                        }
                                        checking = false
                                        if (info == null) {
                                            updateMessage = "Не удалось получить информацию о релизе. Проверь подключение и попробуй ещё раз."
                                        } else {
                                            releaseUrl = info.pageUrl
                                            apkDownloadUrl = info.apkUrl
                                            updateMessage = if (UpdateChecker.isNewer(info.tag, VERSION_NAME)) {
                                                if (info.apkUrl.isNotBlank()) {
                                                    "Доступна версия ${info.tag}. APK скачается прямо в приложении, затем Android предложит установить обновление."
                                                } else {
                                                    "Доступна версия ${info.tag}, но APK не найден. Открой страницу релиза."
                                                }
                                            } else {
                                                "Установлена актуальная версия ($VERSION_NAME)."
                                            }
                                        }
                                    }
                                }
                            )
                        }
                    }
                }

                if (updateMessage != null) {
                    AlertDialog(
                        onDismissRequest = { updateMessage = null },
                        title = { Text("Обновление приложения") },
                        text = { Text(updateMessage!!) },
                        confirmButton = {
                            TextButton(onClick = {
                                if (apkDownloadUrl.isNotBlank() && updateMessage?.contains("Доступна версия") == true) {
                                    startApkDownload(apkDownloadUrl)
                                } else {
                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(releaseUrl)))
                                }
                                updateMessage = null
                            }) {
                                Text(if (apkDownloadUrl.isNotBlank() && updateMessage?.contains("Доступна версия") == true) "Скачать и установить" else "Открыть релиз")
                            }
                        },
                        dismissButton = {
                            TextButton(onClick = { updateMessage = null }) { Text("Закрыть") }
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun HomeScreen() {
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            WebView(ctx).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.loadsImagesAutomatically = true
                settings.allowFileAccess = false
                settings.allowContentAccess = false
                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                        val uri = request.url
                        return if (uri.scheme == "https" && uri.host == "aion2-v4mp-analyzer.pages.dev") {
                            false
                        } else {
                            runCatching { ctx.startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                            true
                        }
                    }
                }
                loadUrl(APP_URL)
            }
        }
    )
}

@Composable
private fun BuildScreen(onOpenBuild: () -> Unit) {
    var showScreenshot by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Мой билд", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.SemiBold)
        Text("Ranger · v4mp · EU Kromede", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(28.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
        ) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Box {
                    AsyncImage(
                        model = BUILD_SCREENSHOT_URL,
                        contentDescription = "Открыть скриншот билда на весь экран",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxWidth().heightIn(min = 180.dp, max = 360.dp)
                            .clip(RoundedCornerShape(20.dp))
                            .clickable { showScreenshot = true }
                    )
                    Surface(
                        modifier = Modifier.align(Alignment.BottomEnd).padding(10.dp),
                        shape = RoundedCornerShape(50),
                        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f)
                    ) {
                        Row(Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.ZoomIn, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(5.dp))
                            Text("Увеличить", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
                Text("Твой персонаж", style = MaterialTheme.typography.titleLarge)
                Text("Нажми на скриншот, чтобы открыть его поверх приложения и рассмотреть детали. Новые скриншоты не создаются.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Button(onClick = onOpenBuild, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Filled.OpenInNew, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Открыть мой билд")
                }
            }
        }
    }

    if (showScreenshot) {
        Dialog(
            onDismissRequest = { showScreenshot = false },
            properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)
        ) {
            Surface(modifier = Modifier.fillMaxSize(), color = Color.Black) {
                Box(Modifier.fillMaxSize()) {
                    AsyncImage(
                        model = BUILD_SCREENSHOT_URL,
                        contentDescription = "Увеличенный скриншот билда v4mp",
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.fillMaxSize().clickable { showScreenshot = false }
                    )
                    IconButton(
                        onClick = { showScreenshot = false },
                        modifier = Modifier.align(Alignment.TopEnd).padding(12.dp)
                    ) {
                        Icon(Icons.Filled.Close, contentDescription = "Закрыть просмотр", tint = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
private fun DatabaseScreen(onOpenLink: (String) -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("База данных", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.SemiBold)
        Text("Полезные сайты, профили и гайды по AION 2.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        resourceLinks.forEach { item ->
            Card(
                modifier = Modifier.fillMaxWidth().clickable { onOpenLink(item.url) },
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Text(item.title, style = MaterialTheme.typography.titleMedium)
                        Text(item.subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(Icons.Filled.OpenInNew, contentDescription = "Открыть ссылку", tint = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}

@Composable
private fun SettingsScreen(
    selectedTheme: AppTheme,
    onThemeSelected: (AppTheme) -> Unit,
    checking: Boolean,
    onCheckUpdates: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Настройки", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.SemiBold)
        Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer) ) {
            Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Оформление", style = MaterialTheme.typography.titleLarge)
                Text("Выбери цветовую тему приложения", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                AppTheme.entries.forEach { theme ->
                    Row(
                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).clickable { onThemeSelected(theme) }.padding(vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = selectedTheme == theme, onClick = { onThemeSelected(theme) })
                        Spacer(Modifier.width(8.dp))
                        Text(theme.title, style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }
        }
        Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer) ) {
            Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Обновление приложения", style = MaterialTheme.typography.titleLarge)
                Text("Проверить новую версию в GitHub Releases.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Button(onClick = onCheckUpdates, enabled = !checking, modifier = Modifier.fillMaxWidth()) {
                    if (checking) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                    else Icon(Icons.Filled.SystemUpdate, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text(if (checking) "Проверяем…" else "Проверить обновления")
                }
            }
        }
    }
}
