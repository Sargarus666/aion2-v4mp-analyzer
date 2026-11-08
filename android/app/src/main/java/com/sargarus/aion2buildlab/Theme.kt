package com.sargarus.aion2buildlab
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

enum class AppTheme(val title: String) {
    MONET("Monet"), MONOCHROME("Monochrome"), STANDARD("Standard"),
    OLED("OLED"), OLED_BLACK("OLED Black"), OLED_WHITE("OLED White")
}
private val monoLight = lightColorScheme(primary=Color(0xFF424242), secondary=Color(0xFF616161), tertiary=Color(0xFF757575))
private val monoDark = darkColorScheme(primary=Color(0xFFD0D0D0), secondary=Color(0xFFBDBDBD), tertiary=Color(0xFF9E9E9E))
private val oledDark = darkColorScheme(background=Color.Black, surface=Color.Black, surfaceContainer=Color(0xFF080808))
private val whiteLight = lightColorScheme(background=Color.White, surface=Color.White, surfaceContainer=Color(0xFFF7F7F7))

@Composable
fun BuildLabTheme(theme: AppTheme, content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val context = LocalContext.current
    val colors = when (theme) {
        AppTheme.MONET -> if (Build.VERSION.SDK_INT >= 31) { if (dark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context) } else if (dark) darkColorScheme() else lightColorScheme()
        AppTheme.MONOCHROME -> if (dark) monoDark else monoLight
        AppTheme.STANDARD -> if (dark) darkColorScheme() else lightColorScheme()
        AppTheme.OLED, AppTheme.OLED_BLACK -> oledDark
        AppTheme.OLED_WHITE -> whiteLight
    }
    MaterialTheme(colorScheme=colors, content=content)
}
