package com.sargarus.aion2buildlab
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val ComponentActivity.dataStore by preferencesDataStore(name="build_lab_settings")
private val THEME_KEY = stringPreferencesKey("theme")
private const val APP_URL = "https://aion2-v4mp-analyzer.pages.dev/"
private const val VERSION_NAME = "0.1.0"

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            var selectedTheme by remember { mutableStateOf(AppTheme.MONET) }
            var settingsOpen by remember { mutableStateOf(false) }
            var updateMessage by remember { mutableStateOf<String?>(null) }
            var releaseUrl by remember { mutableStateOf(UpdateChecker.RELEASES_PAGE) }
            var checking by remember { mutableStateOf(false) }
            val scope = rememberCoroutineScope()
            val context = LocalContext.current
            LaunchedEffect(Unit) {
                val stored = dataStore.data.first()[THEME_KEY]
                selectedTheme = AppTheme.entries.firstOrNull { it.name == stored } ?: AppTheme.MONET
            }
            BuildLabTheme(selectedTheme) {
                Scaffold(topBar = {
                    TopAppBar(title={ Text("AION 2 Build Lab") }, actions={
                        IconButton(onClick={ settingsOpen=true }) { Icon(Icons.Default.Settings, contentDescription="Настройки") }
                    })
                }) { padding ->
                    Column(Modifier.fillMaxSize().padding(padding)) {
                        AndroidView(modifier=Modifier.weight(1f).fillMaxWidth(), factory={ ctx ->
                            WebView(ctx).apply {
                                settings.javaScriptEnabled=true
                                settings.domStorageEnabled=true
                                settings.loadsImagesAutomatically=true
                                settings.allowFileAccess=false
                                settings.allowContentAccess=false
                                webViewClient=object: WebViewClient() {
                                    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                                        val uri=request.url
                                        return if (uri.scheme=="https" && uri.host=="aion2-v4mp-analyzer.pages.dev") false
                                        else { runCatching { ctx.startActivity(Intent(Intent.ACTION_VIEW, uri)) }; true }
                                    }
                                }
                                loadUrl(APP_URL)
                            }
                        })
                        Row(Modifier.fillMaxWidth().padding(horizontal=16.dp, vertical=8.dp), verticalAlignment=Alignment.CenterVertically, horizontalArrangement=Arrangement.SpaceBetween) {
                            Text("Ranger · v4mp", style=MaterialTheme.typography.labelMedium)
                            TextButton(onClick={
                                checking=true
                                scope.launch {
                                    val info=withContext(Dispatchers.IO) { runCatching { UpdateChecker.fetchLatest() }.getOrNull() }
                                    checking=false
                                    if (info==null) updateMessage="Пока нет опубликованного релиза APK. Проверить GitHub Releases?"
                                    else {
                                        releaseUrl=info.pageUrl
                                        updateMessage=if (UpdateChecker.isNewer(info.tag, VERSION_NAME)) "Доступна версия ${info.tag}. Открой страницу релиза для загрузки." else "Установлена актуальная версия ($VERSION_NAME)."
                                    }
                                }
                            }, enabled=!checking) {
                                Icon(Icons.Default.Refresh, contentDescription=null); Spacer(Modifier.width(6.dp))
                                Text(if (checking) "Проверка…" else "Обновления")
                            }
                        }
                    }
                }
                if (settingsOpen) AlertDialog(
                    onDismissRequest={ settingsOpen=false }, title={ Text("Оформление") },
                    text={
                        Column(Modifier.verticalScroll(rememberScrollState())) {
                            Text("Выбери тему приложения", style=MaterialTheme.typography.bodyMedium)
                            Spacer(Modifier.height(8.dp))
                            AppTheme.entries.forEach { theme ->
                                Row(Modifier.fillMaxWidth(), verticalAlignment=Alignment.CenterVertically) {
                                    RadioButton(selected=selectedTheme==theme, onClick={
                                        selectedTheme=theme
                                        scope.launch { dataStore.edit { it[THEME_KEY]=theme.name } }
                                    })
                                    Text(theme.title)
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                            Text("Monet использует динамические цвета Android 12+. Темы меняют оболочку приложения.", style=MaterialTheme.typography.bodySmall)
                        }
                    },
                    confirmButton={ TextButton(onClick={ settingsOpen=false }) { Text("Готово") } }
                )
                if (updateMessage!=null) AlertDialog(
                    onDismissRequest={ updateMessage=null }, title={ Text("Обновления") }, text={ Text(updateMessage!!) },
                    confirmButton={ TextButton(onClick={
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(releaseUrl))); updateMessage=null
                    }) { Text("GitHub Releases") } },
                    dismissButton={ TextButton(onClick={ updateMessage=null }) { Text("Закрыть") } }
                )
            }
        }
    }
}
